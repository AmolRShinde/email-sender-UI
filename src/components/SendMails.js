import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

import { 
  AppBar, Toolbar, Typography, Container, Paper, Button, IconButton,
  Box, LinearProgress, Switch, FormControlLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import ExcelPreview from "./ExcelPreview";
import BASE_URL from "../config";

export default function SendMails() {
  // UI state
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState([]); // row objects: { row, email, status }
  const [dark, setDark] = useState(false);
  const [message, setMessage] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const hasFailedRows = rows.some(r => r.status === "FAILED");
  const [paused, setPaused] = useState(false);
  const [jobCompleted, setJobCompleted] = useState(false);

  // refs
  const esRef = useRef(null);
  const logContainerRef = useRef(null);

  // MUI theme
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: dark ? "dark" : "light",
        },
      }),
    [dark]
  );

  useEffect(() => {
    return () => {
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
    };
  }, []);


  // Auto-scroll to top (newest on top), keep view at top when new row arrives
  useEffect(() => {
    if (!logContainerRef.current) return;
    // scroll to top to show newest rows (we render newest first)
    logContainerRef.current.scrollTop = 0;
  }, [rows]);

  // handle file select
  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const retryAll = async () => {
    if (!jobId) return;

    await axios.post(
      `${BASE_URL}/api/email/retry-all/${jobId}`
    );
  };


  // start job: upload file, open SSE stream
  const handleUpload = async () => {
    if (sending) return;
    if (!file) {
      setMessage("Please select an Excel file (.xlsx).");
      return;
    }

    setSending(true);
    setProgress(0);
    setRows([]);
    setMessage("Uploading file and starting job...");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await axios.post(`${BASE_URL}/api/email/send-async`, fd);
      const id = res.data.jobId;
      setJobId(id);
      setMessage(`Job started (${id}). Connecting for live updates...`);

      // ensure any previous EventSource closed
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }

      // open SSE connection
      const es = new EventSource(`${BASE_URL}/api/email/stream/${id}`);
      esRef.current = es;

      es.addEventListener("progress", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (typeof payload.progress === "number") setProgress(payload.progress);
        } catch {
          // fallback if server sends raw number
          const p = Number(e.data);
          if (!Number.isNaN(p)) setProgress(p);
        }
      });

      es.addEventListener("row", (e) => {
        try {
          const obj = JSON.parse(e.data);
          // keep newest-first — add to front, but also ensure dedupe/update by row number
          setRows(prev => {
            const copy = [...prev];
            const idx = copy.findIndex(r => r.row === obj.row);
            if (idx >= 0) {
              copy[idx] = obj;
              // move updated item to front (current processing should appear on top)
              const [item] = copy.splice(idx, 1);
              return [item, ...copy];
            }
            // prepend
            return [obj, ...copy];
          });
        } catch (err) {
          console.error("Failed parse row event", err);
        }
      });

      es.addEventListener("complete", (e) => {
        setProgress(100);
        setSending(false);
        setMessage("Job completed.");
        setJobCompleted(true);
        try { es.close(); } catch {}
        esRef.current = null;
      });

      es.addEventListener("error", (e) => {
        console.error("SSE error", e);
        setMessage("Connection error — streaming stopped.");
        setSending(false);
        try { es.close(); } catch {}
        esRef.current = null;
      });

      es.addEventListener("message", (e) => {
        setMessage(e.data);
      });

      es.addEventListener("control", (e) => {
        if (e.data === "PAUSED") {
          setPaused(true);
        }
        if (e.data === "RESUMED") {
          setPaused(false);
        }
      });

      // success: keep sending = true until 'complete' event
      setSending(true);
      setMessage("Connected — receiving live updates.");
    } catch (err) {
      console.error("Upload failed", err);
      setMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Upload failed (server error)"
      );
    }
  };

  const pauseJob = async () => {
    await axios.post(`${BASE_URL}/api/email/pause/${jobId}`);
  };

  const resumeJob = async () => {
    await axios.post(`${BASE_URL}/api/email/resume/${jobId}`);
  };

  // download CSV report
  const downloadCsv = async () => {
    if (!jobId) {
      setMessage("No active job to download report for.");
      return;
    }
    try {
      const res = await axios.get(`${BASE_URL}/api/email/report/${jobId}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `report-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download CSV failed", err);
      setMessage("Failed to download report.");
    }
  };

  // stop current job stream (optional user control)
  const stopStream = () => {
    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }
    setSending(false);
    setMessage("Streaming stopped by user.");
  };

  const retryRow = async (row) => {
    if (!jobId) return;

    await axios.post(
      `${BASE_URL}/api/email/retry/${jobId}/${row}`
    );
  };

  const previewExcel = async () => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post(
      `${BASE_URL}/api/email/preview`,
      fd
    );
    setPreviewRows(res.data);
  };

  const downloadExcel = (jobId) => {
    if (!jobId) return;

    const url = `${BASE_URL}/api/email/download/${jobId}`;

    // force browser download
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-report-${jobId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
        <AppBar position="static">
          <Toolbar>
            <UploadFileIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Async Bulk Email Sender — Live
            </Typography>

            <Tooltip title={dark ? "Switch to light" : "Switch to dark"}>
              <FormControlLabel
                control={<Switch checked={dark} onChange={() => setDark(d => !d)} color="default" />}
                label={dark ? <DarkModeIcon /> : <LightModeIcon />}
                labelPlacement="start"
                sx={{ mr: 2 }}
              />
            </Tooltip>

            <Button color="inherit" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!jobId}>
              Download CSV
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => downloadExcel(jobId)}
              disabled={!jobCompleted}
              color="inherit"
            >
              Download Updated Excel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={retryAll}
              disabled={!hasFailedRows || sending}
            >
              Retry All Failed
            </Button>

          </Toolbar>
        </AppBar>

        <Container sx={{ py: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Upload Excel & start job
            </Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <input
                id="file-input"
                type="file"
                accept=".xlsx"
                onChange={onFileChange}
                disabled={sending}
                style={{ display: "inline-block" }}
              />

              <Button variant="contained" onClick={handleUpload} disabled={sending || !file}>
                {sending ? "Processing..." : "Upload & Start"}
                
              </Button>

              <Button variant="outlined" onClick={stopStream} disabled={!esRef.current}>
                Stop Stream
              </Button>
              
              <Button
                variant="contained"
                color="warning"
                onClick={pauseJob}
                disabled={!sending || paused}
              >
                Pause
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={resumeJob}
              disabled={!sending || !paused}
            >
              Resume
            </Button>

              <Button
                variant="outlined"
                disabled={!file}
                onClick={previewExcel}
              >
                Preview Excel
            </Button>


              <Box sx={{ display: "flex", gap: 2 }}/>

              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
            <Typography variant="subtitle1">Progress</Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 12, borderRadius: 2 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>{progress}%</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="subtitle1" gutterBottom>
              Live Row-wise Log (latest at top)
            </Typography>

            <Box
              ref={logContainerRef}
              sx={{
                maxHeight: 360,
                overflowY: "auto",
                bgcolor: "background.paper",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                mb: 1,
                p: 1
              }}
            >
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No rows yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      // rows are stored newest-first already; ensure stable key
                      
                      rows.map(r => (
                        <TableRow key={`row-${r.row}`}>
                          <TableCell sx={{ width: 80 }}>{r.row}</TableCell>
                          <TableCell sx={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>{r.email}</TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 600,
                              color:
                                r.status.includes("FAILED") ? "error.main" :
                                r.status.includes("SENT") ? "success.main" :
                                "text.primary"
                            }}
                          >
                            {r.status}
                          </TableCell>
                          <TableCell>
                            {r.status === "FAILED" && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => retryRow(r.row)}
                                disabled={sending}
                              >
                                Retry
                              </Button>
                            )}
                          </TableCell>

                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1 }}>
              <Button size="small" onClick={() => setRows([])} disabled={sending || rows.length===0}>
                Clear Log
              </Button>
              <Button size="small" variant="outlined" onClick={() => {
                // reverse view (show oldest first)
                setRows(prev => [...prev].reverse());
              }}>
                Toggle Order
              </Button>
            </Box>
          </Paper>
          {previewRows.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 3 }}>
                Excel Preview
              </Typography>

              <ExcelPreview rows={previewRows} />
            </>
          )}

        </Container>
      </Box>
    </ThemeProvider>
  );
};

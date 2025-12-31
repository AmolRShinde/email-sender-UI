import React from "react";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography
} from "@mui/material";

/**
 * rows = array of objects:
 * { row: number, email: string, name?: string }
 */
export default function ExcelPreview({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No preview data
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} elevation={2}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Row</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.row}>
              <TableCell>{r.row}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.name || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

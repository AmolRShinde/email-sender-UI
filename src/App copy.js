import React, { useState } from "react";
import axios from "axios";
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [log, setLog] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLog("Uploading and sending emails...");

    try {
      const response = await axios.post(
        `${BASE_URL}/api/email/send`,
        formData
      );
      setLog(response.data);
    } catch (error) {
      setLog(error.response?.data || error.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 className="App-header">Bulk Email Sender</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: "10px" }}>
        Send Emails
      </button>
      <pre>{log}</pre>
    </div>
  );
}

export default App;

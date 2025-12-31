import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function CreateExcel() {
  const [rows, setRows] = useState([{ email: "", name: "", attachment: "" }]);

  const addRow = () => {
    setRows([...rows, { email: "", name: "", attachment: "" }]);
  };

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = value;
    setRows(copy);
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Emails");
    XLSX.writeFile(wb, "email-data.xlsx");
  };

  return (
    <>
      <h3>Create Excel Sheet</h3>

      {rows.map((r, i) => (
        <div key={i} className="row">
          <input placeholder="Email" onChange={(e) => updateRow(i, "email", e.target.value)} />
          <input placeholder="Name" onChange={(e) => updateRow(i, "name", e.target.value)} />
          <input placeholder="Attachment URL" onChange={(e) => updateRow(i, "attachment", e.target.value)} />
        </div>
      ))}

      <button onClick={addRow}>➕ Add Row</button>
      <button onClick={downloadExcel}>⬇ Download Excel</button>
    </>
  );
}

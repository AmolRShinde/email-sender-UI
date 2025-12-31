import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import SendMails from "./components/SendMails";
import CreateExcel from "./components/CreateExcel";
import "./App.css";

function App() {
  const [menu, setMenu] = useState("SEND");

  return (
    <div className="app-container">
      <Sidebar menu={menu} setMenu={setMenu} />

      <div className="content">
        {menu === "SEND" && <SendMails />}
        {menu === "EXCEL" && <CreateExcel />}
      </div>
    </div>
  );
}

export default App;

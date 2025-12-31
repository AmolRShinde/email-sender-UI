import useDarkMode from "../hooks/useDarkMode";

export default function Sidebar({ menu, setMenu }) {
  const [dark, setDark] = useDarkMode();

  return (
    <div className="h-full bg-gray-900 dark:bg-black text-white p-4">
      <h2 className="text-xl mb-6">Bulk Mailer</h2>

      <button onClick={() => setMenu("SEND")} className="menu-btn">
        📧 Send Mails
      </button>

      <button onClick={() => setMenu("EXCEL")} className="menu-btn">
        📄 Create Excel
      </button>

      <div className="mt-6">
        <button
          onClick={() => setDark(!dark)}
          className="bg-gray-700 px-3 py-1 rounded"
        >
          {dark ? "🌙 Dark" : "☀ Light"}
        </button>
      </div>
    </div>
  );
}

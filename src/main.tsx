import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

// One-shot cleanup: the app used to cache chat/settings state in localStorage
// via zustand's persist middleware. That was removed once SQLite became the
// source of truth; nuke the old keys so stale IDs don't outlive the DB.
try {
  localStorage.removeItem("agora-chat-store");
  localStorage.removeItem("agora-settings-store");
} catch {
  // Private-mode or disabled storage — nothing to clean up.
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

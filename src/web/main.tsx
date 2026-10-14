import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";
import { ConfirmProvider } from "./components/ui/dialog.js";
import { ToastProvider } from "./components/ui/toast.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
);

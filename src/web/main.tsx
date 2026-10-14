import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Me } from "../shared/api-types.js";
import { useApi } from "./api.js";
import { Link, ToastProvider } from "./components/ui.js";
import { usePath } from "./router.js";
import { Dashboard } from "./screens/Dashboard.js";
import { PageScreen } from "./screens/PageScreen.js";
import { TokensScreen } from "./screens/TokensScreen.js";
import "./styles.css";

function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <img src="/~/short.svg" alt="" className="h-16 w-16" />
      <h1>short</h1>
      <a className="btn" href="/~/auth/login">
        Sign in
      </a>
      <a href="/" className="text-sm hover:underline">
        back to root
      </a>
    </div>
  );
}

function App() {
  const me = useApi<Me>("/me");
  const path = usePath();

  if (me.error?.status === 401) return <Login />;
  if (me.error) return <p className="p-10">Could not reach the server: {me.error.message}</p>;
  if (!me.data) return null;

  const logout = async () => {
    await fetch("/~/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = "/~/";
  };

  const pageMatch = path.match(/^\/~\/pages\/(\d+)$/);
  const screen = pageMatch ? (
    <PageScreen id={Number(pageMatch[1])} me={me.data} />
  ) : path === "/~/tokens" ? (
    <TokensScreen />
  ) : (
    <Dashboard me={me.data} />
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link to="/~/" className="flex items-center gap-3">
          <img src="/~/short.svg" alt="" className="h-8 w-8" />
          <h1>short</h1>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/~/tokens" className="hover:underline">
            API tokens
          </Link>
          <span className="text-gray-500">
            {me.data.username}
            {me.data.isAdmin && " (admin)"}
          </span>
          <button className="btn btn-secondary py-1" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>
      {screen}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);

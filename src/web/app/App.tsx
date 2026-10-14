import { ArrowLeft, LogIn } from "lucide-react";
import type { Me } from "../../shared/api-types.js";
import { useApi } from "../api.js";
import { buttonClass } from "../components/ui/button.js";
import { Link } from "../components/ui/misc.js";
import { EmptyState } from "../components/ui/surface.js";
import { parseRoute, usePath } from "../router.js";
import { AdminScreen } from "../screens/AdminScreen.js";
import { DetailScreen } from "../screens/detail/DetailScreen.js";
import { ListScreen } from "../screens/ListScreen.js";
import { OverviewScreen } from "../screens/OverviewScreen.js";
import { TokensScreen } from "../screens/TokensScreen.js";
import { Shell } from "./Shell.js";

function Login() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm animate-pop-in rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <img src="/~/short.svg" alt="" className="mx-auto mb-5 size-12 rounded-xl" />
        <h1 className="text-xl font-semibold tracking-tight">Sign in to short</h1>
        <p className="mt-1.5 text-sm text-muted">Manage your short links, link pages and stats.</p>
        <a href="/~/auth/login" className={buttonClass("primary", "md", "mt-6 w-full")}>
          <LogIn />
          Continue with single sign-on
        </a>
        <a href="/" className="mt-4 inline-block text-sm text-muted hover:text-fg">
          Back to homepage
        </a>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <img src="/~/short.svg" alt="" className="size-10 animate-pulse rounded-lg" />
    </div>
  );
}

export function App() {
  const me = useApi<Me>("/me");
  const path = usePath();

  if (me.error?.status === 401) return <Login />;
  if (me.error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Can't reach the server</h1>
          <p className="mt-1 text-sm text-muted">{me.error.message}</p>
        </div>
      </div>
    );
  }
  if (!me.data) return <Splash />;

  const logout = async () => {
    await fetch("/~/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = "/~/";
  };

  const route = parseRoute(path);
  let screen;
  switch (route.name) {
    case "overview":
      screen = <OverviewScreen me={me.data} />;
      break;
    case "list":
      screen = <ListScreen key={route.kind} kind={route.kind} me={me.data} />;
      break;
    case "detail":
      screen = <DetailScreen key={route.id} id={route.id} kind={route.kind} tab={route.tab} me={me.data} />;
      break;
    case "tokens":
      screen = <TokensScreen />;
      break;
    case "admin":
      screen = me.data.isAdmin ? <AdminScreen /> : null;
      break;
  }

  return (
    <Shell me={me.data} route={route} onLogout={logout}>
      {screen ?? (
        <EmptyState
          icon={<ArrowLeft />}
          title="Page not found"
          description="This part of the dashboard doesn't exist."
          action={
            <Link to="/~/" className={buttonClass("secondary")}>
              Go to overview
            </Link>
          }
        />
      )}
    </Shell>
  );
}

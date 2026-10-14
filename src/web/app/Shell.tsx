import type { ReactNode } from "react";
import { KeyRound, LayoutDashboard, Link2, LogOut, PanelsTopLeft, ShieldCheck } from "lucide-react";
import type { Me } from "../../shared/api-types.js";
import { Button } from "../components/ui/button.js";
import { Link } from "../components/ui/misc.js";
import { cx } from "../lib/cx.js";
import type { Route } from "../router.js";

type Section = "overview" | "links" | "pages" | "tokens" | "admin";

function sectionOf(route: Route): Section | null {
  switch (route.name) {
    case "overview":
    case "tokens":
    case "admin":
      return route.name;
    case "list":
    case "detail":
      return route.kind === "redirect" ? "links" : "pages";
    default:
      return null;
  }
}

const NAV: { id: Section; label: string; short: string; to: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview", short: "Overview", to: "/~/", icon: <LayoutDashboard /> },
  { id: "links", label: "Short links", short: "Links", to: "/~/links", icon: <Link2 /> },
  { id: "pages", label: "Link pages", short: "Pages", to: "/~/pages", icon: <PanelsTopLeft /> },
  { id: "tokens", label: "API tokens", short: "Tokens", to: "/~/tokens", icon: <KeyRound /> },
  { id: "admin", label: "Administration", short: "Admin", to: "/~/admin", icon: <ShieldCheck />, adminOnly: true },
];

function Logo() {
  return (
    <Link to="/~/" className="flex items-center gap-2.5">
      <img src="/~/short.svg" alt="" className="size-7 rounded-md" />
      <span className="text-[15px] font-semibold tracking-tight text-fg">short</span>
    </Link>
  );
}

function UserAvatar({ username }: { username: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-fg uppercase">
      {username.charAt(0)}
    </span>
  );
}

export function Shell({ me, route, onLogout, children }: { me: Me; route: Route; onLogout: () => void; children: ReactNode }) {
  const active = sectionOf(route);
  const items = NAV.filter((n) => !n.adminOnly || me.isAdmin);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              aria-current={item.id === active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                item.id === active ? "bg-accent-soft text-accent-soft-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-border p-4">
          <UserAvatar username={me.username} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fg">{me.username}</div>
            <div className="text-xs text-muted">{me.isAdmin ? "Administrator" : "User"}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Sign out" title="Sign out">
            <LogOut />
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <UserAvatar username={me.username} />
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Sign out">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            aria-current={item.id === active ? "page" : undefined}
            className={cx(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium [&_svg]:size-5",
              item.id === active ? "text-accent" : "text-muted",
            )}
          >
            {item.icon}
            {item.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}

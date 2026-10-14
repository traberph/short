import type { Child } from "hono/jsx";
import { raw } from "hono/html";
import type { Block } from "../../shared/api-types.js";
import type { Theme } from "../../shared/validation.js";
import { renderMarkdown } from "./markdown.js";

const STYLES = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg)}
main{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;max-width:28rem;margin:0 auto}
.avatar{width:96px;height:96px;border-radius:9999px;object-fit:cover;animation:zoom .6s ease both}
h1{font-size:2rem;margin:1.5rem 0 2rem;text-align:center;animation:zoom .6s ease both}
.blocks{width:100%;display:flex;flex-direction:column;gap:.75rem}
.blocks>*{animation:slide .5s ease both}
.button{display:flex;align-items:center;gap:.75rem;padding:.6rem .75rem;border-radius:.5rem;background:var(--btn);color:var(--btn-fg);text-decoration:none;font-weight:600;transition:filter .15s}
.button:hover{filter:brightness(1.15)}
.button .label{flex:1;text-align:center;margin-right:2rem}
.icon{width:2rem;height:2rem;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.85);color:#374151;font-weight:700}
.text{line-height:1.5;text-align:center}
.text a{color:inherit}
footer{margin-top:3rem;font-size:.85rem;opacity:.5;text-align:center}
footer a{color:inherit}
.center{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1rem}
@keyframes zoom{from{transform:scale(.7);opacity:0}to{transform:none;opacity:1}}
@keyframes slide{from{transform:translateY(-20px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

const DARK: Theme = { background: "#111827", text: "#e5e7eb", button: "#475569", buttonText: "#ffffff" };

function Layout({ title, theme = DARK, children }: { title: string; theme?: Theme; children: Child }) {
  // Theme values are validated hex colors, so they are safe to put into CSS.
  const vars = `:root{--bg:${theme.background};--fg:${theme.text};--btn:${theme.button};--btn-fg:${theme.buttonText}}`;
  return (
    <>
      {raw("<!doctype html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <link rel="icon" href="/~/short.svg" type="image/svg+xml" />
          <style>{raw(vars + STYLES)}</style>
        </head>
        <body>{children}</body>
      </html>
    </>
  );
}

function LinkIcon({ dest, logoDevToken }: { dest: string | null; logoDevToken: string | undefined }) {
  let hostname = "";
  try {
    hostname = dest ? new URL(dest).hostname : "";
  } catch {
    // Fall through to the letter placeholder.
  }
  if (hostname && logoDevToken) {
    const src = `https://img.logo.dev/${encodeURIComponent(hostname)}?token=${encodeURIComponent(logoDevToken)}`;
    return <img class="icon" src={src} alt="" loading="lazy" />;
  }
  const letter = hostname.replace(/^www\./, "").charAt(0).toUpperCase() || "•";
  return <span class="icon">{letter}</span>;
}

export interface LinkPageProps {
  title: string;
  avatarUrl: string | null;
  theme: Theme;
  blocks: Block[];
  logoDevToken: string | undefined;
  showAttribution: boolean;
}

export function LinkPage(props: LinkPageProps) {
  return (
    <Layout title={props.title} theme={props.theme}>
      <main>
        {props.avatarUrl && <img class="avatar" src={props.avatarUrl} alt="" />}
        <h1>{props.title}</h1>
        <div class="blocks">
          {props.blocks.map((block, index) => {
            const style = `animation-delay:${0.3 + index * 0.08}s`;
            if (block.kind === "text") {
              return <div class="text" style={style}>{raw(renderMarkdown(block.markdown ?? ""))}</div>;
            }
            if (!block.target) return null;
            return (
              <a class="button" href={block.target.path} style={style}>
                <LinkIcon dest={block.target.dest} logoDevToken={props.logoDevToken} />
                <span class="label">{block.label}</span>
              </a>
            );
          })}
        </div>
        <footer>
          {props.showAttribution && (
            <p>
              powered by <a href="https://github.com/traberph/short">traberph/short</a>
            </p>
          )}
          {props.logoDevToken && (
            <p>
              Logos provided by <a href="https://logo.dev">Logo.dev</a>
            </p>
          )}
        </footer>
      </main>
    </Layout>
  );
}

export function MessagePage({ title, message, link }: { title: string; message: string; link?: { href: string; label: string } }) {
  return (
    <Layout title={title}>
      <div class="center">
        <h1>{title}</h1>
        <p>{message}</p>
        {link && (
          <p>
            <a href={link.href} style="color:inherit">
              {link.label}
            </a>
          </p>
        )}
      </div>
    </Layout>
  );
}

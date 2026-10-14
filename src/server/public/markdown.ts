import MarkdownIt from "markdown-it";

// Raw HTML and images are disabled; markdown-it also rejects javascript: and similar link targets.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).disable(["image", "table"]);

const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet("rel", "noopener nofollow");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}

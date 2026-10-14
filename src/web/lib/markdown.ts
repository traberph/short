// Rough plain-text version of Markdown for compact previews in the editor.
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

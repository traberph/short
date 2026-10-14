import type { ReactNode } from "react";

// A phone-shaped frame for previewing link pages.
export function PhoneFrame({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <div className="sticky top-6 mx-auto w-full max-w-[300px]">
      <div className="overflow-hidden rounded-[2.25rem] border-[7px] border-zinc-800 bg-zinc-800 shadow-2xl ring-1 ring-border dark:border-zinc-700">
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[1.75rem] bg-black">{children}</div>
      </div>
      {caption && <p className="mt-3 text-center text-xs text-muted">{caption}</p>}
    </div>
  );
}

// Shows the real, server-rendered page. `version` forces a reload after edits.
export function LivePreview({ path, version }: { path: string; version: number }) {
  return (
    <PhoneFrame caption="Live preview">
      <iframe key={version} src={`${path}?preview`} title="Preview" className="absolute inset-0 h-full w-full border-0" />
    </PhoneFrame>
  );
}

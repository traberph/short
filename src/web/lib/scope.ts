import type { Me, PageSummary } from "../../shared/api-types.js";
import type { NamespaceOption } from "../components/PageTable.js";

// "Your" content: your own namespace, plus root for admins. Other users' content is managed under Administration.
export function isMine(page: Pick<PageSummary, "namespace">, me: Me): boolean {
  return page.namespace === me.username || (me.isAdmin && page.namespace === "");
}

// Namespace filter for admins, who see both their own and root content.
export function myNamespaceOptions(me: Me): NamespaceOption[] | undefined {
  if (!me.isAdmin) return undefined;
  return [
    { label: "All", match: () => true },
    { label: `/${me.username}/`, match: (ns) => ns === me.username },
    { label: "Root /", match: (ns) => ns === "" },
  ];
}

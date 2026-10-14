// All authorization rules in one place. Ownership follows the namespace:
// a user owns everything under /<username>/, root ("") belongs to admins.

export interface Actor {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface Namespaced {
  namespace: string;
}

export function canWriteNamespace(actor: Actor, namespace: string): boolean {
  return actor.isAdmin || namespace === actor.username;
}

export function canManagePage(actor: Actor, page: Namespaced): boolean {
  return canWriteNamespace(actor, page.namespace);
}

// A link page may only contain buttons for links in its own namespace, unless an admin builds it.
export function canLinkTo(actor: Actor, page: Namespaced, target: Namespaced & { kind: string }): boolean {
  if (target.kind !== "redirect") return false;
  return actor.isAdmin || target.namespace === page.namespace;
}

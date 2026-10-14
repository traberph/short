import { describe, expect, it } from "vitest";
import { BASE_URL, flush, setup } from "./helpers.js";

describe("authentication", () => {
  it("rejects API requests without credentials", async () => {
    const { app } = setup();
    expect((await app.request("/~/api/me")).status).toBe(401);
    expect((await app.request("/~/api/pages", { method: "POST" })).status).toBe(401);
  });

  it("rejects unknown bearer tokens", async () => {
    const { app } = setup();
    const res = await app.request("/~/api/me", { headers: { authorization: "Bearer short_nope" } });
    expect(res.status).toBe(401);
  });

  it("accepts session cookies but blocks cross-site writes", async () => {
    const { app, user } = setup();
    const { session } = user("alice");
    const cookie = `short_session=${session}`;

    expect((await app.request("/~/api/me", { headers: { cookie } })).status).toBe(200);

    const body = JSON.stringify({ kind: "redirect", dest: "https://example.com" });
    const headers = { cookie, "content-type": "application/json" };
    const crossSite = await app.request("/~/api/pages", {
      method: "POST",
      body,
      headers: { ...headers, origin: "https://evil.test" },
    });
    expect(crossSite.status).toBe(403);

    const sameSite = await app.request("/~/api/pages", { method: "POST", body, headers: { ...headers, origin: BASE_URL } });
    expect(sameSite.status).toBe(201);
  });

  it("logs in via OIDC, keeps the username and follows the admin group", async () => {
    const { app, setNextLogin } = setup();

    const login = await app.request("/~/auth/login");
    expect(login.status).toBe(302);
    const loginCookie = login.headers.get("set-cookie")!.split(";")[0]!;

    setNextLogin({ sub: "s1", username: "alice", groups: ["short-admins"] });
    const callback = await app.request("/~/auth/callback?code=c&state=s", { headers: { cookie: loginCookie } });
    expect(callback.status).toBe(302);
    const session = callback.headers.getSetCookie().find((c) => c.startsWith("short_session="))!.split(";")[0]!;
    const me = await (await app.request("/~/api/me", { headers: { cookie: session } })).json();
    expect(me).toEqual({ username: "alice", isAdmin: true });

    // A renamed account keeps its original namespace; losing the group removes admin.
    const login2 = await app.request("/~/auth/login");
    setNextLogin({ sub: "s1", username: "alice2", groups: [] });
    const callback2 = await app.request("/~/auth/callback?code=c&state=s", {
      headers: { cookie: login2.headers.get("set-cookie")!.split(";")[0]! },
    });
    const session2 = callback2.headers.getSetCookie().find((c) => c.startsWith("short_session="))!.split(";")[0]!;
    expect(await (await app.request("/~/api/me", { headers: { cookie: session2 } })).json()).toEqual({
      username: "alice",
      isAdmin: false,
    });
  });

  it("rejects usernames that aren't URL-safe", async () => {
    const { app, setNextLogin } = setup();
    const login = await app.request("/~/auth/login");
    setNextLogin({ sub: "s2", username: "bob smith", groups: [] });
    const res = await app.request("/~/auth/callback?code=c&state=s", {
      headers: { cookie: login.headers.get("set-cookie")!.split(";")[0]! },
    });
    expect(res.status).toBe(403);
  });
});

describe("namespaces and permissions", () => {
  it("puts user links into their namespace and forbids root", async () => {
    const { user } = setup();
    const alice = user("alice");

    const own = await alice.api("POST", "/pages", { kind: "redirect", code: "cv", dest: "https://example.com/cv" });
    expect(own.status).toBe(201);
    expect((await own.json()).path).toBe("/alice/cv");

    const root = await alice.api("POST", "/pages", { kind: "redirect", namespace: "", dest: "https://example.com" });
    expect(root.status).toBe(403);

    const other = await alice.api("POST", "/pages", { kind: "redirect", namespace: "bob", dest: "https://example.com" });
    expect(other.status).toBe(403);
  });

  it("generates a code when none is given", async () => {
    const { user } = setup();
    const res = await user("alice").api("POST", "/pages", { kind: "redirect", dest: "https://example.com" });
    expect((await res.json()).code).toMatch(/^[A-Za-z0-9]{5}$/);
  });

  it("only accepts http(s) destinations", async () => {
    const { user } = setup();
    const res = await user("alice").api("POST", "/pages", { kind: "redirect", dest: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });

  it("hides other users' pages and lets admins manage everything", async () => {
    const { user } = setup();
    const alice = user("alice");
    const bob = user("bob");
    const admin = user("root", true);

    const page = await (await alice.api("POST", "/pages", { kind: "redirect", code: "a", dest: "https://a.test" })).json();

    expect((await bob.api("GET", `/pages/${page.id}`)).status).toBe(404);
    expect((await bob.api("PATCH", `/pages/${page.id}`, { dest: "https://evil.test" })).status).toBe(404);
    expect((await bob.api("DELETE", `/pages/${page.id}`)).status).toBe(404);
    expect(await (await bob.api("GET", "/pages")).json()).toEqual([]);

    expect((await admin.api("PATCH", `/pages/${page.id}`, { dest: "https://b.test" })).status).toBe(200);
    expect((await admin.api("GET", "/pages")).status).toBe(200);
    expect((await admin.api("POST", "/pages", { kind: "redirect", namespace: "", code: "x", dest: "https://x.test" })).status).toBe(201);
  });

  it("keeps root codes and usernames apart", async () => {
    const { user } = setup();
    user("alice");
    const admin = user("root", true);

    const clash = await admin.api("POST", "/pages", { kind: "redirect", namespace: "", code: "Alice", dest: "https://a.test" });
    expect(clash.status).toBe(409);
    const reserved = await admin.api("POST", "/pages", { kind: "redirect", namespace: "", code: "api", dest: "https://a.test" });
    expect(reserved.status).toBe(409);

    // A user who logs in after a root code with their name exists shows up as a conflict.
    await admin.api("POST", "/pages", { kind: "redirect", namespace: "", code: "carol", dest: "https://c.test" });
    user("carol");
    expect(await (await admin.api("GET", "/conflicts")).json()).toEqual([{ username: "carol", pageId: expect.any(Number) }]);
  });

  it("restricts admin-only endpoints", async () => {
    const { user } = setup();
    const alice = user("alice");
    expect((await alice.api("GET", "/users")).status).toBe(403);
    expect((await alice.api("GET", "/conflicts")).status).toBe(403);
    expect((await alice.api("DELETE", "/pin")).status).toBe(403);
  });
});

describe("link pages", () => {
  it("only links to the user's own redirects", async () => {
    const { user } = setup();
    const alice = user("alice");
    const bob = user("bob");

    const page = await (await alice.api("POST", "/pages", { kind: "linkpage", code: "me", title: "Alice" })).json();
    const own = await (await alice.api("POST", "/pages", { kind: "redirect", code: "gh", dest: "https://github.com" })).json();
    const foreign = await (await bob.api("POST", "/pages", { kind: "redirect", code: "gh", dest: "https://github.com" })).json();

    expect((await alice.api("POST", `/pages/${page.id}/blocks`, { kind: "link", targetId: foreign.id, label: "x" })).status).toBe(400);
    expect((await alice.api("POST", `/pages/${page.id}/blocks`, { kind: "link", targetId: own.id, label: "GitHub" })).status).toBe(201);
    const blocks = await (await alice.api("POST", `/pages/${page.id}/blocks`, { kind: "text", markdown: "**hi**" })).json();
    expect(blocks.map((b: { kind: string }) => b.kind)).toEqual(["link", "text"]);

    const reordered = await alice.api("PUT", `/pages/${page.id}/blocks/order`, { ids: [blocks[1].id, blocks[0].id] });
    expect((await reordered.json()).map((b: { kind: string }) => b.kind)).toEqual(["text", "link"]);
    expect((await alice.api("PUT", `/pages/${page.id}/blocks/order`, { ids: [blocks[0].id] })).status).toBe(400);
  });

  it("renders markdown without raw HTML or script links", async () => {
    const { app, user } = setup();
    const alice = user("alice");
    const page = await (await alice.api("POST", "/pages", { kind: "linkpage", code: "me", title: "Alice" })).json();
    await alice.api("POST", `/pages/${page.id}/blocks`, {
      kind: "text",
      markdown: "**bold** <script>alert(1)</script> [x](javascript:alert(1))",
    });

    const html = await (await app.request("/alice/me")).text();
    expect(html).toContain("<strong>bold</strong>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });

  it("removes blocks, stats and pin when a linked page is deleted", async () => {
    const { app, user } = setup();
    const admin = user("root", true);
    const page = await (await admin.api("POST", "/pages", { kind: "linkpage", namespace: "", code: "home", title: "Home" })).json();
    const link = await (await admin.api("POST", "/pages", { kind: "redirect", namespace: "", code: "gh", dest: "https://github.com" })).json();
    await admin.api("POST", `/pages/${page.id}/blocks`, { kind: "link", targetId: link.id, label: "GitHub" });
    await admin.api("PUT", "/pin", { pageId: link.id });
    await app.request("/gh");
    await flush();

    expect((await admin.api("DELETE", `/pages/${link.id}`)).status).toBe(204);
    expect((await (await admin.api("GET", `/pages/${page.id}`)).json()).blocks).toEqual([]);
    expect((await app.request("/")).status).toBe(200);
  });
});

describe("redirects and stats", () => {
  it("redirects with 302 and counts clicks and daily uniques", async () => {
    const { app, user } = setup();
    const alice = user("alice");
    const page = await (await alice.api("POST", "/pages", { kind: "redirect", code: "cv", dest: "https://example.com/cv" })).json();

    const visit = (ip: string) =>
      app.request("/alice/cv", { headers: { "x-forwarded-for": ip, "user-agent": "test" } });
    const res = await visit("1.2.3.4");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/cv");
    await visit("1.2.3.99"); // same /24 and user agent → same visitor
    await visit("5.6.7.8");
    await flush();

    const stats = await (await alice.api("GET", `/pages/${page.id}/stats?days=7`)).json();
    expect(stats.total).toBe(3);
    expect(stats.today).toBe(3);
    expect(stats.uniquesToday).toBe(2);
    expect(stats.series).toHaveLength(7);

    expect((await alice.api("DELETE", `/pages/${page.id}/stats`)).status).toBe(204);
    expect((await (await alice.api("GET", `/pages/${page.id}/stats`)).json()).total).toBe(0);
  });

  it("returns 404 for unknown links and the pinned page at the root", async () => {
    const { app, user } = setup();
    expect((await app.request("/nope")).status).toBe(404);
    expect((await app.request("/alice/nope")).status).toBe(404);

    const admin = user("root", true);
    const page = await (await admin.api("POST", "/pages", { kind: "linkpage", namespace: "", code: "home", title: "Home" })).json();
    await admin.api("PUT", "/pin", { pageId: page.id });
    const root = await app.request("/");
    expect(root.status).toBe(302);
    expect(root.headers.get("location")).toBe("/home");
  });
});

describe("api tokens", () => {
  it("creates, lists and revokes the caller's tokens only", async () => {
    const { app, user } = setup();
    const alice = user("alice");
    const bob = user("bob");

    const created = await (await alice.api("POST", "/tokens", { name: "shortcuts" })).json();
    expect(created.token).toMatch(/^short_/);
    const viaToken = await app.request("/~/api/me", { headers: { authorization: `Bearer ${created.token}` } });
    expect((await viaToken.json()).username).toBe("alice");

    expect((await bob.api("DELETE", `/tokens/${created.id}`)).status).toBe(404);
    expect((await alice.api("DELETE", `/tokens/${created.id}`)).status).toBe(204);
    const revoked = await app.request("/~/api/me", { headers: { authorization: `Bearer ${created.token}` } });
    expect(revoked.status).toBe(401);
  });
});

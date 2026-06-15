import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

// Shared key/value storage for the Warrior Band app.
// Implements the same window.storage contract the front-end expects:
//   get(key, shared)    -> { key, value, shared }  (404 if missing -> client throws)
//   set(key, value, sh) -> { key, value, shared }
//   delete(key, shared) -> { key, deleted, shared }
//   list(prefix, shared)-> { keys, prefix, shared }
//
// shared:true  -> one wall the whole group reads/writes (store "warrior-shared")
// shared:false -> private to this browser (store "warrior-user-<uid>", uid in a cookie)

const KEY_RE = /^[^\s/\\'"]{1,200}$/; // no spaces, slashes, or quotes; 1–200 chars
const MAX_VALUE = 5 * 1024 * 1024;     // 5MB per key

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const { op, key, value, prefix = "", shared = false } = body || {};

  // Per-browser identity, only needed for private (non-shared) data.
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)wb_uid=([A-Za-z0-9-]+)/);
  let uid = m ? m[1] : null;
  let extraHeaders = {};
  if (!shared && !uid) {
    uid = randomUUID();
    extraHeaders = {
      "set-cookie": `wb_uid=${uid}; Path=/; Max-Age=31536000; SameSite=Lax`,
    };
  }

  const storeName = shared ? "warrior-shared" : `warrior-user-${uid}`;
  const store = getStore({ name: storeName, consistency: "strong" });

  try {
    if (op === "get") {
      if (!KEY_RE.test(key || "")) return json({ error: "invalid key" }, 400, extraHeaders);
      const v = await store.get(key);
      if (v === null || v === undefined) return json({ error: "not found", key }, 404, extraHeaders);
      return json({ key, value: v, shared: !!shared }, 200, extraHeaders);
    }

    if (op === "set") {
      if (!KEY_RE.test(key || "")) return json({ error: "invalid key" }, 400, extraHeaders);
      if (typeof value !== "string") return json({ error: "value must be a string" }, 400, extraHeaders);
      if (value.length > MAX_VALUE) return json({ error: "value exceeds 5MB" }, 400, extraHeaders);
      await store.set(key, value);
      return json({ key, value, shared: !!shared }, 200, extraHeaders);
    }

    if (op === "delete") {
      if (!KEY_RE.test(key || "")) return json({ error: "invalid key" }, 400, extraHeaders);
      await store.delete(key);
      return json({ key, deleted: true, shared: !!shared }, 200, extraHeaders);
    }

    if (op === "list") {
      const { blobs } = await store.list({ prefix: prefix || undefined });
      return json({ keys: blobs.map((b) => b.key), prefix, shared: !!shared }, 200, extraHeaders);
    }

    return json({ error: "unknown op: " + op }, 400, extraHeaders);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500, extraHeaders);
  }
};

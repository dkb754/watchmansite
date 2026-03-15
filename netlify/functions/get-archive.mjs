import { getStore } from "@netlify/blobs";

export default async function handler(req, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const store = getStore("devotionals");
    let archiveIndex = [];
    try {
      archiveIndex = await store.get("archive-index", { type: "json" }) || [];
    } catch (e) { archiveIndex = []; }

    return new Response(JSON.stringify(archiveIndex), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify([]), { status: 200, headers });
  }
}

export const config = { path: "/api/archive" };

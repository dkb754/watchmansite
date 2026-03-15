export default async function handler(req, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  return new Response(JSON.stringify([]), { status: 200, headers });
}

export const config = { path: "/api/archive" };

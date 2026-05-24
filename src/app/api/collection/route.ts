import { listCollection, mergeEntries, clearCollection } from "@/server/collection";
import { authUser, json } from "@/server/http";

export const runtime = "nodejs";

function payload(userId: string) {
  return { entries: listCollection(userId), serverTime: new Date().toISOString() };
}

export async function GET(req: Request): Promise<Response> {
  const user = await authUser(req);
  if (!user) return json({ error: "Invalid or expired token" }, 401);
  return json(payload(user.id));
}

export async function PATCH(req: Request): Promise<Response> {
  const user = await authUser(req);
  if (!user) return json({ error: "Invalid or expired token" }, 401);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!Array.isArray(body.entries)) {
    return json({ error: "Body must be { entries: [...] }" }, 400);
  }
  mergeEntries(user.id, body.entries);
  return json(payload(user.id)); // merged authoritative state
}

export async function DELETE(req: Request): Promise<Response> {
  const user = await authUser(req);
  if (!user) return json({ error: "Invalid or expired token" }, 401);
  clearCollection(user.id);
  return new Response(null, { status: 204 });
}

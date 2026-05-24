import { deleteSession } from "@/server/auth";
import { sessionToken, clearSessionCookie } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const token = await sessionToken(req);
  if (token) deleteSession(token); // idempotent
  await clearSessionCookie();
  return new Response(null, { status: 204 });
}

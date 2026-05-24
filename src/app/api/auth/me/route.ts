import { authUser, json } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const user = await authUser(req);
  if (!user) return json({ error: "Invalid or expired token" }, 401);
  return json({ user });
}

import sql from "@/lib/db";
import { getAdminEarnings } from "@/lib/queries/earnings";

export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const earnings = await getAdminEarnings();
  return Response.json({ earnings });
}

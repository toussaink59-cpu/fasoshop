export const runtime = "nodejs";
import sql from "@/lib/db";
import { hash } from "bcryptjs";

function guard() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Non disponible en production." }, { status: 403 });
  }
  if (process.env.ALLOW_TEST_HELPERS !== "1") {
    return Response.json({ error: "Test helpers desactives." }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  const g = guard();
  if (g) return g;
  try {
    const { email, password, role, full_name } = await request.json();
    const password_hash = await hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role, full_name, status)
      VALUES (${email}, ${password_hash}, ${role}, ${full_name}, 'active')
      ON CONFLICT (email) DO UPDATE SET status = 'active', role = EXCLUDED.role
      RETURNING id
    `;
    return Response.json({ userId: user.id, email });
  } catch (err) {
    console.error("[create-user]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

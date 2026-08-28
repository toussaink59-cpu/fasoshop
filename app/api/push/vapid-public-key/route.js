import sql from "@/lib/db";
import webpush from "web-push";

export async function GET() {
  try {
    let [row] = await sql`SELECT public_key FROM push_vapid WHERE id = 1`;
    if (!row) {
      const gen = webpush.generateVAPIDKeys();
      await sql`
        INSERT INTO push_vapid (id, public_key, private_key)
        VALUES (1, ${gen.publicKey}, ${gen.privateKey})
        ON CONFLICT (id) DO NOTHING
      `;
      [row] = await sql`SELECT public_key FROM push_vapid WHERE id = 1`;
    }
    return Response.json({ publicKey: row.public_key });
  } catch (e) {
    console.error("[push] vapid error:", e.message);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

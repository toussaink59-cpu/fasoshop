import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/shops/delivery?ids=1,2,3
// Retourne les options de livraison EN DIRECT (jamais de prix périmé)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ shops: [] });
    }

    const rows = await sql`
      SELECT id, name, delivery_fee, offers_delivery, offers_pickup
      FROM shops
      WHERE id = ANY(${ids}) AND status = 'active'
    `;

    return NextResponse.json({ shops: rows });
  } catch (err) {
    console.error("[shops/delivery] GET error:", err);
    return NextResponse.json({ shops: [] });
  }
}
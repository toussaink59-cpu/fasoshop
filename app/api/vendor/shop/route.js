import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET : boutique du vendeur connecté (réponse JSON garantie)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "vendor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rows = await sql`
      SELECT * FROM shops WHERE vendor_id = ${user.id} LIMIT 1
    `;

    return NextResponse.json({ shop: rows[0] || null });
  } catch (err) {
    console.error("[vendor/shop] GET error:", err);
    return NextResponse.json(
      { error: "Erreur serveur", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// PATCH : identité, Mobile Money, ville, options livraison
export async function PATCH(request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "vendor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rows = await sql`SELECT id FROM shops WHERE vendor_id = ${user.id}`;
    if (!rows[0]) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }
    const shopId = rows[0].id;

    const body = await request.json().catch(() => ({}));
    const {
      idDocumentType,
      idDocumentNumber,
      idDocumentUrl,
      mobileMoneyNumber,
      mobileMoneyOperator,
      city,
      deliveryFee,
      offersDelivery,
      offersPickup,
    } = body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (idDocumentType !== undefined) {
      if (!["cni", "passeport", "permis"].includes(idDocumentType)) {
        return NextResponse.json({ error: "Type de pièce invalide" }, { status: 400 });
      }
      fields.push(`id_document_type = $${idx++}`);
      values.push(idDocumentType);
    }

    if (idDocumentNumber !== undefined) {
      if (!String(idDocumentNumber).trim()) {
        return NextResponse.json({ error: "Numéro de pièce requis" }, { status: 400 });
      }
      fields.push(`id_document_number = $${idx++}`);
      values.push(String(idDocumentNumber).trim());
      fields.push(`status = $${idx++}`);
      values.push("pending");
      fields.push(`rejection_reason = NULL`);
    }

    if (idDocumentUrl !== undefined) {
      fields.push(`id_document_url = $${idx++}`);
      values.push(idDocumentUrl);
    }

    if (mobileMoneyNumber !== undefined) {
      const cleaned = String(mobileMoneyNumber).replace(/\s+/g, "");
      if (!/^\d{8,15}$/.test(cleaned)) {
        return NextResponse.json({ error: "Numéro Mobile Money invalide (8-15 chiffres)" }, { status: 400 });
      }
      fields.push(`mobile_money_number = $${idx++}`);
      values.push(cleaned);
    }

    if (mobileMoneyOperator !== undefined) {
      if (!["orange_money", "moov_money"].includes(mobileMoneyOperator)) {
        return NextResponse.json({ error: "Opérateur invalide" }, { status: 400 });
      }
      fields.push(`mobile_money_operator = $${idx++}`);
      values.push(mobileMoneyOperator);
    }

    if (city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(String(city).trim() || null);
    }

    if (deliveryFee !== undefined) {
      const fee = Math.max(0, Math.min(50000, Number(deliveryFee) || 0));
      fields.push(`delivery_fee = $${idx++}`);
      values.push(fee);
    }

    if (offersDelivery !== undefined) {
      fields.push(`offers_delivery = $${idx++}`);
      values.push(Boolean(offersDelivery));
    }

    if (offersPickup !== undefined) {
      fields.push(`offers_pickup = $${idx++}`);
      values.push(Boolean(offersPickup));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
    }

    values.push(shopId);
    const updated = await sql.unsafe(
      `UPDATE shops SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    return NextResponse.json({ shop: updated[0] });
  } catch (err) {
    console.error("[vendor/shop] PATCH error:", err);
    return NextResponse.json(
      { error: "Erreur serveur", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
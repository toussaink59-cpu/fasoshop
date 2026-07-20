import sql from "@/lib/db";

// GET /api/categories
// Renvoie les catégories principales, chacune avec ses sous-catégories imbriquées.
export async function GET() {
  const rows = await sql`
    SELECT id, name, slug, parent_id, emoji, sort_order
    FROM categories
    ORDER BY parent_id NULLS FIRST, sort_order
  `;

  const parents = rows.filter((r) => !r.parent_id);
  const categories = parents.map((parent) => ({
    ...parent,
    children: rows.filter((r) => r.parent_id === parent.id),
  }));

  return Response.json({ categories });
}

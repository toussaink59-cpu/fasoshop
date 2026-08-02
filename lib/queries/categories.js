import sql from "@/lib/db";

// Catégories principales avec leurs sous-catégories imbriquées.
export async function getCategoriesTree() {
  const rows = await sql`
    SELECT id, name, slug, parent_id, emoji, sort_order
    FROM categories
    ORDER BY parent_id NULLS FIRST, sort_order
  `;

  const parents = rows.filter((r) => !r.parent_id);
  return parents.map((parent) => ({
    ...parent,
    children: rows.filter((r) => r.parent_id === parent.id),
  }));
}

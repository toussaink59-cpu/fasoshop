import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getUserConversations } from "@/lib/queries/conversations";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

export const metadata = {
  title: "Messages",
};

export default async function MessagesListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, conversations] = await Promise.all([
    getCategoriesTree(),
    getUserConversations(user.id, user.role),
  ]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Messages</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">💬</div>
            <p>Aucune conversation pour l'instant.</p>
          </div>
        ) : (
          <div className="panel" style={{ padding: 0 }}>
            {conversations.map((c, i) => (
              <Link
                href={`/messages/${c.id}`}
                key={c.id}
                className="conversation-row"
                style={{ borderBottom: i < conversations.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{c.other_party_name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-400)" }}>· Commande #{c.order_id}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.last_message || "Démarrer la conversation..."}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="conversation-unread-badge">{c.unread_count}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav user={user} />
    </div>
  );
}

import { MessageCircleIcon } from "@/app/components/Icons";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getUserConversations } from "@/lib/queries/conversations";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export const metadata = { title: "Messages" };

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(date) {
  if (!date) return "";
  const t = new Date(date).getTime();
  if (isNaN(t)) return "";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "maintenant";
  if (diff < 3600) return Math.floor(diff / 60) + " min";
  if (diff < 86400) return Math.floor(diff / 3600) + " h";
  return new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default async function MessagesListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin/conversations");

  const [categories, conversations] = await Promise.all([
    getCategoriesTree(),
    getUserConversations(user.id, user.role),
  ]);

  const isBuyer = user.role === "buyer";
  const isVendor = user.role === "vendor";
  const isAdmin = user.role === "admin";
  const backHref = isVendor ? "/vendor/dashboard" : isAdmin ? "/admin/dashboard" : "/";

  return (
    <div className="shell">
      {isVendor ? (
        <>
          <div className="topbar">
            <div className="brand">
              <KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span>
            </div>
            <div className="topbar-actions">
              <Link href="/vendor/dashboard" className="topbar-textlink">Tableau de bord</Link>
            </div>
          </div>
          <div className="woven-strip" />
        </>
      ) : isAdmin ? (
        <>
          <div className="topbar">
            <div className="brand">
              <KimoxaLogo light size={20} /> <span className="role-tag">Admin</span>
            </div>
            <div className="topbar-actions">
              <Link href="/admin/dashboard" className="topbar-textlink">Tableau de bord</Link>
            </div>
          </div>
          <div className="woven-strip" />
        </>
      ) : (
        <SiteHeader initialUser={user} categories={categories} />
      )}

      <div className="chat-list-wrap">
        <div className="chat-list-header">
          <Link href={backHref} className="chat-back-btn" aria-label="Retour">←</Link>
          <h1>Messages</h1>
          <span className="chat-list-count">{conversations.length}</span>
        </div>

        {conversations.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon"><MessageCircleIcon size={48} style={{ color: "var(--ink-300)" }} /></div>
            <p>Aucune conversation pour l'instant.</p>
            <p className="chat-empty-hint">
              {isBuyer
                ? "Contactez le support depuis la fiche d'un produit pour démarrer."
                : "Contactez un client depuis vos commandes reçues pour démarrer."}
            </p>
          </div>
        ) : (
          <div className="chat-list">
            {conversations.map((c) => {
              const displayName = isBuyer ? "Support Kimoxa" : c.other_party_name;
              const avatarText = isBuyer ? "SK" : initials(c.other_party_name);
              return (
                <Link href={`/messages/${c.id}`} key={c.id} className="chat-row">
                  <div className="chat-row-avatar">{avatarText}</div>
                  <div className="chat-row-body">
                    <div className="chat-row-top">
                      <strong>{displayName}</strong>
                      <span className="chat-row-time">{timeAgo(c.updated_at || c.created_at)}</span>
                    </div>
                    <div className="chat-row-bottom">
                      <p className="chat-row-preview">
                        {c.last_message || "Démarrer la conversation..."}
                      </p>
                      {c.unread_count > 0 && (
                        <span className="chat-row-badge">{c.unread_count > 9 ? "9+" : c.unread_count}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {isVendor ? <VendorBottomNav /> : isAdmin ? <AdminBottomNav /> : <BottomNav user={user} />}
    </div>
  );
}

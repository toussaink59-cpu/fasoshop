"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn btn-outline acct-logout" onClick={handleLogout}>
      ⏻ Déconnexion
    </button>
  );
}

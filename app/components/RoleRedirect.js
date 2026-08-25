"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Securite PWA : meme si le shell est servi depuis le cache,
// redirige vers le bon dashboard selon le role.
export default function RoleRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        if (!r.ok) return;
        const d = await r.json();
        const role = d?.user?.role;
        if (role === "admin") { if (!cancelled) router.replace("/admin/dashboard"); return; }
        if (role === "vendor") {
          const s = await fetch("/api/vendor/shop");
          if (!s.ok) return;
          const sd = await s.json();
          const st = sd?.shop?.status || sd?.status;
          if (!cancelled && st === "active") router.replace("/vendor/dashboard");
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [router]);
  return null;
}

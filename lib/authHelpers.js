import { getCurrentUser } from "@/lib/session";

// Helpers P0 réutilisables (standardisent l'autorisation)

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Authentification requise.");
    err.status = 401;
    throw err;
  }
  if (user.status === "suspended") {
    const err = new Error("Compte suspendu.");
    err.status = 403;
    throw err;
  }
  return user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    const err = new Error("Accès refusé.");
    err.status = 403;
    throw err;
  }
  return user;
}

export async function requireBuyer() {
  return requireRole("buyer", "admin");
}

export async function requireVendor() {
  return requireRole("vendor", "admin");
}

export async function requireAdmin() {
  return requireRole("admin");
}
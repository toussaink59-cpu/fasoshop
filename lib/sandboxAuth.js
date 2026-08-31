import { timingSafeEqual } from "crypto";

export function isSandboxRequestAuthorized(request) {
  if (process.env.ALLOW_SANDBOX_SIMULATION !== "1") return false;

  const provided = request.headers.get("x-sandbox-admin-secret") || "";
  const expected = process.env.SANDBOX_ADMIN_SECRET || "";

  if (!provided || !expected) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

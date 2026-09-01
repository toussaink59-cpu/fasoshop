import { put } from "@vercel/blob";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { inspectImage } from "@/lib/safeImage";

// POST /api/vendor/upload
// Reçoit un fichier image (FormData) et le stocke sur Vercel Blob.
// SÉCURITÉ : chaque fichier passe par le bouclier magic bytes avant
// stockage — exécutables, HTML, SVG piégés, etc. sont rejetés.
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    // ===== BOUCLIER : vérification de l'ADN du fichier =====
    const check = await inspectImage(file);
    if (!check.ok) {
      return Response.json({ error: check.error }, { status: 400 });
    }

    // Extension dérivée du type VÉRIFIÉ (jamais du nom envoyé par le client)
    const filename = `products/${userId}-${Date.now()}.${check.ext}`;

    const blobToken =
      process.env.FASOIMG_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

    const blob = await put(filename, file, {
      access: "public",
      contentType: check.type, // type forcé = type vérifié
      token: blobToken,
    });

    return Response.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("Erreur upload image:", err);
    return Response.json(
      { error: "Erreur serveur lors de l'envoi de l'image." },
      { status: 500 }
    );
  }
}

import { put } from "@vercel/blob";

// POST /api/vendor/upload
// Reçoit un fichier image (FormData) et le stocke sur Vercel Blob.
// Renvoie { url } à utiliser dans le tableau images du produit.
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
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: "Format non supporté. Utilisez JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5 Mo
    if (file.size > maxSizeBytes) {
      return Response.json(
        { error: "Image trop lourde (5 Mo maximum)." },
        { status: 400 }
      );
    }
    const extension = file.name.split(".").pop();
    const filename = `products/${userId}-${Date.now()}.${extension}`;

    // Le store public s'appelle FASOIMG_* (pas BLOB_*) — on précise
    // explicitement le token pour ne pas dépendre d'une variable BLOB_*
    // ambiguë qui pourrait pointer vers un ancien store privé.
    const blobToken = process.env.FASOIMG_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
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

// ============================================================
// KIMOXA — Bouclier images
// Vérifie qu'un fichier uploadé est une VRAIE image JPG/PNG/WEBP
// en lisant ses "magic bytes" (signature binaire) AVANT stockage.
// Un exécutable déguisé en .jpg, un HTML, un SVG avec script,
// un PDF, un .exe → signature absente → rejeté.
// ============================================================

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo

async function head(file, n) {
  return new Uint8Array(await file.slice(0, n).arrayBuffer());
}

const SIGNATURES = [
  {
    type: "image/jpeg",
    ext: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "image/png",
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export async function inspectImage(file) {
  if (!file) return { ok: false, error: "Aucun fichier reçu." };

  // 1) Poids (anti bombe + anti abus)
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image trop lourde (5 Mo maximum)." };
  }
  if (file.size < 12) {
    return { ok: false, error: "Fichier trop petit pour être une image." };
  }

  // 2) Magic bytes = identité réelle du fichier
  const b = await head(file, 16);
  const sig = SIGNATURES.find((s) => s.test(b));

  if (!sig) {
    return {
      ok: false,
      error: "Fichier refusé : ce n'est pas une vraie image JPG, PNG ou WEBP.",
    };
  }

  // 3) Anti "bombe de décompression" : dimensions PNG anormales
  if (sig.ext === "png") {
    const b24 = await head(file, 24);
    const w = ((b24[16] << 24) | (b24[17] << 16) | (b24[18] << 8) | b24[19]) >>> 0;
    const h = ((b24[20] << 24) | (b24[21] << 16) | (b24[22] << 8) | b24[23]) >>> 0;
    if (w <= 0 || h <= 0 || w > 8000 || h > 8000) {
      return { ok: false, error: "Dimensions anormales : fichier refusé." };
    }
  }

  return { ok: true, type: sig.type, ext: sig.ext };
}

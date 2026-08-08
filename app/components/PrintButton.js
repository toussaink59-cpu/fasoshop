"use client";

// Petit bouton client pour l'impression (le PDF se fait via le navigateur)
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary">
      🖨️ Imprimer / Enregistrer en PDF
    </button>
  );
}

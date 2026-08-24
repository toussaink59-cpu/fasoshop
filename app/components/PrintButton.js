"use client";

import { PrinterIcon } from "@/app/components/Icons";


// Petit bouton client pour l'impression (le PDF se fait via le navigateur)
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary">
      <PrinterIcon size={16} style={{ marginRight: 8 }} /> Imprimer / Enregistrer en PDF
    </button>
  );
}

import { redirect } from "next/navigation";

export const metadata = { title: "Kimoxa" };

// OPTION B : la liste publique des vendeurs n'existe plus.
export default function NosVendeursPage() {
  redirect("/");
}
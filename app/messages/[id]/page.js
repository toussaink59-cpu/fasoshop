import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getConversationThread } from "@/lib/queries/conversationThread";
import ConversationThreadClient from "@/app/messages/[id]/ConversationThreadClient";

export const metadata = {
  title: "Conversation",
};

export default async function ConversationThreadPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, thread] = await Promise.all([
    getCategoriesTree(),
    getConversationThread(id, user.id),
  ]);

  if (!thread) redirect("/messages");

  return (
    <ConversationThreadClient
      id={id}
      initialThread={thread}
      initialUser={user}
      categories={categories}
    />
  );
}

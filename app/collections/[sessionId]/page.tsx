import { notFound } from "next/navigation";
import { getSession } from "@/lib/db";
import { appBaseUrl } from "@/lib/config";
import CollectionView from "@/components/collection-view";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return notFound();
  const shareUrl = `${appBaseUrl()}/collections/${sessionId}`;
  return <CollectionView session={session} shareUrl={shareUrl} />;
}

import type { Metadata } from "next";
import { FeedList } from "@/features/feed/feed-list";

export const metadata: Metadata = { title: "Home" };

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { posted } = await searchParams;
  return <FeedList justPosted={posted === "1"} />;
}

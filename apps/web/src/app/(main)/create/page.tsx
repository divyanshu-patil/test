import type { Metadata } from "next";
import { CreatePostForm } from "@/features/posts/create-post-form";

export const metadata: Metadata = { title: "New post" };

export default function CreatePage() {
  return <CreatePostForm />;
}

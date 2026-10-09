// Mirrors the FastAPI response schemas (see /docs on the API for the OpenAPI contract).
export type User = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
};

export type Me = User & { email: string };

export type Media = {
  id: string;
  url: string;
  thumb_url: string;
  width: number;
  height: number;
  alt_text: string | null;
};

export type Post = {
  id: string;
  author: User;
  caption: string | null;
  media: Media[];
  like_count: number;
  comment_count: number;
  viewer_has_liked: boolean;
  created_at: string;
};

export type PostPage = { items: Post[]; next_cursor: string | null };

export type LikeState = { liked: boolean; like_count: number };

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author: User;
  body: string;
  created_at: string;
  can_delete: boolean;
};

export type CommentPage = { items: Comment[]; next_cursor: string | null };

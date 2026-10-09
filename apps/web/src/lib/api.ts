import type { Comment, CommentPage, LikeState, Me, Post, PostPage } from "@/types/api";

export const endpoints = {
  register: "/api/v1/auth/register",
  login: "/api/v1/auth/login",
  logout: "/api/v1/auth/logout",
  me: "/api/v1/users/me",
  feed: "/api/v1/feed",
  posts: "/api/v1/posts",
  post: (id: string) => `/api/v1/posts/${encodeURIComponent(id)}`,
  like: (id: string) => `/api/v1/posts/${encodeURIComponent(id)}/like`,
  comments: (id: string) => `/api/v1/posts/${encodeURIComponent(id)}/comments`,
  comment: (id: string) => `/api/v1/comments/${encodeURIComponent(id)}`,
} as const;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)socially_csrf=([^;]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

type ErrorBody = { detail?: string | { loc?: (string | number)[]; msg?: string }[] };

/** Turns FastAPI's `{detail}` (string or 422 list) into a message + per-field errors. */
export function parseError(status: number, body: ErrorBody | null): ApiError {
  const detail = body?.detail;
  if (typeof detail === "string") return new ApiError(status, detail);
  const fields: Record<string, string> = {};
  for (const d of detail ?? []) {
    const field = String(d.loc?.at(-1) ?? "");
    if (field && d.msg) fields[field] = d.msg.replace(/^Value error, /, "");
  }
  const first = Object.values(fields)[0];
  return new ApiError(status, first ?? (status >= 500 ? "Something went wrong. Please try again." : "Request failed."), fields);
}

function safeJson(text: string): ErrorBody | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("content-type", "application/json");
  if (UNSAFE.has(method)) headers.set("x-csrf-token", csrfToken());
  let res: Response;
  try {
    res = await fetch(path, { ...init, method, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw parseError(res.status, body);
  return body as T;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string; display_name?: string }) =>
    api<Me>(endpoints.register, { method: "POST", body: JSON.stringify(data) }),
  login: (data: { identifier: string; password: string }) =>
    api<Me>(endpoints.login, { method: "POST", body: JSON.stringify(data) }),
  logout: () => api<void>(endpoints.logout, { method: "POST" }),
};

export const postsApi = {
  feed: (cursor: string | null, signal?: AbortSignal) =>
    api<PostPage>(`${endpoints.feed}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }),
  remove: (id: string) => api<void>(endpoints.post(id), { method: "DELETE" }),
  /** XHR (not fetch) so we can report upload progress. */
  create(form: FormData, onProgress: (fraction: number) => void): Promise<Post> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoints.posts);
      xhr.setRequestHeader("x-csrf-token", csrfToken());
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => {
        const body = safeJson(xhr.responseText);
        if (xhr.status === 201) resolve(body as Post);
        else reject(parseError(xhr.status, body));
      };
      xhr.onerror = () => reject(new ApiError(0, "Upload failed. Check your connection and try again."));
      xhr.send(form);
    });
  },
};

export const engagementApi = {
  setLike: (postId: string, liked: boolean) =>
    api<LikeState>(endpoints.like(postId), { method: liked ? "PUT" : "DELETE" }),
  comments: (postId: string, cursor: string | null, signal?: AbortSignal) =>
    api<CommentPage>(`${endpoints.comments(postId)}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, {
      signal,
    }),
  addComment: (postId: string, body: string) =>
    api<Comment>(endpoints.comments(postId), { method: "POST", body: JSON.stringify({ body }) }),
  deleteComment: (id: string) => api<void>(endpoints.comment(id), { method: "DELETE" }),
};

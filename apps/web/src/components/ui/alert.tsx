import type { ReactNode } from "react";

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  const styles = tone === "error" ? "border-danger/30 bg-danger/5 text-danger" : "border-success/30 bg-success/5 text-success";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-control border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

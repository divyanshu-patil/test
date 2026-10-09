"use client";

import { createContext, useContext } from "react";
import type { Me } from "@/types/api";

const MeContext = createContext<Me | null>(null);

export function MeProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  return <MeContext value={me}>{children}</MeContext>;
}

export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside the signed-in layout");
  return me;
}

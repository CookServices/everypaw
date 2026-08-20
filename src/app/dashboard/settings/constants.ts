import type { CSSProperties } from "react";

export type Plan = "free" | "digital" | "print";

export interface SubscriptionInfo {
  status: string;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  current_period_end: number;
  interval: "month" | "year";
}

export const inputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: ".65rem .875rem", borderRadius: 10,
  border: "1.5px solid rgba(61,43,31,.15)",
  background: "#F7F2EA", fontFamily: "inherit",
  fontSize: ".875rem", color: "#3D2B1F", outline: "none",
};

export const btnPrimary: CSSProperties = {
  padding: ".65rem 1.25rem", borderRadius: 100, border: "none",
  background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit",
  fontSize: ".875rem", fontWeight: 500, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "100%", boxSizing: "border-box" as const,
};

export const btnOutline: CSSProperties = {
  padding: ".6rem 1rem", borderRadius: 100,
  border: "1.5px solid rgba(200,129,58,.4)", background: "transparent",
  color: "#C8813A", fontFamily: "inherit", fontSize: ".875rem",
  fontWeight: 500, cursor: "pointer",
  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
  boxSizing: "border-box" as const,
};

import Link from "next/link";

interface Props {
  isMemorial: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textMuted: string;
  accentColor: string;
  orderId: string | null;
  successTitle: string;
  successDesc: string;
  orderIdLabel: string;
  backDashboardLabel: string;
}

export default function SuccessStep({
  isMemorial,
  cardBg,
  cardBorder,
  textPrimary,
  textMuted,
  accentColor,
  orderId,
  successTitle,
  successDesc,
  orderIdLabel,
  backDashboardLabel,
}: Props) {
  return (
    <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{isMemorial ? "🕊️" : "📬"}</div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: textPrimary, marginBottom: ".75rem" }}>{successTitle}</h2>
      <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: ".5rem" }}>
        {successDesc}
      </p>
      <p style={{ fontSize: ".8rem", color: textMuted, fontWeight: 300, marginBottom: "2rem" }}>
        {orderIdLabel} <code style={{ background: isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.06)", padding: "2px 6px", borderRadius: 4 }}>{orderId}</code>
      </p>
      <Link href="/dashboard" style={{ background: accentColor, color: "var(--ep-bg-card)", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
        {backDashboardLabel}
      </Link>
    </div>
  );
}

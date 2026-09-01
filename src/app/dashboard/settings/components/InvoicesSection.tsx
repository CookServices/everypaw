import type { Dispatch, SetStateAction } from "react";
import type { Invoice } from "../constants";

interface Props {
  isFR: boolean;
  invoicesLoading: boolean;
  invoices: Invoice[];
  invoicesVisible: number;
  setInvoicesVisible: Dispatch<SetStateAction<number>>;
}

export default function InvoicesSection({
  isFR,
  invoicesLoading,
  invoices,
  invoicesVisible,
  setInvoicesVisible,
}: Props) {
  if (!invoicesLoading && invoices.length === 0) return null;

  return (
    <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.25rem" }}>
        {isFR ? "Mes factures" : "My invoices"}
      </h2>
      {invoicesLoading ? (
        <p style={{ color: "#9A8070", fontSize: ".875rem" }}>…</p>
      ) : (
        <>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: ".5rem", paddingRight: ".25rem" }}>
            {invoices.slice(0, invoicesVisible).map(inv => {
              const amount = (inv.amount_paid / 100).toLocaleString(isFR ? "fr-FR" : "en-US", { style: "currency", currency: inv.currency.toUpperCase(), minimumFractionDigits: 2 });
              const date = new Date(inv.created * 1000).toLocaleDateString(isFR ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" });
              const period = `${new Date(inv.period_start * 1000).toLocaleDateString(isFR ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" })} – ${new Date(inv.period_end * 1000).toLocaleDateString(isFR ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
              return (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: ".75rem 1rem", background: "#F7F2EA", borderRadius: 12, flexWrap: "wrap", flexShrink: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".875rem", fontWeight: 600, color: "#3D2B1F" }}>{amount}</span>
                      <span style={{ fontSize: ".72rem", color: "#9A8070" }}>· {date}</span>
                    </div>
                    <div style={{ fontSize: ".72rem", color: "#9A8070", marginTop: ".15rem" }}>{period}</div>
                    {inv.number && <div style={{ fontSize: ".68rem", color: "#9A8070", marginTop: ".1rem", fontFamily: "monospace" }}>{inv.number}</div>}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexShrink: 0 }}>
                    {inv.invoice_pdf?.startsWith("https://") && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".75rem", color: "#C8813A", textDecoration: "none", border: "1px solid rgba(200,129,58,.3)", borderRadius: 100, padding: ".3rem .75rem", whiteSpace: "nowrap" }}>
                        PDF
                      </a>
                    )}
                    {inv.hosted_invoice_url?.startsWith("https://") && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".75rem", color: "#7A5C44", textDecoration: "none", border: "1px solid rgba(61,43,31,.15)", borderRadius: 100, padding: ".3rem .75rem", whiteSpace: "nowrap" }}>
                        {isFR ? "Voir" : "View"}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {invoices.length > invoicesVisible && (
            <button
              onClick={() => setInvoicesVisible(v => v + 6)}
              style={{ marginTop: ".75rem", background: "none", border: "none", cursor: "pointer", color: "#C8813A", fontSize: ".8rem", fontFamily: "inherit", fontWeight: 500, padding: ".25rem 0", textDecoration: "underline" }}
            >
              {isFR ? `Voir plus (${invoices.length - invoicesVisible} restantes)` : `Show more (${invoices.length - invoicesVisible} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

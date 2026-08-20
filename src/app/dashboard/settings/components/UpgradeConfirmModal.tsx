import { fmtDateOrdinal } from "@/lib/date";
import { btnOutline, btnPrimary } from "../constants";

interface Props {
  newPlan: string;
  scheduledDate: number;
  isFR: boolean;
  upgradeLoading: string | null;
  onCancel: () => void;
  onConfirm: (newPlan: string) => void;
}

export default function UpgradeConfirmModal({ newPlan, scheduledDate, isFR, upgradeLoading, onCancel, onConfirm }: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "1rem" }}>
      <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "2rem", maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#3D2B1F", margin: "0 0 1.25rem" }}>
          {isFR ? "Confirmer le changement de plan" : "Confirm plan change"}
        </h3>

        {/* Scheduled date */}
        <div style={{ background: "#F7F2EA", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: "0 0 .25rem", fontWeight: 300 }}>
            {isFR ? "Changement effectif le" : "Change takes effect on"}
          </p>
          <p style={{ fontSize: "1.15rem", fontFamily: "Georgia, serif", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
            {fmtDateOrdinal(new Date(scheduledDate * 1000), isFR, { month: "long", year: "numeric" })}
          </p>
          <p style={{ fontSize: ".72rem", color: "#9A8070", margin: ".4rem 0 0", fontWeight: 300 }}>
            {isFR
              ? "Vous conservez votre abonnement actuel jusqu'à cette date. Aucun paiement immédiat."
              : "Your current plan continues until that date. No charge today."}
          </p>
        </div>

        <div style={{ display: "flex", gap: ".75rem" }}>
          <button
            onClick={onCancel}
            disabled={!!upgradeLoading}
            style={{ ...btnOutline, border: "1.5px solid rgba(61,43,31,.2)", color: "#3D2B1F", flex: 1 }}
          >
            {isFR ? "Annuler" : "Cancel"}
          </button>
          <button
            onClick={() => onConfirm(newPlan)}
            disabled={!!upgradeLoading}
            style={{ ...btnPrimary, opacity: upgradeLoading ? .7 : 1, flex: 1 }}
          >
            {upgradeLoading
              ? (isFR ? "Planification…" : "Scheduling…")
              : (isFR ? "Confirmer" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

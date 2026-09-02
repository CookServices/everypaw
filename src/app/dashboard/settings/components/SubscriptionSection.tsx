import type { Dispatch, SetStateAction } from "react";
import { formatPrice, type Currency } from "@/lib/currency";
import { inputStyle, btnPrimary, btnOutline } from "../constants";
import type { Plan, ScheduledChange, SubscriptionInfo } from "../constants";

type GiftStatus = "idle" | "loading" | "success" | "error";

interface Props {
  isFR: boolean;
  subLoading: boolean;
  plan: Plan;
  currency: Currency;
  cancelledAt: number | null;
  subscription: SubscriptionInfo | null;
  scheduledChange: ScheduledChange | null;
  profileRenewalDate: number | null;
  bookCredits: number;
  formatDate: (ts: number) => string;
  reactivateLoading: boolean;
  handleReactivate: () => void;
  checkoutLoading: string | null;
  handleCheckout: (targetPlan: "digital" | "print_annual") => void;
  upgradeLoading: string | null;
  upgradePreviewLoading: string | null;
  handleUpgradeWithPreview: (newPlan: string) => void;
  cancelLoading: boolean;
  handleCancel: () => void;
  giftStatus: GiftStatus;
  giftResult: { activatesAt?: number; plan?: string } | null;
  giftCode: string;
  setGiftCode: Dispatch<SetStateAction<string>>;
  setGiftStatus: Dispatch<SetStateAction<GiftStatus>>;
  setGiftError: Dispatch<SetStateAction<string>>;
  handleRedeemGift: () => void;
  giftError: string;
}

export default function SubscriptionSection({
  isFR,
  subLoading,
  plan,
  currency,
  cancelledAt,
  subscription,
  scheduledChange,
  profileRenewalDate,
  bookCredits,
  formatDate,
  reactivateLoading,
  handleReactivate,
  checkoutLoading,
  handleCheckout,
  upgradeLoading,
  upgradePreviewLoading,
  handleUpgradeWithPreview,
  cancelLoading,
  handleCancel,
  giftStatus,
  giftResult,
  giftCode,
  setGiftCode,
  setGiftStatus,
  setGiftError,
  handleRedeemGift,
  giftError,
}: Props) {
  return (
    <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.25rem" }}>
        {isFR ? "Mon abonnement" : "My subscription"}
      </h2>

      {subLoading ? (
        <p style={{ color: "#9A8070", fontSize: ".875rem" }}>…</p>
      ) : (
        <>
          {/* Badge plan actuel */}
          <div style={{ display: "flex", alignItems: "center", gap: ".625rem", marginBottom: "1rem" }}>
            <span style={{ display: "inline-block", padding: ".3rem .875rem", borderRadius: 100, background: plan === "free" ? "rgba(61,43,31,.08)" : "rgba(200,129,58,.12)", border: `1px solid ${plan === "free" ? "rgba(61,43,31,.15)" : "rgba(200,129,58,.3)"}`, fontSize: ".8rem", fontWeight: 600, color: plan === "free" ? "#7A5C44" : "#C8813A" }}>
              {plan === "free" ? (isFR ? "Plan gratuit" : "Free plan") : plan === "digital" ? "Premium Digital" : "Premium Print"}
            </span>
            {plan === "digital" && (
              <span style={{ fontSize: ".8rem", color: "#9A8070" }}>{formatPrice(currency, "digital")}/{isFR ? "mois" : "mo"}</span>
            )}
            {plan === "print" && (
              <span style={{ fontSize: ".8rem", color: "#9A8070" }}>{formatPrice(currency, "printAnnual")}/{isFR ? "an" : "yr"}</span>
            )}
          </div>

          {/* Renouvellement */}
          {plan !== "free" && !cancelledAt && (subscription?.current_period_end || profileRenewalDate) && (
            <p style={{ fontSize: ".8rem", color: "#9A8070", margin: "0 0 .75rem", fontWeight: 300 }}>
              {isFR
                ? `Prochain renouvellement : ${formatDate((subscription?.current_period_end ?? profileRenewalDate)!)}`
                : `Next renewal: ${formatDate((subscription?.current_period_end ?? profileRenewalDate)!)}`}
            </p>
          )}

          {/* Crédits livre */}
          {plan === "print" && !cancelledAt && (
            <p style={{ fontSize: ".8rem", margin: "0 0 1rem", fontWeight: 400, color: bookCredits > 0 ? "#C8813A" : "#9A8070" }}>
              {bookCredits > 0
                ? (isFR ? "📖 Votre livre offert n'a pas encore été commandé" : "📖 Your free book hasn't been ordered yet")
                : (() => {
                    const renewalTs = subscription?.current_period_end ?? profileRenewalDate;
                    const renewalStr = renewalTs ? formatDate(renewalTs) : null;
                    return isFR
                      ? (renewalStr ? `📖 Votre livre offert a déjà été commandé · Prochain : ${renewalStr}` : "📖 Votre livre offert a déjà été commandé")
                      : (renewalStr ? `📖 Your free book has already been ordered · Next: ${renewalStr}` : "📖 Your free book has already been ordered");
                  })()}
            </p>
          )}

          {/* Changement de plan programmé (upgrade ou code cadeau) */}
          {scheduledChange && !cancelledAt && (
            <div style={{ background: "rgba(200,129,58,.07)", border: "1px solid rgba(200,129,58,.25)", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0 }}>
                {isFR
                  ? `Changement de formule programmé : ${scheduledChange.plan === "print" ? "Premium Print" : scheduledChange.plan === "digital" ? "Premium Digital" : "nouvelle formule"} le ${formatDate(scheduledChange.at)}. Annuler votre abonnement abandonne ce changement.`
                  : `Plan change scheduled: ${scheduledChange.plan === "print" ? "Premium Print" : scheduledChange.plan === "digital" ? "Premium Digital" : "new plan"} on ${formatDate(scheduledChange.at)}. Cancelling your subscription drops that change.`}
              </p>
            </div>
          )}

          {/* Annulation en cours */}
          {cancelledAt && (
            <div style={{ background: "rgba(163,45,45,.05)", border: "1px solid rgba(163,45,45,.2)", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>
                {isFR
                  ? `Votre abonnement sera annulé le ${formatDate(cancelledAt)}. Vous gardez l'accès jusqu'à cette date.`
                  : `Your subscription will be cancelled on ${formatDate(cancelledAt)}. You keep access until then.`}
              </p>
              <button
                onClick={handleReactivate}
                disabled={reactivateLoading}
                style={{ background: "none", border: "1px solid rgba(163,45,45,.4)", borderRadius: 100, cursor: "pointer", color: "#A32D2D", fontSize: ".75rem", fontFamily: "inherit", padding: ".3rem .875rem", whiteSpace: "nowrap", opacity: reactivateLoading ? .6 : 1, flexShrink: 0 }}
              >
                {reactivateLoading ? (isFR ? "Réactivation…" : "Reactivating…") : (isFR ? "Annuler ma résiliation" : "Keep my subscription")}
              </button>
            </div>
          )}

          {/* ── Plan gratuit → choix abonnement ── */}
          {plan === "free" && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", margin: "0 0 .25rem", fontWeight: 300 }}>
                {isFR ? "Passez à Premium pour débloquer toutes les fonctionnalités." : "Upgrade to Premium to unlock all features."}
              </p>
              <button
                onClick={() => handleCheckout("digital")}
                disabled={!!checkoutLoading}
                style={{ ...btnPrimary, opacity: checkoutLoading ? .7 : 1 }}
              >
                {checkoutLoading === "digital" ? "…" : (isFR ? `Premium Digital, ${formatPrice(currency, "digital")}/mois` : `Premium Digital, ${formatPrice(currency, "digital")}/mo`)}
              </button>
              <button
                onClick={() => handleCheckout("print_annual")}
                disabled={!!checkoutLoading}
                style={{ ...btnPrimary, background: "#3D2B1F", opacity: checkoutLoading ? .7 : 1 }}
              >
                {checkoutLoading === "print_annual" ? "…" : (isFR ? `Premium Print, ${formatPrice(currency, "printAnnual")}/an` : `Premium Print, ${formatPrice(currency, "printAnnual")}/yr`)}
              </button>
              <p style={{ fontSize: ".72rem", color: "#9A8070", margin: ".25rem 0 0", lineHeight: 1.5, fontWeight: 300, textAlign: "center" as const }}>
                {isFR ? (<>En continuant, vous acceptez les <a href="/legal/cgv" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>CGV</a>.</>) : (<>By continuing, you agree to our <a href="/legal/terms" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>Terms of Service</a>.</>)}
              </p>
            </div>
          )}

          {/* ── Plan payant actif → changer ── */}
          {plan !== "free" && !cancelledAt && (
            <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              <p style={{ fontSize: ".8rem", color: "#9A8070", margin: "0 0 .25rem", fontWeight: 300 }}>
                {isFR ? "Changer de formule :" : "Switch plan:"}
              </p>

              {/* Digital → Print annuel */}
              {plan === "digital" && (
                <button
                  onClick={() => handleUpgradeWithPreview("print_annual")}
                  disabled={!!upgradeLoading || !!upgradePreviewLoading}
                  style={{ ...btnOutline, alignSelf: "stretch", textAlign: "center" as const, background: "rgba(61,43,31,.04)", opacity: (upgradeLoading || upgradePreviewLoading) ? .7 : 1 }}
                >
                  {upgradePreviewLoading === "print_annual" ? (isFR ? "Calcul…" : "Calculating…") : upgradeLoading === "print_annual" ? (isFR ? "Mise à jour…" : "Updating…") : (
                    isFR ? `Premium Print, ${formatPrice(currency, "printAnnual")}/an` : `Premium Print, ${formatPrice(currency, "printAnnual")}/yr`
                  )}
                </button>
              )}

              {/* Print annuel → Digital mensuel */}
              {plan === "print" && (
                <button
                  onClick={() => handleUpgradeWithPreview("digital")}
                  disabled={!!upgradeLoading || !!upgradePreviewLoading}
                  style={{ ...btnOutline, alignSelf: "stretch", textAlign: "center" as const, opacity: (upgradeLoading || upgradePreviewLoading) ? .7 : 1 }}
                >
                  {upgradePreviewLoading === "digital" ? (isFR ? "Calcul…" : "Calculating…") : upgradeLoading === "digital" ? (isFR ? "Mise à jour…" : "Updating…") : (
                    isFR ? `Premium Digital, ${formatPrice(currency, "digital")}/mois` : `Premium Digital, ${formatPrice(currency, "digital")}/mo`
                  )}
                </button>
              )}

              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D", fontSize: ".8rem", fontFamily: "inherit", padding: ".25rem 0", textDecoration: "underline", opacity: cancelLoading ? .6 : 1, textAlign: "left" as const }}
              >
                {cancelLoading ? (isFR ? "Annulation…" : "Cancelling…") : (isFR ? "Annuler mon abonnement" : "Cancel my subscription")}
              </button>
            </div>
          )}
          {/* ── Code cadeau ── */}
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "0.5px solid rgba(61,43,31,.08)" }}>
            <p style={{ fontSize: ".8rem", color: "#9A8070", margin: "0 0 .625rem", fontWeight: 300 }}>
              {isFR ? "Vous avez un code cadeau ?" : "Have a gift code?"}
            </p>

            {giftStatus === "success" && giftResult ? (
              <div style={{ background: "rgba(107,123,94,.08)", border: "1px solid rgba(107,123,94,.25)", borderRadius: 12, padding: ".875rem 1rem", display: "flex", alignItems: "flex-start", gap: ".625rem" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🎁</span>
                <div>
                  <p style={{ fontSize: ".875rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .2rem" }}>
                    {isFR ? "Code cadeau activé !" : "Gift code activated!"}
                  </p>
                  <p style={{ fontSize: ".8rem", color: "#6B7B5E", margin: 0, fontWeight: 300 }}>
                    {isFR
                      ? `Votre plan ${giftResult.plan === "print_annual" ? "Premium Print" : "Premium Digital"} s'activera le ${giftResult.activatesAt ? formatDate(giftResult.activatesAt) : ", "}.`
                      : `Your ${giftResult.plan === "print_annual" ? "Premium Print" : "Premium Digital"} plan activates on ${giftResult.activatesAt ? formatDate(giftResult.activatesAt) : ", "}.`}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  type="text"
                  value={giftCode}
                  onChange={e => { setGiftCode(e.target.value.toUpperCase()); if (giftStatus === "error") { setGiftStatus("idle"); setGiftError(""); } }}
                  placeholder={isFR ? "Ex : GIFT-XXXXXX" : "E.g. GIFT-XXXXXX"}
                  style={{ ...inputStyle, flex: 1, fontFamily: "monospace", letterSpacing: ".08em", textTransform: "uppercase" }}
                  onKeyDown={e => { if (e.key === "Enter") handleRedeemGift(); }}
                />
                <button
                  onClick={handleRedeemGift}
                  disabled={giftStatus === "loading"}
                  style={{ ...btnPrimary, whiteSpace: "nowrap" as const, opacity: giftStatus === "loading" ? .7 : 1, flexShrink: 0, width: "auto" }}
                >
                  {giftStatus === "loading" ? "…" : (isFR ? "Activer" : "Activate")}
                </button>
              </div>
            )}

            {giftStatus === "error" && giftError && (
              <p style={{ fontSize: ".78rem", color: "#A32D2D", margin: ".4rem 0 0" }}>{giftError}</p>
            )}
          </div>

        </>
      )}
    </div>
  );
}

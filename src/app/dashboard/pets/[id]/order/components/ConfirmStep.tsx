import { getTranslations, type Locale } from "@/lib/i18n";
import type { Step, Profile, Address } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  awaitingCredit: boolean;
  paymentPending: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textMuted: string;
  locale: Locale;
  handleOrder: () => void;
  loading: boolean;
  accentColor: string;
  t: Translations;
  isMemorial: boolean;
  labelColor: string;
  address: Address;
  petName: string;
  price: string;
  shippingEstimate: string | undefined;
  selectedStoryIds: string[];
  setStep: (step: Step) => void;
  profile: Profile | null;
  checkoutLoading: boolean;
  startBookCheckout: () => void;
  checkoutError: boolean;
}

export default function ConfirmStep({
  awaitingCredit,
  paymentPending,
  cardBg,
  cardBorder,
  textPrimary,
  textMuted,
  locale,
  handleOrder,
  loading,
  accentColor,
  t,
  isMemorial,
  labelColor,
  address,
  petName,
  price,
  shippingEstimate,
  selectedStoryIds,
  setStep,
  profile,
  checkoutLoading,
  startBookCheckout,
  checkoutError,
}: Props) {
  return (
    <>
      {awaitingCredit && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(200,129,58,.3)", borderTopColor: "var(--ep-brand)", borderRadius: "50%", animation: "spin .8s linear infinite", marginBottom: "1.25rem" }} />
          <p style={{ fontSize: ".95rem", color: textPrimary, fontWeight: 500, margin: "0 0 .4rem" }}>
            {locale === "fr" ? "Paiement reçu" : "Payment received"}
          </p>
          <p style={{ fontSize: ".85rem", color: textMuted, fontWeight: 300, margin: 0 }}>
            {locale === "fr" ? "Envoi de la commande en cours…" : "Placing your order…"}
          </p>
        </div>
      )}
      {!awaitingCredit && paymentPending && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", color: textPrimary, marginBottom: ".75rem" }}>
            {locale === "fr" ? "Paiement reçu" : "Payment received"}
          </h2>
          <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            {locale === "fr"
              ? "Ton paiement est bien passé, mais la commande n'a pas encore pu être envoyée à l'impression (traitement en cours). Clique pour réessayer, aucun nouveau paiement ne sera demandé."
              : "Your payment went through, but the order couldn't be sent to print yet (still processing). Tap to retry, you will not be charged again."}
          </p>
          <button
            onClick={handleOrder}
            disabled={loading}
            style={{ padding: ".75rem 2rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
          >
            {loading && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
            {loading ? t.order.placing : (locale === "fr" ? "Réessayer la commande" : "Retry order")}
          </button>
          <p style={{ fontSize: ".78rem", color: textMuted, fontWeight: 300, margin: "1rem 0 0" }}>
            {locale === "fr"
              ? "Le problème persiste ? Écris-nous depuis Réglages, ta commande sera honorée."
              : "Still stuck? Contact us from Settings, your order will be honored."}
          </p>
        </div>
      )}
      {!awaitingCredit && !paymentPending && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.confirm_title}</h2>

          <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "var(--ep-bg)", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.shipping_to}</div>
            <p style={{ fontSize: ".9rem", color: textPrimary, lineHeight: 1.7, margin: 0 }}>
              {address.firstName} {address.lastName}<br />
              {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />
              {address.city}, {address.postCode}<br />
              {address.country}
            </p>
          </div>

          <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "var(--ep-bg)", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.order_summary}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", color: textPrimary, marginBottom: ".5rem" }}>
              <span>{isMemorial && petName ? t.memorial.order_tribute.replace("{name}", petName) : t.order.product_name}</span>
              <span style={{ fontWeight: 500 }}>{price}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", color: textMuted }}>
              <span>{t.order.shipping}</span>
              <span>{shippingEstimate ?? t.order.shipping_calculated}</span>
            </div>
          </div>

          {selectedStoryIds.length < 3 && (
            <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem", fontSize: ".8rem", color: "var(--ep-brand)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
              {t.order.few_stories_warning}
            </div>
          )}


          <div style={{ display: "flex", gap: ".75rem" }}>
            <button onClick={() => setStep("address")} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`, background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: textMuted, cursor: "pointer" }}>
              {t.order.edit_address}
            </button>
            <button
              onClick={() => {
                if (profile?.plan === "print" && profile.book_credits === 0) {
                  startBookCheckout();
                  return;
                }
                handleOrder();
              }}
              disabled={loading || checkoutLoading}
              style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: loading || checkoutLoading ? "wait" : "pointer", opacity: loading || checkoutLoading ? .7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
            >
              {(loading || checkoutLoading) && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
              {loading || checkoutLoading ? t.order.placing : t.order.place_order}
            </button>
          </div>
          {checkoutError && (
            <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: "1rem 0 0" }}>
              {locale === "fr"
                ? "Impossible de démarrer le paiement. Vérifie ta connexion et réessaie."
                : "Could not start checkout. Check your connection and try again."}
            </p>
          )}
        </div>
      )}
    </>
  );
}

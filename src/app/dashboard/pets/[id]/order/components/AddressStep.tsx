import type { Dispatch, SetStateAction, CSSProperties } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Step, Profile, Address } from "../constants";
import { COUNTRIES } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Field {
  key: string;
  label: string;
  placeholder: string;
  autocomplete: string;
}

interface Props {
  cardBg: string;
  cardBorder: string;
  isMemorial: boolean;
  productName: string;
  productSpecs: string;
  textPrimary: string;
  textMuted: string;
  price: string;
  profile: Profile | null;
  locale: Locale;
  t: Translations;
  fields: Field[];
  address: Address;
  setAddress: Dispatch<SetStateAction<Address>>;
  addressErrors: Record<string, boolean>;
  setAddressErrors: Dispatch<SetStateAction<Record<string, boolean>>>;
  labelColor: string;
  inputStyle: CSSProperties;
  countrySearch: string;
  setCountrySearch: Dispatch<SetStateAction<string>>;
  accentColor: string;
  shippingEstimate: string | undefined;
  dedicationLabel: string;
  dedicationText: string;
  setDedicationText: Dispatch<SetStateAction<string>>;
  dedicationPlaceholder: string;
  setStep: (step: Step) => void;
}

export default function AddressStep({
  cardBg,
  cardBorder,
  isMemorial,
  productName,
  productSpecs,
  textPrimary,
  textMuted,
  price,
  profile,
  locale,
  t,
  fields,
  address,
  setAddress,
  addressErrors,
  setAddressErrors,
  labelColor,
  inputStyle,
  countrySearch,
  setCountrySearch,
  accentColor,
  shippingEstimate,
  dedicationLabel,
  dedicationText,
  setDedicationText,
  dedicationPlaceholder,
  setStep,
}: Props) {
  return (
    <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
      <div style={{ background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontSize: "1.5rem" }}>{isMemorial ? "🕊️" : "📖"}</span>
        <div>
          <p style={{ fontSize: ".875rem", fontWeight: 500, color: textPrimary, margin: "0 0 .2rem" }}>{productName}</p>
          <p style={{ fontSize: ".8rem", color: textMuted, margin: 0, fontWeight: 300, fontFamily: "sans-serif" }}>{productSpecs}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--ep-brand)", whiteSpace: "nowrap" }}>{price}</span>
          {(profile?.book_credits ?? 0) > 0 && (
            <p style={{ fontSize: ".72rem", color: textMuted, margin: ".2rem 0 0", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
              {locale === "fr"
                ? `1 crédit utilisé · reste ${(profile?.book_credits ?? 1) - 1}`
                : `1 credit used · ${(profile?.book_credits ?? 1) - 1} remaining`}
            </p>
          )}
        </div>
      </div>

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.shipping_address}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {fields.slice(0, 2).map(field => (
            <div key={field.key}>
              <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
              <input type="text" autoComplete={field.autocomplete} placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => { setAddress({ ...address, [field.key]: e.target.value }); setAddressErrors(prev => ({ ...prev, [field.key]: false })); }} style={{ ...inputStyle, borderColor: addressErrors[field.key] ? "var(--ep-alert)" : undefined }} />
              {addressErrors[field.key] && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}
            </div>
          ))}
        </div>
        {fields.slice(2).map(field => (
          <div key={field.key}>
            <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
            <input type="text" autoComplete={field.autocomplete} placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => { setAddress({ ...address, [field.key]: e.target.value }); setAddressErrors(prev => ({ ...prev, [field.key]: false })); }} style={{ ...inputStyle, borderColor: addressErrors[field.key] ? "var(--ep-alert)" : undefined }} />
            {addressErrors[field.key] && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}
          </div>
        ))}
        <div>
          <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{t.order.country}</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              autoComplete="off"
              placeholder={locale === "fr" ? "Rechercher un pays…" : "Search country…"}
              value={countrySearch || (address.country ? (COUNTRIES.find(c => c.code === address.country)?.name ?? "") : "")}
              onFocus={() => setCountrySearch("")}
              onChange={e => { setCountrySearch(e.target.value); setAddress({ ...address, country: "" }); }}
              style={inputStyle}
            />
            {countrySearch.trim().length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: isMemorial ? "#1C1410" : "var(--ep-bg-card)",
                border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`,
                borderRadius: 12, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                maxHeight: 200, overflowY: "auto",
              }}>
                {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 ? (
                  <div style={{ padding: ".75rem 1rem", fontSize: ".85rem", color: textMuted, fontFamily: "sans-serif" }}>
                    {locale === "fr" ? "Aucun résultat" : "No results"}
                  </div>
                ) : COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                  <div
                    key={c.code}
                    onMouseDown={() => { setAddress({ ...address, country: c.code }); setCountrySearch(""); setAddressErrors(prev => ({ ...prev, country: false })); }}
                    style={{
                      padding: ".625rem 1rem", fontSize: ".875rem", cursor: "pointer",
                      color: textPrimary, fontFamily: "sans-serif",
                      background: address.country === c.code ? `${accentColor}18` : "transparent",
                      borderBottom: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.05)"}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = address.country === c.code ? `${accentColor}18` : "transparent")}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {addressErrors.country && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif", marginTop: ".25rem", display: "block" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}

      {/* Shipping + price estimate (shown once country selected) */}
      {address.country && (
        <div style={{ marginTop: "1.25rem", background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.18)", borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>
            {t.order.price_total_est}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textPrimary, marginBottom: ".375rem" }}>
            <span>{t.order.price_book}</span>
            <span style={{ fontWeight: 500 }}>{price}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textMuted }}>
            <span>{t.order.estimated_shipping}</span>
            <span>{shippingEstimate ?? t.order.shipping_calculated}</span>
          </div>
        </div>
      )}

      {/* Dedication textarea (Point 7) */}
      <div style={{ marginTop: "1.5rem" }}>
        <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
          {dedicationLabel}
        </label>
        <textarea
          value={dedicationText}
          onChange={e => setDedicationText(e.target.value)}
          maxLength={400}
          rows={4}
          placeholder={dedicationPlaceholder}
          style={{
            ...inputStyle,
            resize: "vertical",
            lineHeight: 1.6,
          }}
        />
        <div style={{ fontSize: ".7rem", color: dedicationText.length >= 360 ? "var(--ep-alert)" : textMuted, textAlign: "right", marginTop: ".25rem", fontFamily: "sans-serif" }}>
          {dedicationText.length}/400
        </div>
      </div>

      <button
        onClick={() => {
          const required = ["firstName", "lastName", "addressLine1", "city", "postCode", "country"];
          const errors: Record<string, boolean> = {};
          required.forEach(k => { if (!address[k as keyof typeof address]) errors[k] = true; });
          if (Object.keys(errors).length > 0) {
            setAddressErrors(errors);
            return;
          }
          setAddressErrors({});
          setStep("confirm");
        }}
        style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: 1 }}
      >
        {t.order.continue_to_payment}
      </button>
    </div>
  );
}

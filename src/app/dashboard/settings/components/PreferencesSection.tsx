import { getTranslations } from "@/lib/i18n";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  t: Translations;
  loading: boolean;
  emailReminders: boolean;
  handleToggleReminders: (newValue: boolean) => void;
  handleResetOnboarding: () => void;
}

export default function PreferencesSection({
  t,
  loading,
  emailReminders,
  handleToggleReminders,
  handleResetOnboarding,
}: Props) {
  return (
    <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.5rem" }}>{t.settings.title}</h2>

      {loading ? (
        <p style={{ color: "#7A5C44", fontSize: ".9rem" }}>{t.dashboard.loading_btn}</p>
      ) : (
        <>
          <div style={{ padding: "1rem 0", borderBottom: "0.5px solid rgba(61,43,31,.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .25rem" }}>{t.settings.weekly_reminders}</p>
                <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.settings.weekly_reminders_desc}</p>
              </div>
              <div
                role="switch"
                aria-checked={emailReminders}
                tabIndex={0}
                onClick={() => handleToggleReminders(!emailReminders)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleToggleReminders(!emailReminders); }}
                style={{ width: 44, height: 24, borderRadius: 100, background: emailReminders ? "#C8813A" : "rgba(61,43,31,.15)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0, marginLeft: "1rem" }}
              >
                <div style={{ position: "absolute", top: 2, left: emailReminders ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#FDFAF5", transition: "left .2s" }} />
              </div>
            </div>
            {emailReminders && (
              <p style={{ fontSize: ".75rem", color: "#C8813A", margin: ".6rem 0 0", fontWeight: 300, fontStyle: "italic" }}>{t.settings.weekly_reminders_info}</p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0" }}>
            <div>
              <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .25rem" }}>{t.settings.onboarding_guide}</p>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.settings.onboarding_guide_desc}</p>
            </div>
            <button onClick={handleResetOnboarding} style={{ background: "transparent", color: "#C8813A", padding: ".4rem 1rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, border: "1.5px solid rgba(200,129,58,.3)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", marginLeft: "1rem" }}>
              {t.settings.reset_guide}
            </button>
          </div>

        </>
      )}
    </div>
  );
}

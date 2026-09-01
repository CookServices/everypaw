import { btnOutline } from "../constants";

interface Props {
  isFR: boolean;
  exportHtmlLoading: boolean;
  handleExportHtml: () => void;
  exportLoading: boolean;
  handleExportData: () => void;
}

export default function DataExportSection({
  isFR,
  exportHtmlLoading,
  handleExportHtml,
  exportLoading,
  handleExportData,
}: Props) {
  return (
    <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>
        {isFR ? "Mes données" : "My data"}
      </h2>
      <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1.25rem", lineHeight: 1.6 }}>
        {isFR
          ? "Téléchargez une copie complète de vos données : profil, animaux, entrées du journal, histoires IA, étapes et configurations de livres."
          : "Download a full copy of your data: profile, pets, journal entries, AI stories, milestones and book configurations."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
        <button
          onClick={handleExportHtml}
          disabled={exportHtmlLoading}
          style={{ ...btnOutline, cursor: exportHtmlLoading ? "wait" : "pointer", opacity: exportHtmlLoading ? .6 : 1 }}
        >
          {exportHtmlLoading
            ? (isFR ? "Préparation…" : "Preparing…")
            : (isFR ? "📄 Télécharger un résumé lisible (HTML)" : "📄 Download a readable summary (HTML)")}
        </button>
        <button
          onClick={handleExportData}
          disabled={exportLoading}
          style={{ ...btnOutline, cursor: exportLoading ? "wait" : "pointer", opacity: exportLoading ? .6 : 1, fontSize: ".8rem", color: "#9A8070" }}
        >
          {exportLoading
            ? (isFR ? "Préparation…" : "Preparing…")
            : (isFR ? "Télécharger les données brutes (JSON)" : "Download raw data (JSON)")}
        </button>
      </div>
    </div>
  );
}

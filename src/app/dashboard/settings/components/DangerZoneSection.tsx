interface Props {
  isFR: boolean;
  onDeleteClick: () => void;
}

export default function DangerZoneSection({ isFR, onDeleteClick }: Props) {
  return (
    <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(163,45,45,.15)", marginBottom: "2rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#A32D2D", marginBottom: ".5rem" }}>
        {isFR ? "Zone dangereuse" : "Danger zone"}
      </h2>
      <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1.25rem" }}>
        {isFR
          ? "Ces actions sont irréversibles. Procédez avec précaution."
          : "These actions are irreversible. Proceed with caution."}
      </p>
      <button
        onClick={onDeleteClick}
        style={{ background: "none", border: "1.5px solid #A32D2D", borderRadius: 100, cursor: "pointer", color: "#A32D2D", fontSize: ".875rem", fontFamily: "inherit", padding: ".6rem 1.25rem", fontWeight: 500, width: "100%", boxSizing: "border-box", textAlign: "center" }}
      >
        {isFR ? "Supprimer mon compte et toutes mes données" : "Delete my account and all my data"}
      </button>
    </div>
  );
}

import { btnOutline, btnPrimary, inputStyle } from "../constants";

interface Props {
  isFR: boolean;
  deleteConfirmText: string;
  deleteError: string;
  deleteLoading: boolean;
  onTextChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({ isFR, deleteConfirmText, deleteError, deleteLoading, onTextChange, onCancel, onConfirm }: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "1rem" }}>
      <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#A32D2D", margin: "0 0 1rem" }}>
          {isFR ? "Supprimer mon compte" : "Delete my account"}
        </h3>
        <p style={{ fontSize: ".875rem", color: "#3D2B1F", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
          {isFR
            ? "Cette action est irréversible. Toutes vos données seront supprimées : profil, animaux, entrées, histoires, photos."
            : "This action is irreversible. All your data will be deleted: profile, pets, entries, stories, photos."}
        </p>
        <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: "0 0 .5rem" }}>
          {isFR ? 'Tapez "SUPPRIMER" pour confirmer' : 'Type "DELETE" to confirm'}
        </p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={e => onTextChange(e.target.value)}
          placeholder={isFR ? "SUPPRIMER" : "DELETE"}
          style={{ ...inputStyle, marginBottom: ".75rem" }}
        />
        {deleteError && (
          <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: "0 0 .75rem" }}>{deleteError}</p>
        )}
        <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ ...btnOutline, border: "1.5px solid rgba(61,43,31,.2)", color: "#3D2B1F" }}
          >
            {isFR ? "Annuler" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleteLoading}
            style={{ ...btnPrimary, background: "#A32D2D", opacity: deleteLoading ? .7 : 1 }}
          >
            {deleteLoading
              ? (isFR ? "Suppression…" : "Deleting…")
              : (isFR ? "Supprimer définitivement" : "Delete permanently")}
          </button>
        </div>
      </div>
    </div>
  );
}

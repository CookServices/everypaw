"use client";

/**
 * PasswordStrength — inline strength indicator
 *
 * Levels (password must be ≥ 8 chars to show anything):
 *   1 — Faible  / Weak   : only 1 character-type class present
 *   2 — Moyen   / Medium : 2 character-type classes present
 *   3 — Fort    / Strong : ≥ 3 character-type classes OR length ≥ 14
 *
 * Character-type classes: lowercase, uppercase, digit, special
 */

interface Props {
  password: string;
  isFR: boolean;
}

function getLevel(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length < 8) return 0;
  const classes = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^a-zA-Z0-9]/.test(pwd),
  ].filter(Boolean).length;
  if (classes >= 3 || pwd.length >= 14) return 3;
  if (classes === 2) return 2;
  return 1;
}

const COLORS: Record<1 | 2 | 3, string> = {
  1: "#A32D2D",   // red   — Faible / Weak
  2: "#C8813A",   // amber — Moyen  / Medium
  3: "#6B7B5E",   // sage  — Fort   / Strong
};

const LABELS_FR: Record<1 | 2 | 3, string> = {
  1: "Faible",
  2: "Moyen",
  3: "Fort",
};

const LABELS_EN: Record<1 | 2 | 3, string> = {
  1: "Weak",
  2: "Medium",
  3: "Strong",
};

export default function PasswordStrength({ password, isFR }: Props) {
  const level = getLevel(password);
  if (level === 0) return null;

  const color = COLORS[level];
  const label = (isFR ? LABELS_FR : LABELS_EN)[level];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: "-.25rem" }}>
      {/* 3 bar segments */}
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {([1, 2, 3] as const).map((i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 100,
              background: level >= i ? color : "rgba(61,43,31,.12)",
              transition: "background .2s",
            }}
          />
        ))}
      </div>
      {/* Label */}
      <span style={{ fontSize: ".72rem", color, fontWeight: 500, whiteSpace: "nowrap", minWidth: 40 }}>
        {label}
      </span>
    </div>
  );
}

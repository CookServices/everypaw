import type { Step } from "../constants";

interface Props {
  step: Step;
  isMemorial: boolean;
  accentColor: string;
  textMuted: string;
  stepLabels: string[];
  onStepClick: (step: Step) => void;
}

const STEPS: Step[] = ["preview", "address", "confirm"];
const STEP_INDEX: Record<Step, number> = { preview: 0, address: 1, confirm: 2, success: 3 };

export default function Stepper({ step, isMemorial, accentColor, textMuted, stepLabels, onStepClick }: Props) {
  const currentIdx = STEP_INDEX[step];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2.5rem" }}>
      {stepLabels.map((label, i) => {
        const clickable = i < currentIdx;
        return (
        <div key={i}
          onClick={() => clickable && onStepClick(STEPS[i])}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: clickable ? "pointer" : "default" }}>
          {/* Connector line left */}
          {i > 0 && (
            <div style={{
              position: "absolute", top: 15, right: "50%", width: "100%", height: 2,
              background: i <= currentIdx ? accentColor : isMemorial ? "rgba(247,242,234,.1)" : "rgba(61,43,31,.12)",
              zIndex: 0,
            }} />
          )}
          {/* Circle */}
          <div style={{
            width: 30, height: 30, borderRadius: "50%", zIndex: 1, position: "relative",
            background: i < currentIdx ? accentColor : i === currentIdx ? accentColor : isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.08)",
            border: i === currentIdx ? `2px solid ${accentColor}` : "2px solid transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: i <= currentIdx ? "var(--ep-bg-card)" : textMuted,
            fontSize: i < currentIdx ? ".85rem" : ".8rem",
            fontWeight: 600, transition: "all .3s",
            boxShadow: clickable ? `0 0 0 3px ${accentColor}22` : "none",
          }}>
            {i < currentIdx ? "✓" : i + 1}
          </div>
          {/* Label */}
          <span style={{
            fontSize: ".7rem", marginTop: ".35rem",
            color: i === currentIdx ? accentColor : i < currentIdx ? accentColor : textMuted,
            fontWeight: i === currentIdx ? 600 : 400,
            textAlign: "center", lineHeight: 1.2,
          }}>
            {label}
          </span>
        </div>
        );
      })}
    </div>
  );
}

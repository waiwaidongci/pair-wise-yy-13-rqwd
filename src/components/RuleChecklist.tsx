import type { ReleaseCheckResult } from "../domain/types";

export function RuleChecklist({ checks }: { checks: ReleaseCheckResult[] }) {
  return (
    <ul className="rule-checklist">
      {checks.map((check) => (
        <li key={check.code} className={check.passed ? "pass" : "fail"}>
          <span className="check-icon" aria-hidden>
            {check.passed ? "✓" : "✕"}
          </span>
          <div>
            <p className="check-label">{check.label}</p>
            <small className="check-detail">{check.detail}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

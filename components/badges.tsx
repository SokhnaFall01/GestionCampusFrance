import {
  DOCUMENT_STATUS_LABELS,
  DocumentStatus,
  PROBABILITY_LABELS,
  ProbabilityLevel,
  STAGE_LABELS,
  Stage,
  DECISION_LABELS,
  Decision,
} from "@/lib/constants";

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const label = STAGE_LABELS[stage as Stage] ?? stage;
  return <Pill className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">{label}</Pill>;
}

export function ProbabilityBadge({
  level,
  score,
}: {
  level: ProbabilityLevel | null | undefined;
  score?: number | null;
}) {
  if (!level) {
    return <Pill className="bg-slate-100 text-slate-500">Non évaluée</Pill>;
  }
  const styles: Record<ProbabilityLevel, string> = {
    ELEVEE: "bg-green-50 text-green-700 ring-1 ring-green-200",
    MOYENNE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    FAIBLE: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  const dot: Record<ProbabilityLevel, string> = {
    ELEVEE: "🟢",
    MOYENNE: "🟡",
    FAIBLE: "🔴",
  };
  return (
    <Pill className={styles[level]}>
      {dot[level]} {PROBABILITY_LABELS[level]}
      {typeof score === "number" ? ` · ${score}/100` : ""}
    </Pill>
  );
}

export function DocStatusBadge({ status }: { status: string }) {
  const label = DOCUMENT_STATUS_LABELS[status as DocumentStatus] ?? status;
  const styles: Record<string, string> = {
    A_FOURNIR: "bg-slate-100 text-slate-600",
    DEPOSE: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    VALIDE: "bg-green-50 text-green-700 ring-1 ring-green-200",
    REFUSE: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return <Pill className={styles[status] ?? "bg-slate-100 text-slate-600"}>{label}</Pill>;
}

export function DecisionBadge({ decision }: { decision: string }) {
  const label = DECISION_LABELS[decision as Decision] ?? decision;
  const styles: Record<string, string> = {
    EN_ATTENTE: "bg-slate-100 text-slate-600",
    ACCEPTE: "bg-green-50 text-green-700 ring-1 ring-green-200",
    REFUSE: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return <Pill className={styles[decision] ?? "bg-slate-100 text-slate-600"}>{label}</Pill>;
}

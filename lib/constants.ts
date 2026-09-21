// Libellés et référentiels métier (en français) partagés dans toute l'app.
//
// Les ÉTAPES et les TYPES DE DOCUMENTS ne sont plus figés ici : ils sont
// stockés en base (tables Stage et DocumentType) et gérés par l'accompagnatrice
// depuis la page « Paramètres ». Les valeurs par défaut sont créées par le seed
// (prisma/seed.ts).

export const DOCUMENT_STATUSES = ["A_FOURNIR", "DEPOSE", "VALIDE", "REFUSE"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  A_FOURNIR: "À fournir",
  DEPOSE: "Déposé",
  VALIDE: "Validé",
  REFUSE: "Refusé",
};

// --- Niveaux de français ---
export const FRENCH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type FrenchLevel = (typeof FRENCH_LEVELS)[number];

// --- Sélectivité de la formation visée ---
export const SELECTIVITY_LEVELS = ["FAIBLE", "MOYENNE", "ELEVEE", "TRES_ELEVEE"] as const;
export type SelectivityLevel = (typeof SELECTIVITY_LEVELS)[number];

export const SELECTIVITY_LABELS: Record<SelectivityLevel, string> = {
  FAIBLE: "Faible",
  MOYENNE: "Moyenne",
  ELEVEE: "Élevée",
  TRES_ELEVEE: "Très élevée",
};

// --- Mentions au Bac ---
export const MENTIONS = ["PASSABLE", "ASSEZ_BIEN", "BIEN", "TRES_BIEN"] as const;
export type Mention = (typeof MENTIONS)[number];

export const MENTION_LABELS: Record<Mention, string> = {
  PASSABLE: "Passable",
  ASSEZ_BIEN: "Assez bien",
  BIEN: "Bien",
  TRES_BIEN: "Très bien",
};

// --- Décision de l'accompagnateur ---
export const DECISIONS = ["EN_ATTENTE", "ACCEPTE", "REFUSE"] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABELS: Record<Decision, string> = {
  EN_ATTENTE: "En attente",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
};

// --- Niveaux de probabilité ---
export type ProbabilityLevel = "ELEVEE" | "MOYENNE" | "FAIBLE";

export const PROBABILITY_LABELS: Record<ProbabilityLevel, string> = {
  ELEVEE: "Élevée",
  MOYENNE: "Moyenne",
  FAIBLE: "Faible",
};

// Nombre maximum d'apprenants suivis par an.
export const MAX_CANDIDATES = 10;

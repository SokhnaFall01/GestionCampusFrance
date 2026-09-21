// Libellés et référentiels métier (en français) partagés dans toute l'app.

// --- Étapes de la procédure Campus France ---
export const STAGES = [
  "PREMIER_CONTACT",
  "CONSTITUTION_DOSSIER",
  "EVALUATION",
  "TEST_LANGUE",
  "CHOIX_FORMATIONS",
  "SOUMISSION_EEF",
  "ENTRETIEN",
  "REPONSES",
  "VISA",
  "DEPART",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  PREMIER_CONTACT: "Premier contact",
  CONSTITUTION_DOSSIER: "Constitution du dossier",
  EVALUATION: "Évaluation & probabilité",
  TEST_LANGUE: "Test de langue (TCF/DELF)",
  CHOIX_FORMATIONS: "Choix des formations",
  SOUMISSION_EEF: "Soumission « Études en France »",
  ENTRETIEN: "Entretien Campus France",
  REPONSES: "Réponses des établissements",
  VISA: "Demande de visa",
  DEPART: "Départ",
};

// --- Documents attendus ---
export const DOCUMENT_TYPES = [
  "PIECE_IDENTITE",
  "DIPLOME_BAC",
  "RELEVES_BAC",
  "RELEVES_POSTBAC",
  "DIPLOMES_POSTBAC",
  "CV",
  "LETTRE_MOTIVATION",
  "ATTESTATION_LANGUE",
  "JUSTIF_FINANCIERS",
  "PHOTO",
  "ACTE_NAISSANCE",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  PIECE_IDENTITE: "Pièce d'identité / Passeport",
  DIPLOME_BAC: "Diplôme du Baccalauréat",
  RELEVES_BAC: "Relevés de notes du Bac",
  RELEVES_POSTBAC: "Relevés de notes post-Bac",
  DIPLOMES_POSTBAC: "Diplômes / attestations post-Bac",
  CV: "CV",
  LETTRE_MOTIVATION: "Lettre de motivation",
  ATTESTATION_LANGUE: "Attestation de langue (TCF/DELF)",
  JUSTIF_FINANCIERS: "Justificatifs financiers",
  PHOTO: "Photo d'identité",
  ACTE_NAISSANCE: "Acte de naissance",
};

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

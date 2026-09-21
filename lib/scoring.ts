// Calcul de la probabilité d'admission à partir de 4 critères pondérés.
// Les poids demandés (normalisés à 100) :
//   Moyenne / mentions (Bac + post-bac) ... 31 %
//   Niveau de français (TCF/DELF) ......... 25 %
//   Cohérence parcours <-> formation ...... 25 %
//   Sélectivité de la formation choisie ... 19 %
//
// Chaque critère est ramené à une note /100 ; le score final est la moyenne
// pondérée des critères RENSEIGNÉS (les critères manquants sont ignorés et
// les poids re-normalisés), pour rester exploitable même sur un dossier
// incomplet.

import type { FrenchLevel, Mention, ProbabilityLevel, SelectivityLevel } from "./constants";

export const SCORE_WEIGHTS = {
  MOYENNE: 31,
  FRANCAIS: 25,
  COHERENCE: 25,
  SELECTIVITE: 19,
} as const;

const FRENCH_LEVEL_SCORES: Record<FrenchLevel, number> = {
  A1: 15,
  A2: 30,
  B1: 55,
  B2: 80,
  C1: 92,
  C2: 100,
};

const MENTION_SCORES: Record<Mention, number> = {
  PASSABLE: 55,
  ASSEZ_BIEN: 68,
  BIEN: 80,
  TRES_BIEN: 92,
};

// Plus une formation est sélective, plus la probabilité d'être accepté baisse.
const SELECTIVITY_SCORES: Record<SelectivityLevel, number> = {
  FAIBLE: 100,
  MOYENNE: 70,
  ELEVEE: 40,
  TRES_ELEVEE: 20,
};

export interface ScoringInput {
  bacAverage?: number | null; // /20
  postBacAverage?: number | null; // /20
  bacMention?: Mention | null;
  frenchLevel?: FrenchLevel | null;
  coherenceRating?: number | null; // 0-100
  selectivityLevel?: SelectivityLevel | null;
}

export interface CriterionResult {
  key: keyof typeof SCORE_WEIGHTS;
  label: string;
  weight: number;
  subscore: number | null; // /100, null si non renseigné
}

export interface ScoringResult {
  score: number | null; // /100
  level: ProbabilityLevel | null;
  criteria: CriterionResult[];
  completeness: number; // part des critères renseignés, 0-100
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function moyenneSubscore(input: ScoringInput): number | null {
  const values: number[] = [];
  if (typeof input.bacAverage === "number") values.push(clamp((input.bacAverage / 20) * 100));
  if (typeof input.postBacAverage === "number")
    values.push(clamp((input.postBacAverage / 20) * 100));
  if (values.length === 0 && input.bacMention) values.push(MENTION_SCORES[input.bacMention]);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function computeProbability(input: ScoringInput): ScoringResult {
  const criteria: CriterionResult[] = [
    {
      key: "MOYENNE",
      label: "Moyenne / mentions (Bac + post-bac)",
      weight: SCORE_WEIGHTS.MOYENNE,
      subscore: moyenneSubscore(input),
    },
    {
      key: "FRANCAIS",
      label: "Niveau de français (TCF/DELF)",
      weight: SCORE_WEIGHTS.FRANCAIS,
      subscore: input.frenchLevel ? FRENCH_LEVEL_SCORES[input.frenchLevel] : null,
    },
    {
      key: "COHERENCE",
      label: "Cohérence parcours ↔ formation visée",
      weight: SCORE_WEIGHTS.COHERENCE,
      subscore:
        typeof input.coherenceRating === "number" ? clamp(input.coherenceRating) : null,
    },
    {
      key: "SELECTIVITE",
      label: "Sélectivité de la formation choisie",
      weight: SCORE_WEIGHTS.SELECTIVITE,
      subscore: input.selectivityLevel ? SELECTIVITY_SCORES[input.selectivityLevel] : null,
    },
  ];

  const provided = criteria.filter((c) => c.subscore !== null);
  const totalWeightAll = criteria.reduce((a, c) => a + c.weight, 0);

  if (provided.length === 0) {
    return { score: null, level: null, criteria, completeness: 0 };
  }

  const totalWeight = provided.reduce((a, c) => a + c.weight, 0);
  const weighted = provided.reduce((a, c) => a + c.weight * (c.subscore as number), 0);
  const score = Math.round(weighted / totalWeight);

  const level: ProbabilityLevel = score >= 70 ? "ELEVEE" : score >= 40 ? "MOYENNE" : "FAIBLE";
  const completeness = Math.round((totalWeight / totalWeightAll) * 100);

  return { score, level, criteria, completeness };
}

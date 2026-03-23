export type LiteracyCategory =
  | "budgeting"
  | "saving"
  | "credit"
  | "loans"
  | "investing"
  | "fraud_prevention";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface LiteracyResource {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: LiteracyCategory;
  difficulty: DifficultyLevel;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

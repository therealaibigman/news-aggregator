export type RankInput = {
  title: string;
  summary?: string;
  url: string;
};

// Placeholder: start with neutral score.
// Next: replace with embeddings + logistic regression, or an LLM scorer.
export async function scoreInterest(_input: RankInput): Promise<number> {
  return 0;
}

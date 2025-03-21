export interface SpellCheckDiff {
  original: string;
  suggestion: string;
  start: number;
  end: number;
  reason: string;
}

export interface SpellCheckResponse {
  diffs: SpellCheckDiff[];
  correctedText: string;
}
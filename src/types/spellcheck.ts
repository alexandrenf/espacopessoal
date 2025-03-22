export interface SpellCheckDiff {
    id: string;
    original: string;
    suggestion: string;
    start: number;
    end: number;
    reason: string;
  }
  
  export interface SpellCheckResponse {
    diffs: Omit<SpellCheckDiff, 'id'>[];  // Backend response won't include IDs
    correctedText: string;
  }
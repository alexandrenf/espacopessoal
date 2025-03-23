import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `
      Act as a professional proofreader. Analyze the following text for spelling, grammar, and style issues.
      Respond ONLY with a JSON object in this exact format, with no other text or markdown:
      {
        "diffs": [
          {
            "original": "incorrect text",
            "suggestion": "corrected text",
            "reason": "explanation"
          }
        ]
      }

      Important rules:
      1. The response must be valid JSON with no markdown formatting, code blocks, or additional text.
      2. If there are no issues, return an empty diffs array.
      3. Never include diffs where the original and suggestion are identical.
      4. Each suggestion must be different from its original text.
      5. Break down corrections into the smallest meaningful units:
         - Correct individual words separately
         - For phrases that need to be corrected together, split them into individual words or small groups of words (up to three words)
         - Do not include entire sentences in a single diff unless absolutely necessary
      6. Focus on one issue per diff:
         - Spelling errors
         - Grammar mistakes
         - Word choice improvements
         - Punctuation fixes
      7. Provide clear, concise reasons for each correction in the language of the text.
    `;

    const result = await model.generateContent([prompt, text]);
    const response = result.response;

    // Clean the response text to ensure it's valid JSON
    const cleanedResponse = response
      .text()
      .replace(/```json\n?|\n?```/g, "")
      .trim();

    interface SpellCheckResult {
      diffs: Array<{
        original: string;
        suggestion: string;
        reason: string;
        start?: number;
        end?: number;
      }>;
    }

    const spellCheckResults = JSON.parse(cleanedResponse) as SpellCheckResult;

    // Filter out diffs where original and suggestion are identical
    // or where the only change is case (either full or partial)
    spellCheckResults.diffs = spellCheckResults.diffs.filter((diff) => {
      // Skip if original and suggestion are identical
      if (diff.original === diff.suggestion) return false;
      
      // Skip if the only difference is case (full or partial)
      const normalizedOriginal = diff.original.toLowerCase();
      const normalizedSuggestion = diff.suggestion.toLowerCase();
      if (normalizedOriginal === normalizedSuggestion) return false;
      
      return true;
    });

    // Compute start and end indices for each diff based on the original text.
    // Using an inclusive end index ensures that spaces are not inadvertently trimmed.
    let searchStartIndex = 0;
    spellCheckResults.diffs.forEach((diff) => {
      const index = text.indexOf(diff.original, searchStartIndex);
      if (index !== -1) {
        diff.start = index;
        // Set end as inclusive index: last character of the original text
        diff.end = index + diff.original.length - 1;
        searchStartIndex = index + diff.original.length;
      } else {
        diff.start = -1;
        diff.end = -1;
      }
    });

    return Response.json(spellCheckResults);
  } catch (error) {
    console.error("Spell check API error:", error);
    return Response.json(
      { error: "Spell check failed", diffs: [] },
      { status: 500 },
    );
  }
}

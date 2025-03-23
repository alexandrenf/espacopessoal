import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `
      Act as a professional proofreader. Carefully review the following text for **spelling**, **grammar**, **punctuation**, **capitalization**, **clarity**, **conciseness**, and **style consistency**. Pay attention to common writing issues, such as:
- Repeated or redundant words
- Passive voice (when unnecessary)
- Awkward or unclear phrasing
- Tone inconsistencies

Only correct **genuine issues**. Do **not** suggest changes to:
- Text that is **entirely in ALL CAPS** unless it contains typos or incorrect punctuation
- Words or phrases that are already correct, even if subjective improvements are possible
- Formatting or sentence structure if it is already clear and grammatically correct

Respond **only** with a JSON object in this exact format:

{
  "diffs": [
    {
      "original": "incorrect text",
      "suggestion": "corrected text",
      "reason": "short explanation of the correction"
    }
  ],
  "correctedText": "the full corrected text, with all suggested edits applied"
}

Strict rules:
1. Your response must be valid JSON, with no markdown formatting, code blocks, or explanatory text outside the object.
2. If there are no errors or suggested changes, return an empty diffs array.
3. Do **not** include any diffs where the original and suggestion values are **identical**.
4. Ensure all suggestions differ from the original, and each correction must have a clear and justified reason.
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
      correctedText: string;
    }

    const spellCheckResults = JSON.parse(cleanedResponse) as SpellCheckResult;

    // Filter out diffs where original and suggestion are identical
    spellCheckResults.diffs = spellCheckResults.diffs.filter(
      (diff) => diff.original !== diff.suggestion,
    );

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
      { error: "Spell check failed", diffs: [], correctedText: "" },
      { status: 500 },
    );
  }
}

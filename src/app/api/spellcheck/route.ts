import { OpenAI } from "openai";
import { type NextRequest } from "next/server";
import { env } from "~/env"; // Assuming this correctly loads env vars in edge

// --- CHANGE: Export runtime configuration ---
// This tells Next.js to deploy this function to the Edge runtime
// instead of the default Node.js Serverless runtime.
export const runtime = "edge";

// Optional: Specify preferred region for lower latency if your users/API are concentrated
// export const preferredRegion = 'iad1'; // Example: US East (Washington D.C.)

// --- The rest of your code remains largely the same ---

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY, // Ensure this env var is available to Edge Functions in Vercel
  defaultHeaders: {
    "X-Title": "Espaço Pessoal", // Replace with your app name if desired
  },
});

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };

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

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324:free", // Consider if this model is fast enough even on Edge
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error("No response from OpenRouter API");
    }

    // Attempt to clean potential markdown fences, though the prompt forbids them
    const cleanedResponse = completion.choices[0].message.content
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

    let spellCheckResults: SpellCheckResult;
    try {
      // Ensure the response is parsed correctly
      spellCheckResults = JSON.parse(cleanedResponse) as SpellCheckResult;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.error("Raw response received:", cleanedResponse);
      throw new Error("Invalid JSON response from AI");
    }

    // Ensure diffs array exists before filtering and processing
    if (!Array.isArray(spellCheckResults.diffs)) {
       console.warn("AI response did not contain a valid 'diffs' array. Raw response:", cleanedResponse);
       spellCheckResults.diffs = []; // Default to empty array if missing or invalid
    }

    // Filter out diffs where original and suggestion are identical
    // or where the only change is case (either full or partial)
    spellCheckResults.diffs = spellCheckResults.diffs.filter((diff) => {
      // Basic validation of diff content
      if (typeof diff.original !== 'string' || typeof diff.suggestion !== 'string') {
        console.warn("Skipping invalid diff item:", diff);
        return false;
      }
      // Skip if original and suggestion are identical
      if (diff.original === diff.suggestion) return false;
      // Skip if the only difference is case (full or partial)
      const normalizedOriginal = diff.original.toLowerCase();
      const normalizedSuggestion = diff.suggestion.toLowerCase();
      if (normalizedOriginal === normalizedSuggestion) return false;
      return true;
    });

    // Compute start and end indices for each diff based on the original text.
    let searchStartIndex = 0;
    spellCheckResults.diffs.forEach((diff) => {
      // Ensure original is valid before searching
      if (typeof diff.original === 'string' && diff.original.length > 0) {
          const index = text.indexOf(diff.original, searchStartIndex);
          if (index !== -1) {
            diff.start = index;
            // Set end as inclusive index: last character of the original text
            diff.end = index + diff.original.length - 1;
            // Advance search index past the found occurrence to avoid re-matching the same segment
            searchStartIndex = index + diff.original.length;
          } else {
            // Original text segment not found in the source text (could happen if AI modifies it slightly)
            console.warn(`Could not find original text "${diff.original}" in source text starting from index ${searchStartIndex}`);
            diff.start = -1;
            diff.end = -1;
            // Decide how to handle searchStartIndex: keep it, or advance?
            // Keeping it might find later occurrences if AI returns out of order.
            // Advancing might skip valid matches if AI slightly changed the text.
            // Let's keep it simple and not advance if not found.
          }
      } else {
         // Invalid original text in diff object
         diff.start = -1;
         diff.end = -1;
      }
    });

    return Response.json(spellCheckResults);
  } catch (error) {
    console.error("Edge Function Spell check API error:", error);
    // Provide a more informative error message if possible
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json(
      { error: `Spell check failed: ${errorMessage}`, diffs: [] },
      { status: 500 },
    );
  }
}

import { OpenAI } from "npm:openai@4.28.0";

// Define the interface for spellcheck results
interface SpellCheckResult {
  diffs: Array<{
    original: string;
    suggestion: string;
    reason: string;
    start?: number;
    end?: number;
  }>;
}

// Initialize OpenAI client with OpenRouter configuration
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get("OPENROUTER_API_KEY") || "",
  defaultHeaders: {
    "X-Title": "Espaço Pessoal",
  },
});

export async function handler(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log(
    `[${new Date().toISOString()}] ${requestId} - Processing spellcheck request`,
  );

  // Set CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*", // Allow requests from any origin
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // Cache preflight requests for 24 hours
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
  });

  // Handle OPTIONS requests for CORS
  if (req.method === "OPTIONS") {
    console.log(
      `[${new Date().toISOString()}] ${requestId} - Handling OPTIONS request`,
    );
    return new Response(null, {
      status: 204, // No content
      headers,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    console.warn(
      `[${new Date().toISOString()}] ${requestId} - Method not allowed: ${req.method}`,
    );
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    // Parse request body
    const { text } = (await req.json()) as { text: string };

    if (!text || typeof text !== "string") {
      console.warn(
        `[${new Date().toISOString()}] ${requestId} - Invalid request: missing or invalid text`,
      );
      return new Response(
        JSON.stringify({ error: "Invalid request: missing or invalid text" }),
        {
          status: 400,
          headers,
        },
      );
    }

    console.log(
      `[${new Date().toISOString()}] ${requestId} - Sending request to OpenRouter API`,
    );

    // Define the prompt for the AI
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

    // Call the OpenRouter API
    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324:free",
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

    // Clean the response
    const cleanedResponse = completion.choices[0].message.content
      .replace(/```json\n?|\n?```/g, "")
      .trim();

    // Parse the response
    let spellCheckResults: SpellCheckResult;
    try {
      spellCheckResults = JSON.parse(cleanedResponse) as SpellCheckResult;
    } catch (parseError) {
      console.error(
        `[${new Date().toISOString()}] ${requestId} - Failed to parse JSON response:`,
        parseError,
      );
      console.error(
        `[${new Date().toISOString()}] ${requestId} - Raw response received:`,
        cleanedResponse,
      );
      throw new Error("Invalid JSON response from AI");
    }

    // Ensure diffs array exists
    if (!Array.isArray(spellCheckResults.diffs)) {
      console.warn(
        `[${new Date().toISOString()}] ${requestId} - AI response did not contain a valid 'diffs' array. Raw response:`,
        cleanedResponse,
      );
      spellCheckResults.diffs = []; // Default to empty array if missing or invalid
    }

    // Filter out invalid diffs
    spellCheckResults.diffs = spellCheckResults.diffs.filter((diff) => {
      // Basic validation of diff content
      if (
        typeof diff.original !== "string" ||
        typeof diff.suggestion !== "string"
      ) {
        console.warn(
          `[${new Date().toISOString()}] ${requestId} - Skipping invalid diff item:`,
          diff,
        );
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

    // Compute start and end indices for each diff
    let searchStartIndex = 0;
    spellCheckResults.diffs.forEach((diff) => {
      // Ensure original is valid before searching
      if (typeof diff.original === "string" && diff.original.length > 0) {
        const index = text.indexOf(diff.original, searchStartIndex);
        if (index !== -1) {
          diff.start = index;
          // Set end as inclusive index: last character of the original text
          diff.end = index + diff.original.length - 1;
          // Advance search index past the found occurrence to avoid re-matching the same segment
          searchStartIndex = index + diff.original.length;
        } else {
          // Original text segment not found in the source text
          console.warn(
            `[${new Date().toISOString()}] ${requestId} - Could not find original text "${diff.original}" in source text starting from index ${searchStartIndex}`,
          );
          diff.start = -1;
          diff.end = -1;
        }
      } else {
        // Invalid original text in diff object
        diff.start = -1;
        diff.end = -1;
      }
    });

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ${requestId} - Spellcheck completed in ${duration}ms with ${spellCheckResults.diffs.length} diffs`,
    );

    return new Response(JSON.stringify(spellCheckResults), {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ${requestId} - Spellcheck error:`,
      error,
    );
    // Provide a more informative error message if possible
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: `Spell check failed: ${errorMessage}`,
        diffs: [],
      }),
      { status: 500, headers },
    );
  }
}

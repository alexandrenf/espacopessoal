import { GoogleGenerativeAI } from '@google/generative-ai';
import { type NextRequest } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json() as { text: string };
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

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
        ],
        "correctedText": "full corrected text"
      }

      The response must be valid JSON with no markdown formatting, code blocks, or additional text.
      If there are no issues, return an empty diffs array.
    `;

    const result = await model.generateContent([prompt, text]);
    const response = result.response;
    
    // Clean the response text to ensure it's valid JSON
    const cleanedResponse = response.text().replace(/```json\n?|\n?```/g, '').trim();
    
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

    // Compute start and end indices for each diff based on the original text.
    // Using an inclusive end index ensures that spaces are not inadvertently trimmed.
    let searchStartIndex = 0;
    spellCheckResults.diffs.forEach(diff => {
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
    console.error('Spell check API error:', error);
    return Response.json({ error: 'Spell check failed', diffs: [], correctedText: '' }, { status: 500 });
  }
}
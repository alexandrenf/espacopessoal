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
            "start": number,
            "end": number,
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
        start: number;
        end: number;
        reason: string;
      }>;
      correctedText: string;
    }

    const spellCheckResults = JSON.parse(cleanedResponse) as SpellCheckResult;

    return Response.json(spellCheckResults);
  } catch (error) {
    console.error('Spell check API error:', error);
    return Response.json({ error: 'Spell check failed', diffs: [], correctedText: '' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Convert audio to base64 for Gemini
        const buffer = Buffer.from(await audioFile.arrayBuffer());
        const base64Audio = buffer.toString('base64');

        // Use Gemini 2.0 Flash (free tier)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp" // Free tier model
        });

        // Step 1: Transcribe audio using Gemini
        const transcriptionPrompt = `
      Please transcribe the following audio file accurately.
      The audio is in WAV format encoded as base64.
      Return only the transcribed text, nothing else.
    `;

        const transcriptionResult = await model.generateContent([
            transcriptionPrompt,
            {
                inlineData: {
                    mimeType: "audio/wav",
                    data: base64Audio
                }
            }
        ]);

        const transcript = transcriptionResult.response.text() || '';

        // Step 2: Extract keywords from transcript
        const keywordPrompt = `
      Extract the most important keywords or key phrases from the following text.
      Return ONLY a JSON array of keywords.
      Example: ["pizza", "hungry", "order"]
      Keep it to 3-5 most important keywords.
      Text: "${transcript}"
    `;

        const keywordResult = await model.generateContent(keywordPrompt);
        const keywordText = keywordResult.response.text();

        // Parse keywords
        let keywords: string[] = [];
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(keywordText);
            keywords = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            // If JSON parsing fails, try to extract from text
            const matches = keywordText.match(/\[(.*?)\]/);
            if (matches) {
                try {
                    keywords = JSON.parse(matches[0]);
                } catch (e2) {
                    keywords = extractKeywordsFallback(transcript);
                }
            } else {
                keywords = extractKeywordsFallback(transcript);
            }
        }

        return NextResponse.json({
            transcript: transcript || 'Could not transcribe audio',
            keywords: keywords.slice(0, 5),
        });

    } catch (error) {
        console.error('Error processing with Gemini:', error);
        return NextResponse.json(
            {
                error: 'Failed to process speech with Gemini',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Fallback keyword extraction
function extractKeywordsFallback(text: string): string[] {
    // Remove punctuation and split into words
    const words = text.toLowerCase()
        .replace(/[.,!?;:()"']/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);

    // Common stop words
    const stopWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
        'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
        'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
        'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
        'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
        'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
        'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
        'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
        'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
        'give', 'day', 'most', 'us'
    ]);

    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
        if (!stopWords.has(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    });

    // Sort by frequency and get top 5
    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}
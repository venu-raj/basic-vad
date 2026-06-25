import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        // Log the start of processing
        console.log('Starting speech processing with Gemini...');

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            console.error('No audio file provided');
            return NextResponse.json(
                { error: 'No audio file provided. Please speak and try again.' },
                { status: 400 }
            );
        }

        console.log(`Audio file received: ${audioFile.name}, size: ${audioFile.size} bytes`);

        // Check API key
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set');
            return NextResponse.json(
                { error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.' },
                { status: 500 }
            );
        }

        // Convert audio to base64 for Gemini
        let buffer: Buffer;
        let base64Audio: string;
        try {
            buffer = Buffer.from(await audioFile.arrayBuffer());
            base64Audio = buffer.toString('base64');
            console.log(`Audio converted to base64, length: ${base64Audio.length}`);
        } catch (error) {
            console.error('Error converting audio:', error);
            return NextResponse.json(
                { error: `Failed to convert audio: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 500 }
            );
        }

        // Use Gemini model
        let model;
        try {
            model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp"
            });
            console.log('Gemini model initialized');
        } catch (error) {
            console.error('Error initializing Gemini model:', error);
            return NextResponse.json(
                { error: `Failed to initialize Gemini model: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 500 }
            );
        }

        // Step 1: Transcribe audio using Gemini
        let transcript = '';
        try {
            console.log('Sending transcription request to Gemini...');
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

            transcript = transcriptionResult.response.text() || '';
            console.log(`Transcription received: "${transcript}"`);

            if (!transcript) {
                console.warn('Empty transcript received');
                return NextResponse.json({
                    transcript: 'Could not transcribe audio (empty response)',
                    keywords: [],
                });
            }
        } catch (error) {
            console.error('Transcription error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for specific Gemini errors
            if (errorMessage.includes('API key')) {
                return NextResponse.json(
                    { error: 'Invalid Gemini API key. Please check your API key configuration.' },
                    { status: 401 }
                );
            } else if (errorMessage.includes('rate limit')) {
                return NextResponse.json(
                    { error: 'Gemini API rate limit exceeded. Please wait a moment and try again.' },
                    { status: 429 }
                );
            } else if (errorMessage.includes('quota')) {
                return NextResponse.json(
                    { error: 'Gemini API quota exceeded. Please check your usage limits.' },
                    { status: 429 }
                );
            } else {
                return NextResponse.json(
                    { error: `Transcription failed: ${errorMessage}` },
                    { status: 500 }
                );
            }
        }

        // Step 2: Extract keywords from transcript
        let keywords: string[] = [];
        try {
            console.log('Extracting keywords from transcript...');
            const keywordPrompt = `
        Extract the most important keywords or key phrases from the following text.
        Return ONLY a JSON array of keywords.
        Example: ["pizza", "hungry", "order"]
        Keep it to 3-5 most important keywords.
        Text: "${transcript}"
      `;

            const keywordResult = await model.generateContent(keywordPrompt);
            const keywordText = keywordResult.response.text();
            console.log(`Keyword extraction response: "${keywordText}"`);

            // Parse keywords
            try {
                // Try to parse as JSON
                const parsed = JSON.parse(keywordText);
                keywords = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.warn('Failed to parse keywords as JSON, trying to extract from text');
                // If JSON parsing fails, try to extract from text
                const matches = keywordText.match(/\[(.*?)\]/);
                if (matches) {
                    try {
                        keywords = JSON.parse(matches[0]);
                    } catch (e2) {
                        console.warn('Failed to extract keywords from text, using fallback');
                        keywords = extractKeywordsFallback(transcript);
                    }
                } else {
                    console.warn('No keyword array found, using fallback');
                    keywords = extractKeywordsFallback(transcript);
                }
            }
        } catch (error) {
            console.error('Keyword extraction error:', error);
            // Fallback to simple keyword extraction
            keywords = extractKeywordsFallback(transcript);
        }

        console.log(`Successfully processed: transcript length ${transcript.length}, keywords: ${keywords.join(', ')}`);

        return NextResponse.json({
            transcript: transcript || 'Could not transcribe audio',
            keywords: keywords.slice(0, 5),
        });

    } catch (error) {
        console.error('Unexpected error in route handler:', error);
        return NextResponse.json(
            {
                error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: error instanceof Error ? error.stack : undefined
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
        if (!stopWords.has(word) && word.length > 2) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    });

    // Sort by frequency and get top 5
    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}
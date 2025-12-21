import { NextRequest, NextResponse } from 'next/server';

// Cache for transliterations to avoid repeated API calls
const transliterationCache = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = transliterationCache.get(text);
    if (cached) {
      return NextResponse.json({ roman: cached });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      // If no API key, return original text
      return NextResponse.json({ roman: text });
    }

    // Use OpenAI to transliterate
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a transliteration assistant. Convert Urdu text (Arabic script) to Roman Urdu (Latin script).
            
Rules:
- Keep English words as-is
- Use common Roman Urdu spellings
- Preserve punctuation and formatting
- Only output the transliterated text, nothing else
- If the text is already in Roman/English, return it as-is

Examples:
- "کیا حال ہے" → "kya haal hai"
- "میرا نام احمد ہے" → "mera naam Ahmad hai"
- "Hello, آپ کیسے ہیں?" → "Hello, aap kaise hain?"
- "بل بہت زیادہ آیا ہے" → "bill bohat zyada aaya hai"`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI transliteration error:', response.status);
      return NextResponse.json({ roman: text });
    }

    const data = await response.json();
    const romanText = data.choices?.[0]?.message?.content?.trim() || text;

    // Cache the result
    transliterationCache.set(text, romanText);

    // Limit cache size
    if (transliterationCache.size > 1000) {
      const firstKey = transliterationCache.keys().next().value;
      if (firstKey) transliterationCache.delete(firstKey);
    }

    return NextResponse.json({ roman: romanText });

  } catch (error) {
    console.error('Transliteration error:', error);
    return NextResponse.json(
      { error: 'Transliteration failed', roman: '' },
      { status: 500 }
    );
  }
}
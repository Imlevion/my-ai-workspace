import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key Groq diperlukan' }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal terhubung ke Groq API' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
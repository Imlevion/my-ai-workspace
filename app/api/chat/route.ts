import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API Key belum dimasukkan.' },
        { status: 400 }
      );
    }

    // Call Groq API Cloud
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal terhubung ke API Groq' },
        { status: response.status }
      );
    }

    const reply = data.choices[0]?.message?.content || 'Tidak ada respon.';

    return NextResponse.json({ message: reply });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server Error' },
      { status: 500 }
    );
  }
}
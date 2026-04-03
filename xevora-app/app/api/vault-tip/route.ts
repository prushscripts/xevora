import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      gross?: number;
      ytd?: number;
      percentage?: number;
      amount?: number;
      state?: string;
    };

    const gross = Number(body.gross) || 0;
    const ytd = Number(body.ytd) || 0;
    const pct = Number(body.percentage) || 0;
    const amount = Number(body.amount) || 0;
    const state = typeof body.state === "string" ? body.state : "";

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json(
        { tip: "Set ANTHROPIC_API_KEY to enable personalized tax tips." },
        { status: 200 },
      );
    }

    const prompt = `A 1099 contractor earned $${gross.toFixed(2)} this pay period. YTD gross: $${ytd.toFixed(2)}. They set aside ${pct}% ($${amount.toFixed(2)}) for taxes${state ? ` in ${state}` : ""}. Write 2 sentences of specific, encouraging tax savings advice. No disclaimers. Be direct and helpful.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ tip: "Tip unavailable right now.", error: errText }, { status: 502 });
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    return NextResponse.json({ tip: text || "Keep building your tax cushion consistently." });
  } catch {
    return NextResponse.json({ tip: "Something went wrong." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { voice } = await req.json();

  const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: voice || "alloy",
      modalities: ["audio"],
      input_audio_format: "wav",
      output_audio_format: "wav",
    }),
  });

  const data = await resp.json();
  const signalUrl = data.client_secret?.value || "";
  return NextResponse.json({ signalUrl });
}

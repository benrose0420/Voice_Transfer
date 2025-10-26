import { NextRequest, NextResponse } from "next/server";

// This route acts as a proxy between your browser and OpenAI's Realtime API
export async function POST(req: NextRequest) {
  const offer = await req.text(); // Browser sends SDP offer

  const response = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/sdp",
    },
    body: offer,
  });

  const answer = await response.text();

  return new NextResponse(answer, {
    headers: { "Content-Type": "application/sdp" },
  });
}

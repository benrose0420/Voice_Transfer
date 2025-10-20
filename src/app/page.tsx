"use client";
import React, { useEffect, useRef, useState } from "react";

export default function Home() {
  const localRef = useRef<HTMLAudioElement>(null);
  const remoteRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [voice, setVoice] = useState("alloy");

  const log = (msg: string) => setLogs((l) => [...l, msg]);

  const start = async () => {
    try { 
      setStatus("starting");
      log("Getting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (localRef.current) {
        localRef.current.srcObject = stream;
        localRef.current.muted = true;
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Play remote track
      pc.ontrack = (e) => {
        if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
      };

      // Add local audio
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      log("Requesting session from backend...");
      const r = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice }),
      });
      const { signalUrl } = await r.json();

      // Create offer and send to OpenAI Realtime endpoint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      log("Sending SDP offer...");
      const answerResp = await fetch(signalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      const answerSdp = await answerResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("running");
      log("Realtime voice transformer active.");
    } catch (e: any) {
      console.error(e);
      log("Error: " + e.message);
      setStatus("error");
    }
  };

  const stop = async () => {
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    pcRef.current = null;
    streamRef.current = null;
    setStatus("idle");
    log("Stopped.");
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Realtime Voice Transformer</h1>

      <div className="mb-4">
        <label className="block text-sm mb-1">Voice preset:</label>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="alloy">Alloy (male, default)</option>
          <option value="verse">Verse (clear)</option>
          <option value="warm">Warm</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={start}
          disabled={status === "running"}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={status === "idle"}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Stop
        </button>
        <span className="ml-auto text-sm">Status: {status}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Local (mic)</p>
          <audio ref={localRef} autoPlay controls={false}></audio>
        </div>
        <div>
          <p className="text-sm font-medium">Transformed voice</p>
          <audio ref={remoteRef} autoPlay controls></audio>
        </div>
      </div>

      <div className="mt-4 border p-3 h-40 overflow-auto text-xs bg-gray-50">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </main>
  );
}

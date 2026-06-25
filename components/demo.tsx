"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import { useState } from "react";

export const Demo = () => {
  const [audioList, setAudioList] = useState<string[]>([]);
  const vad = useMicVAD({
    model: "v5",
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(wavBuffer);
      const url = `data:audio/wav;base64,${base64}`;
      setAudioList((old) => {
        return [url, ...old];
      });
    },
  });

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-100 p-2 rounded">
          <h6 className="font-semibold">Listening</h6>
          <span className={vad.listening ? "text-green-600" : "text-red-600"}>
            {vad.listening ? "✅" : "❌"}
          </span>
        </div>
        
        <div className="bg-gray-100 p-2 rounded">
          <h6 className="font-semibold">Loading</h6>
          <span className={vad.loading ? "text-yellow-600" : "text-green-600"}>
            {vad.loading ? "⏳" : "✅"}
          </span>
        </div>
        
        <div className="bg-gray-100 p-2 rounded">
          <h6 className="font-semibold">Errored</h6>
          <span className={vad.errored ? "text-red-600" : "text-green-600"}>
            {vad.errored ? "⚠️" : "✅"}
          </span>
        </div>
        
        <div className="bg-gray-100 p-2 rounded">
          <h6 className="font-semibold">User Speaking</h6>
          <span className={vad.userSpeaking ? "text-green-600" : "text-gray-600"}>
            {vad.userSpeaking ? "🔊" : "🔇"}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded">
        <h6 className="font-semibold">Audio Count</h6>
        <p className="text-2xl font-bold">{audioList.length}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={vad.pause}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
        >
          Pause
        </button>
        <button
          onClick={vad.start}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Start
        </button>
        <button
          onClick={vad.toggle}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Toggle
        </button>
      </div>

      {/* Optional: Display audio list */}
      {audioList.length > 0 && (
        <div className="mt-4">
          <h6 className="font-semibold mb-2">Recent Audio Clips</h6>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {audioList.slice(0, 5).map((url, index) => (
              <audio key={index} controls src={url} className="w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Demo;
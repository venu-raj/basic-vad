"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import { useState } from "react";
import { motion } from "framer-motion";

// Got example from ricky0123/vad-react docs, but modified it to work with Gemini AI for speech-to-text and keyword extraction.

export default function Demo() {
  const [demoStarted, setDemoStarted] = useState(false);

  return (
    <div className="pb-2">
      {!demoStarted && (
        <StartDemoButton startDemo={() => setDemoStarted(true)} />
      )}
      {demoStarted && <ActiveDemo />}
    </div>
  );
}

function StartDemoButton({ startDemo }: { startDemo: () => void }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={startDemo}
        className="text-xl text-black bg-lime-400 font-bold px-6 py-3 rounded-lg hover:bg-black hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
      >
        Start demo
      </button>
    </div>
  );
}

interface ProcessedAudio {
  url: string;
  transcript: string;
  keywords: string[];
  isLoading: boolean;
  error?: string;
}

function ActiveDemo() {
  const [audioList, setAudioList] = useState<ProcessedAudio[]>([]);

  const vad = useMicVAD({
    model: "v5",
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    positiveSpeechThreshold: 0.4,
    negativeSpeechThreshold: 0.4,
    startOnLoad: false,
    onSpeechEnd: async (audio) => {
      try {
        const wavBuffer = utils.encodeWAV(audio);
        const base64 = utils.arrayBufferToBase64(wavBuffer);
        const url = `data:audio/wav;base64,${base64}`;

        const newItem: ProcessedAudio = {
          url,
          transcript: '',
          keywords: [],
          isLoading: true,
        };

        setAudioList((old) => [newItem, ...old]);

        await processAudioWithGemini(wavBuffer);
      } catch (error) {
        console.error("Error processing audio:", error);
        setAudioList((old) => {
          const updated = [...old];
          if (updated.length > 0) {
            updated[0] = {
              ...updated[0],
              isLoading: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
          }
          return updated;
        });
      }
    },
  });

  const processAudioWithGemini = async (audioBuffer: ArrayBuffer) => {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('audio', blob, 'speech.wav');

      const response = await fetch('/api/process-speech-gemini', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      setAudioList((old) => {
        const updated = [...old];
        if (updated.length > 0) {
          updated[0] = {
            ...updated[0],
            transcript: data.transcript || '',
            keywords: data.keywords || [],
            isLoading: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error("Gemini Processing Error:", error);
      throw error;
    }
  };

  if (vad.loading) {
    return <Loading />;
  }

  if (vad.errored) {
    return <Errored />;
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex items-center justify-center space-x-6 bg-white/50 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3">
          {vad.listening && vad.userSpeaking && <HighEnergyCube />}
          {vad.listening && !vad.userSpeaking && <LowEnergyCube />}
          {!vad.listening && <DeactivatedCube />}
          <span className="text-sm font-medium text-gray-600 ml-1">
            {vad.listening ? (vad.userSpeaking ? 'Speaking...' : 'Listening...') : 'Paused'}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        <button
          onClick={vad.toggle}
          className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${vad.listening
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-lime-50 text-lime-600 hover:bg-lime-100'
            }`}
        >
          {vad.listening ? 'Pause' : 'Start Recording'}
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Recordings ({audioList.length})
          </h3>
          {audioList.length > 0 && (
            <button
              onClick={() => setAudioList([])}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <ol className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {audioList.length === 0 && (
            <li className="text-center py-12 text-gray-400 text-sm">
              <div className="text-4xl mb-3">🎤</div>
              <p>No recordings yet</p>
              <p className="text-xs mt-1">Start speaking to see results here</p>
            </li>
          )}

          {audioList.map((item, index) => (
            <li
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
            >
              <div className="mb-3">
                <audio src={item.url} controls className="w-full h-10" />
              </div>

              <div className="space-y-3">
                {item.isLoading && (
                  <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-lime-500 border-t-transparent"></div>
                    <span>Processing with Gemini AI...</span>
                  </div>
                )}

                {item.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 text-sm">⚠️</span>
                      <div>
                        <div className="text-sm font-medium text-red-800">Error</div>
                        <div className="text-sm text-red-600 break-words">{item.error}</div>
                      </div>
                    </div>
                  </div>
                )}

                {item.transcript && !item.isLoading && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript</span>
                      <span className="text-[10px] text-gray-400">—</span>
                      <span className="text-[10px] text-gray-400">{item.transcript.length} chars</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      "{item.transcript}"
                    </div>
                  </div>
                )}

                {item.keywords && item.keywords.length > 0 && !item.isLoading && (
                  <div className="bg-lime-50/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Keywords</span>
                      <span className="text-[10px] text-gray-400">—</span>
                      <span className="text-[10px] text-gray-400">{item.keywords.length} found</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-lime-200 text-lime-800 rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-shadow"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-lime-400 border-t-transparent" />
      <div className="text-sm font-medium text-gray-500">Loading voice detection...</div>
    </div>
  );
}

function Errored() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="text-4xl">😅</div>
      <div className="text-lg font-medium text-gray-700">Something went wrong</div>
      <div className="text-sm text-gray-400">Please refresh and try again</div>
    </div>
  );
}

const DeactivatedCube = () => {
  return (
    <div className="bg-gradient-to-l from-[#2A2A2A] to-[#474747] h-10 w-10 rounded-lg shadow-inner" />
  );
};

const LowEnergyCube = () => {
  return (
    <motion.div
      className="bg-gradient-to-l from-[#7928CA] to-[#008080] h-10 w-10 rounded-lg shadow-lg"
      animate={{ rotate: 360 }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

const HighEnergyCube = () => {
  return (
    <motion.div
      className="bg-gradient-to-l from-[#7928CA] to-[#FF0080] h-10 w-10 rounded-lg shadow-lg"
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};
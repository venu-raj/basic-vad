"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import { useState } from "react";
import { motion } from "framer-motion";

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
        className="text-xl text-black bg-lime-400 font-bold px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
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

        // Process with Google Gemini
        await processAudioWithGemini(wavBuffer);
      } catch (error) {
        console.error("Error processing audio:", error);
        setAudioList((old) => {
          const updated = [...old];
          if (updated.length > 0) {
            updated[0] = {
              ...updated[0],
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to process audio',
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

      if (!response.ok) {
        throw new Error('Failed to process speech');
      }

      const data = await response.json();

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
    <div className="flex flex-col items-center">
      <div className="w-48 flex items-center">
        <div className="w-24 flex justify-center items-center">
          {vad.listening && vad.userSpeaking && <HighEnergyCube />}
          {vad.listening && !vad.userSpeaking && <LowEnergyCube />}
          {!vad.listening && <DeactivatedCube />}
        </div>
        <div className="w-24 flex justify-start items-center">
          <div
            className="underline underline-offset-2 text-black grow cursor-pointer"
            onClick={vad.toggle}
          >
            {vad.listening && "Pause"}
            {!vad.listening && "Start"}
          </div>
        </div>
      </div>

      <ol
        id="playlist"
        className="self-center pl-0 max-h-[400px] overflow-y-auto no-scrollbar list-none w-full max-w-md space-y-4"
      >
        {audioList.map((item, index) => (
          <li className="pl-0 bg-gray-50 rounded-lg p-3" key={index}>
            <audio src={item.url} controls className="w-full" />

            {item.isLoading && (
              <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                Processing with Gemini AI...
              </div>
            )}

            {item.error && (
              <div className="mt-2 text-sm text-red-600">
                Error: {item.error}
              </div>
            )}

            {item.transcript && !item.isLoading && (
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700">Transcript:</div>
                <div className="text-sm text-gray-600 italic">"{item.transcript}"</div>
              </div>
            )}

            {item.keywords && item.keywords.length > 0 && !item.isLoading && (
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700">Keywords:</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-lime-100 text-lime-800 rounded-full text-xs font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center">
      <div className="animate-pulse text-2xl text-black">Loading</div>
    </div>
  );
}

function Errored() {
  return (
    <div className="flex justify-center">
      <div className="text-2xl text-black">Something went wrong</div>
    </div>
  );
}

const DeactivatedCube = () => {
  return (
    <div className="bg-gradient-to-l from-[#2A2A2A] to-[#474747] h-10 w-10 rounded-[6px]" />
  );
};

const LowEnergyCube = () => {
  return (
    <motion.div
      className="bg-gradient-to-l from-[#7928CA] to-[#008080] h-10 w-10 rounded-[6px]"
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
      className="bg-gradient-to-l from-[#7928CA] to-[#FF0080] h-10 w-10 rounded-[6px]"
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

// "use client";

// import { useMicVAD, utils } from "@ricky0123/vad-react";
// import { useState } from "react";
// import { motion } from "framer-motion";

// export default function Demo() {
//   const [demoStarted, setDemoStarted] = useState(false);

//   return (
//     <div className="pb-2">
//       {!demoStarted && (
//         <StartDemoButton startDemo={() => setDemoStarted(true)} />
//       )}
//       {demoStarted && <ActiveDemo />}
//     </div>
//   );
// }

// function StartDemoButton({ startDemo }: { startDemo: () => void }) {
//   return (
//     <div className="flex justify-center">
//       <button
//         onClick={startDemo}
//         className="text-xl text-black bg-lime-400 font-bold px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
//       >
//         Start demo
//       </button>
//     </div>
//   );
// }

// function ActiveDemo() {
//   const [audioList, setAudioList] = useState<string[]>([]);

//   const vad = useMicVAD({
//     model: "v5",
//     baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
//     onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
//     positiveSpeechThreshold: 0.4,
//     negativeSpeechThreshold: 0.4,
//     startOnLoad: false,
//     onSpeechEnd: (audio) => {
//       const wavBuffer = utils.encodeWAV(audio);
//       const base64 = utils.arrayBufferToBase64(wavBuffer);
//       const url = `data:audio/wav;base64,${base64}`;
//       setAudioList((old) => [url, ...old]);
//     },
//   });

//   if (vad.loading) {
//     return <Loading />;
//   }

//   if (vad.errored) {
//     console.log("Error:", vad.errored);
//     return <Errored />;
//   }

//   return (
//     <div className="flex flex-col items-center">
//       <div className="w-48 flex items-center">
//         <div className="w-24 flex justify-center items-center">
//           {vad.listening && vad.userSpeaking && <HighEnergyCube />}
//           {vad.listening && !vad.userSpeaking && <LowEnergyCube />}
//           {!vad.listening && <DeactivatedCube />}
//         </div>
//         <div className="w-24 flex justify-start items-center">
//           <div
//             className="underline underline-offset-2 text-black grow cursor-pointer"
//             onClick={vad.toggle}
//           >
//             {vad.listening && "Pause"}
//             {!vad.listening && "Start"}
//           </div>
//         </div>
//       </div>
//       <ol
//         id="playlist"
//         className="self-center pl-0 max-h-[400px] overflow-y-auto no-scrollbar list-none w-full max-w-md"
//       >
//         {audioList.map((audioURL, index) => (
//           <li className="pl-0" key={index}>
//             <audio src={audioURL} controls className="w-full" />
//           </li>
//         ))}
//       </ol>
//     </div>
//   );
// }

// function Loading() {
//   return (
//     <div className="flex justify-center">
//       <div className="animate-pulse text-2xl text-black">Loading</div>
//     </div>
//   );
// }

// function Errored() {
//   return (
//     <div className="flex justify-center">
//       <div className="text-2xl text-black">Something went wrong</div>
//     </div>
//   );
// }

// const DeactivatedCube = () => {
//   return (
//     <div className="bg-gradient-to-l from-[#2A2A2A] to-[#474747] h-10 w-10 rounded-[6px]" />
//   );
// };

// const LowEnergyCube = () => {
//   return (
//     <motion.div
//       className="bg-gradient-to-l from-[#7928CA] to-[#008080] h-10 w-10 rounded-[6px]"
//       animate={{ rotate: 360 }}
//       transition={{
//         duration: 2.5,
//         repeat: Infinity,
//         ease: "linear",
//       }}
//     />
//   );
// };

// const HighEnergyCube = () => {
//   return (
//     <motion.div
//       className="bg-gradient-to-l from-[#7928CA] to-[#FF0080] h-10 w-10 rounded-[6px]"
//       animate={{ rotate: 360 }}
//       transition={{
//         duration: 0.6,
//         repeat: Infinity,
//         ease: "linear",
//       }}
//     />
//   );
// };

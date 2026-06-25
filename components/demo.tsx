"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import React, { useState } from "react";
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

function ActiveDemo() {
  const [audioList, setAudioList] = useState<string[]>([]);
  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(wavBuffer);
      const url = `data:audio/wav;base64,${base64}`;
      setAudioList((old) => [url, ...old]);
    },
  });

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
        className="self-center pl-0 max-h-[400px] overflow-y-auto no-scrollbar list-none w-full max-w-md"
      >
        {audioList.map((audioURL, index) => (
          <li className="pl-0" key={index}>
            <audio src={audioURL} controls className="w-full" />
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
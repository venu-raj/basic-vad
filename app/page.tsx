"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const [demoStarted, setDemoStarted] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        <div className="md:w-[768px] md:mx-auto">
          <nav className="flex flex-col sm:flex-row pt-8 pb-5 px-5">
            <div className="mr-4">
              <a href="/">home</a>
            </div>
            <div className="mr-4">
              <a target="_blank" href="https://docs.vad.ricky0123.com/">docs</a>
            </div>
            <div className="mr-4">
              <a target="_blank" href="http://github.com/ricky0123/vad">github</a>
            </div>
            <div className="mr-4">
              <a target="_blank" href="https://discord.gg/4WPeGEaSpF">discord</a>
            </div>
            <div className="">
              <a target="_blank" href="https://github.com/sponsors/ricky0123">
                sponsor me
              </a>
            </div>
          </nav>
        </div>
        <div className="prose px-5 max-w-none md:w-[768px] md:mx-auto">
          <h1>
            An accurate, user-friendly voice activity detector for the browser
          </h1>
          <p className="text-xl mt-2">
            Prompt your user for microphone permissions and run callbacks on
            segments of audio with user speech in a few lines of code.
          </p>
          <p>
            See the
            <a target="_blank" href="https://docs.vad.ricky0123.com">docs</a> to
            get started with using the voice activity detector in
            <span> browser</span>, <span>node</span>, or
            <span> react</span> projects.
          </p>
          <p>Or, see it in action in the demo below!</p>
          <div className="pb-2">
            {!demoStarted ? (
              <div className="flex justify-center">
                <button
                  onClick={() => setDemoStarted(true)}
                  className="text-xl text-black bg-lime-400 font-bold px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
                >
                  Start demo
                </button>
              </div>
            ) : (
              <ActiveDemo />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveDemo() {
  const [audioList, setAudioList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      try {
        const wavBuffer = utils.encodeWAV(audio);
        const base64 = utils.arrayBufferToBase64(wavBuffer);
        const url = `data:audio/wav;base64,${base64}`;
        setAudioList((old) => [url, ...old]);
      } catch (err) {
        console.error("Error processing audio:", err);
      }
    },
  });

  useEffect(() => {
    // Check if microphone is available
    const checkMicrophone = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        if (audioDevices.length === 0) {
          setError("No microphone found. Please connect a microphone and try again.");
          setIsInitializing(false);
          return;
        }

        // Try to get user media to check permissions
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Microphone check error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Microphone permission denied. Please allow microphone access and refresh.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("No microphone found. Please connect a microphone and try again.");
        } else {
          setError("Could not access microphone. Please check your microphone settings.");
        }
        setIsInitializing(false);
      }
    };

    checkMicrophone();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex justify-center">
        <div className="animate-pulse text-2xl text-black">Checking microphone...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl text-red-600 text-center">{error}</div>
        <button
          onClick={() => {
            setError(null);
            setIsInitializing(true);
            window.location.reload();
          }}
          className="px-4 py-2 bg-lime-400 text-black font-bold rounded hover:bg-black hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (vad.loading) {
    return <Loading />;
  }

  if (vad.errored) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl text-red-600">Something went wrong with the voice detector</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-lime-400 text-black font-bold rounded hover:bg-black hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
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
            {vad.listening ? "Pause" : "Start"}
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
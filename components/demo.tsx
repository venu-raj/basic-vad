"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import { useState, useEffect, useRef } from "react";
import { interpolateInferno } from "d3-scale-chromatic";

export const Demo = () => {
  const [audioList, setAudioList] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [indicatorColor, setIndicatorColor] = useState("#000000");
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const vad = useMicVAD({
    model: "v5",
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    positiveSpeechThreshold: 0.4,
    negativeSpeechThreshold: 0.4,
    startOnLoad: false,
    onFrameProcessed: (probs) => {
      const color = interpolateInferno(probs.isSpeech / 2);
      setIndicatorColor(color);
      if (containerRef.current) {
        containerRef.current.style.setProperty('--indicator-color', color);
      }
    },
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(wavBuffer);
      const url = `data:audio/wav;base64,${base64}`;
      setAudioList((old) => [url, ...old]);
    },
  });

  // Check microphone permission
  const checkPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setIsPermissionGranted(true);
      return true;
    } catch (error) {
      setIsPermissionGranted(false);
      return false;
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    
    // Check permission if not checked yet
    if (isPermissionGranted === null) {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }
    }

    // Start VAD
    try {
      await vad.start();
      setIsInitialized(true);
      setIndicatorColor(interpolateInferno(0.3));
      if (containerRef.current) {
        containerRef.current.style.setProperty('--indicator-color', interpolateInferno(0.3));
      }
    } catch (error) {
      console.error("Failed to start VAD:", error);
      setIsPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    vad.pause();
    setIsInitialized(false);
    setIndicatorColor(interpolateInferno(0));
    if (containerRef.current) {
      containerRef.current.style.setProperty('--indicator-color', interpolateInferno(0));
    }
  };

  const handleToggle = () => {
    if (vad.listening) {
      handleStop();
    } else {
      handleStart();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (vad.listening) {
        vad.pause();
      }
    };
  }, [vad]);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white"
    >
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight">
            Voice Activity Detector
          </h1>
          {/* <div/> */}
        </div>

        {/* Main Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div 
              className="w-full sm:w-auto px-6 py-3 rounded-xl transition-all duration-300 text-center font-medium text-white"
              style={{ 
                backgroundColor: indicatorColor || '#1a1a1a',
              }}
            >
              {!isPermissionGranted && isPermissionGranted !== null ? (
                <span>⚠️ Permission Denied</span>
              ) : vad.loading || isLoading ? (
                <span>⏳ Loading...</span>
              ) : vad.listening ? (
                <span>🎤 Listening...</span>
              ) : isInitialized ? (
                <span>⏸️ Paused</span>
              ) : (
                <span>⏹️ Stopped</span>
              )}
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              {!isInitialized && !vad.listening ? (
                <button
                  onClick={handleStart}
                  disabled={isLoading || vad.loading}
                  className="flex-1 sm:flex-none px-8 py-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl transition-all duration-300 font-medium"
                >
                  {isLoading || vad.loading ? 'Starting...' : '🎙️ Start'}
                </button>
              ) : (
                <button
                  onClick={handleToggle}
                  disabled={isLoading || vad.loading}
                  className="flex-1 sm:flex-none px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl transition-all duration-300 font-medium"
                >
                  {vad.listening ? '⏹️ Stop' : '▶️ Resume'}
                </button>
              )}
              
              {isPermissionGranted === false && (
                <button
                  onClick={handleStart}
                  className="flex-1 sm:flex-none px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-all duration-300 font-medium"
                >
                  🔄 Retry
                </button>
              )}
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h6 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Status</h6>
              <span className={`text-lg font-semibold ${vad.listening ? "text-green-600" : "text-red-600"}`}>
                {vad.listening ? "✅ Active" : "❌ Inactive"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h6 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Speaking</h6>
              <span className={`text-lg font-semibold ${vad.userSpeaking ? "text-green-600" : "text-gray-400"}`}>
                {vad.userSpeaking ? "🔊 Yes" : "🔇 No"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h6 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Clips</h6>
              <span className="text-2xl font-bold text-blue-600">{audioList.length}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h6 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Permission</h6>
              <span className={`text-lg font-semibold ${
                isPermissionGranted ? "text-green-600" : 
                isPermissionGranted === null ? "text-yellow-600" : "text-red-600"
              }`}>
                {isPermissionGranted ? "✅ Granted" : isPermissionGranted === null ? "⏳ Pending" : "⚠️ Denied"}
              </span>
            </div>
          </div>

          {/* Audio Playlist */}
          {audioList.length > 0 && (
            <div className="mt-6">
              <h6 className="font-semibold mb-4 text-black text-lg flex items-center gap-2">
                <span>📼 Recorded Speech</span>
                <span className="text-sm text-gray-500 font-normal">({audioList.length} clips)</span>
              </h6>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {audioList.map((url, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 font-mono min-w-[40px]">
                        #{audioList.length - index}
                      </span>
                      <audio controls src={url} className="flex-1 min-w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {audioList.length === 0 && isInitialized && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-lg font-medium text-gray-600">Start speaking to record audio clips</p>
              <p className="text-sm mt-2 text-gray-400">Clips will appear here when you speak</p>
            </div>
          )}

          {/* Permission Error */}
          {isPermissionGranted === false && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                Microphone permission denied. Please allow microphone access and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Demo;
"use client";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import { useState, useEffect } from "react";

export const Demo = () => {
  const [audioList, setAudioList] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [indicatorColor, setIndicatorColor] = useState("#000000");
  const [indicatorText, setIndicatorText] = useState("VAD is LOADING");

  const vad = useMicVAD({
    model: "v5",
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    positiveSpeechThreshold: 0.4,
    negativeSpeechThreshold: 0.4,
    startOnLoad: false,
    onFrameProcessed: (probs) => {
    //   const color = interpolateInferno(probs.isSpeech / 2);
    //   setIndicatorColor(color);
    },
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(wavBuffer);
      const url = `data:audio/wav;base64,${base64}`;
      setAudioList((old) => [url, ...old]);
    },
  });

  useEffect(() => {
    // Initialize VAD on component mount
    if (!isInitialized && !vad.loading) {
      setIsInitialized(true);
      setIndicatorText("VAD is running");
      vad.start();
    }
  }, [vad, isInitialized]);

  const toggleVAD = () => {
    if (vad.listening) {
      vad.pause();
      setIndicatorText('VAD is <span style="color:red">stopped</span>');
    //   setIndicatorColor(interpolateInferno(0));
    } else {
      vad.start();
      setIndicatorText("VAD is running");
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes grow {
            to {
              max-height: 100px;
              opacity: 1;
            }
          }
          .audio-item {
            max-height: 0;
            opacity: 0;
            animation: grow 1s ease-in-out forwards;
            padding-left: 5px;
            list-style: none;
          }
          .audio-item:first-child {
            border-left: 2px blue solid;
          }
          .audio-item:hover {
            background-color: rgba(100, 100, 100, 0.33);
          }
          #playlist {
            max-height: 400px;
            overflow-y: scroll;
            list-style: none;
            padding-left: 0;
          }
          .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        `}
      </style>
      <div style={styles.content}>
        <div style={styles.header}>
          <a
            style={styles.githubIcon}
            href="https://github.com/ricky0123/vad"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa fa-github"></i> /ricky0123/vad
          </a>
        </div>
        <h1 style={styles.title}>Voice Activity Detector (VAD) Demo</h1>
        <div className="control-row">
          <div
            id="indicator"
            style={{
              ...styles.indicator,
              backgroundColor: indicatorColor,
              color: "white",
            }}
            dangerouslySetInnerHTML={{ __html: indicatorText }}
          />
          <button
            id="toggle_vad_button"
            onClick={toggleVAD}
            disabled={vad.loading}
            style={styles.button}
          >
            {vad.loading ? "LOADING..." : vad.listening ? "STOP VAD" : "START VAD"}
          </button>
        </div>
        <ol id="playlist" reversed>
          {audioList.map((url, index) => (
            <li key={index} className="audio-item">
              <audio controls src={url} style={styles.audio} />
            </li>
          ))}
        </ol>
        <button
          onClick={() => {
            setIsInitialized(false);
            window.location.reload();
          }}
          style={styles.button}
        >
          Reset Demo
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "radial-gradient(black 55%, var(--indicator-color, black))",
    minHeight: "100vh",
    color: "white",
    margin: 0,
    padding: "20px",
  } as React.CSSProperties,
  content: {
    maxWidth: "800px",
    margin: "0 auto",
    paddingTop: "20px",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "20px",
  } as React.CSSProperties,
  githubIcon: {
    color: "white",
    textDecoration: "none",
    fontSize: "14px",
  } as React.CSSProperties,
  title: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: "16pt",
    marginBottom: "20px",
  } as React.CSSProperties,
  indicator: {
    padding: "8px 16px",
    borderRadius: "4px",
    transition: "background-color 0.3s ease",
    minWidth: "150px",
    textAlign: "center",
  } as React.CSSProperties,
  button: {
    backgroundColor: "black",
    border: "white 1px solid",
    color: "white",
    padding: "8px 20px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "all 0.3s ease",
  } as React.CSSProperties,
  audio: {
    width: "100%",
    maxWidth: "400px",
  } as React.CSSProperties,
};

// Make sure to add Font Awesome to your project
// Add this to your layout.tsx or _document.tsx:
// <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css" />

export default Demo;
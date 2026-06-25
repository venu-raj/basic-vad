async function initVAD() {
  try {
    const myvad = await vad.MicVAD.new({
      onSpeechStart: () => {
        console.log("Speech start detected");
      },
      onSpeechEnd: (audio) => {
        console.log("Speech ended");
        // do something with `audio`
      },
      onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
      baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
    });
    myvad.start();
    console.log("VAD started successfully");
  } catch (error) {
    console.error("Failed to initialize VAD:", error);
  }
}

if (document.readyState === "complete") {
  initVAD();
} else {
  window.addEventListener("load", initVAD);
}
import { useState, useEffect, useRef } from "react";

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check support for speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      recognitionRef.current = rec;
    } else {
      setIsSupported(false);
    }
  }, []);

  const startListening = (
    onTranscript: (text: string) => void,
    onFinished: () => void
  ) => {
    if (!isSupported || !recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const rec = recognitionRef.current;
      setError(null);
      setIsListening(true);

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setError(event.error || "Unknown recording issue.");
        setIsListening(false);
        onFinished();
      };

      rec.onend = () => {
        setIsListening(false);
        onFinished();
      };

      rec.start();
    } catch (e: any) {
      console.error("Failed to start SpeechRecognition:", e);
      setError(e?.message || "Speech service error.");
      setIsListening(false);
      onFinished();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping SpeechRecognition:", e);
      }
      setIsListening(false);
    }
  };

  return {
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
  };
}

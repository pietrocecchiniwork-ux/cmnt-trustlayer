import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, X } from "lucide-react";

interface VoiceNoteRecorderProps {
  onRecorded: (blob: Blob) => void;
  onCleared: () => void;
}

const MAX_DURATION = 30;

export default function VoiceNoteRecorder({ onRecorded, onCleared }: VoiceNoteRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        urlRef.current = URL.createObjectURL(blob);
        audioRef.current = new Audio(urlRef.current);
        audioRef.current.onended = () => setPlaying(false);
        setState("recorded");
        onRecorded(blob);
      };

      recorder.start();
      setState("recording");
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_DURATION - 1) {
            recorder.stop();
            clearInterval(timerRef.current);
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // Microphone access denied — silently ignore
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const clear = () => {
    cleanup();
    blobRef.current = null;
    urlRef.current = null;
    audioRef.current = null;
    setState("idle");
    setElapsed(0);
    setPlaying(false);
    onCleared();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="flex items-center gap-2 py-2 group"
      >
        <Mic size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
          add voice note (optional)
        </span>
      </button>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3 py-2">
        <button type="button" onClick={stopRecording} className="text-destructive">
          <Square size={14} fill="currentColor" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="font-mono text-[11px] text-foreground">{fmt(elapsed)}</span>
          <span className="font-mono text-[10px] text-muted-foreground">/ {fmt(MAX_DURATION)}</span>
        </div>
      </div>
    );
  }

  // recorded
  return (
    <div className="flex items-center gap-3 py-2">
      <button type="button" onClick={togglePlayback} className="text-foreground">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className="font-mono text-[11px] text-muted-foreground">{fmt(elapsed)}</span>
      <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
        <X size={12} />
      </button>
    </div>
  );
}

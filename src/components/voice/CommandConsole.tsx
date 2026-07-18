// OWNER: Person D (voice, scenario, demo).
// The command console: the primary voice/typed surface for driving Locus.
//
// Three input paths land in the SAME text field:
//   1. Voice Cursor — system-level dictation types straight into the input
//      (autofocus matters; do not break it). This is the demo's main path.
//   2. Mic fallback — the browser Web Speech API (Chrome) via
//      react-speech-recognition, for machines without Voice Cursor.
//   3. Typing — the disaster fallback; the same sentence always parses.
//
// Everything routes through commands.submit (Person C) -> intent -> A's
// mutations, and the audit log renders back here with an intent chip, a
// pending spinner, and a prominent response line. query_status answers are
// spoken aloud (speechSynthesis) so "which sector is under-searched?" gets a
// hands-free reply on stage.
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Toggle } from "../ui/toggle";
import { ScenarioControls } from "./ScenarioControls";
import { intentChip } from "./intentMeta";

const SILENCE_MS = 2000; // auto-submit after this much quiet while dictating

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]" />
      working…
    </span>
  );
}

export function CommandConsole({ caseId }: { caseId: Id<"cases"> }) {
  const [text, setText] = useState("");
  const [readBack, setReadBack] = useState(true); // default ON for the demo
  const [stage, setStage] = useState(false); // projection font bump
  const submit = useMutation(api.commands.submit);
  const log = useQuery(api.commands.list, { caseId });

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit whatever is in the field (typed, dictated, or Voice-Cursor'd).
  const send = useCallback(
    (raw: string) => {
      const rawText = raw.trim();
      if (!rawText) return;
      void submit({ caseId, rawText });
      setText("");
      resetTranscript();
      void SpeechRecognition.stopListening(); // one command per mic activation
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    },
    [submit, caseId, resetTranscript],
  );

  const toggleMic = () => {
    if (listening) {
      void SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setText("");
      void SpeechRecognition.startListening({
        continuous: true,
        language: "en-US",
      });
    }
  };

  // Live transcript -> input, and reset the silence timer on every new word.
  useEffect(() => {
    if (!listening) return;
    setText(transcript);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (transcript.trim()) {
      silenceTimer.current = setTimeout(() => send(transcript), SILENCE_MS);
    }
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, [transcript, listening, send]);

  // Spoken read-back of query_status answers. Seed silently on mount so we
  // never read back history; then speak each genuinely new answer.
  const lastSpokenId = useRef<Id<"commands"> | null>(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (!log) return;
    const latest = log.find(
      (c) =>
        c.intent?.type === "query_status" &&
        c.status !== "pending" &&
        !!c.response,
    );
    if (!seeded.current) {
      seeded.current = true;
      lastSpokenId.current = latest?._id ?? null; // adopt history, don't speak
      return;
    }
    if (latest && latest._id !== lastSpokenId.current) {
      lastSpokenId.current = latest._id;
      if (readBack && latest.response && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(latest.response),
        );
      }
    }
  }, [log, readBack]);

  // Stop the mic and any speech if the console unmounts.
  useEffect(() => {
    return () => {
      void SpeechRecognition.abortListening();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const entryText = stage ? "text-sm" : "text-xs";

  return (
    <div className="flex max-h-[22rem] flex-col">
      <ScenarioControls caseId={caseId} stage={stage} />

      {/* Toolbar: mic fallback + read-back + stage-mode toggles */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <Button
          size="icon"
          variant={listening ? "destructive" : "outline"}
          onClick={toggleMic}
          disabled={!browserSupportsSpeechRecognition}
          title={
            browserSupportsSpeechRecognition
              ? listening
                ? "Listening — click to stop"
                : "Dictate a command (Chrome Web Speech)"
              : "Mic fallback needs Chrome"
          }
        >
          <MicIcon className={listening ? "animate-pulse" : undefined} />
        </Button>
        {listening && (
          <span className="text-xs font-medium text-red-600">listening…</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Toggle
            size="sm"
            variant="outline"
            pressed={readBack}
            onPressedChange={setReadBack}
            title="Speak status answers aloud"
            aria-label="Toggle spoken read-back"
          >
            🔊
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={stage}
            onPressedChange={setStage}
            title="Stage mode: larger text for projection"
            aria-label="Toggle stage mode"
          >
            <span className={stage ? "text-base" : "text-xs"}>Aa</span>
          </Toggle>
        </div>
      </div>

      {/* Command log */}
      <div className="mb-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3">
        {log?.map((c) => {
          const chip = intentChip(c.intent?.type);
          const isError =
            c.status === "failed" || c.intent?.type === "unknown";
          return (
            <div
              key={c._id}
              className={cn(
                "rounded-md border px-2 py-1.5",
                isError
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    chip.className,
                  )}
                >
                  {chip.label}
                </span>
                <p className={cn("min-w-0 flex-1 truncate font-medium", entryText)}>
                  {c.rawText}
                </p>
              </div>
              <p
                className={cn(
                  "mt-1",
                  entryText,
                  isError ? "font-medium text-red-600" : "text-muted-foreground",
                )}
              >
                {c.status === "pending" ? (
                  <Spinner />
                ) : (
                  (c.response ?? c.status)
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Input — Voice Cursor dictates here at system level; autofocus matters */}
      <div className="px-3 pb-3">
        <Input
          autoFocus
          className={stage ? "h-11 text-base" : undefined}
          placeholder="Speak or type a command…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
        />
      </div>
    </div>
  );
}

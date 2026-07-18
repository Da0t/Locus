// OWNER: Person D (voice, scenario, demo).
// Skeleton on main: text input -> commands.submit -> live command log.
// Person D: Voice Cursor is system dictation into this input (autofocus
// matters); add the Web Speech fallback mic button + polish per
// plans/PERSON_D.md.
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "../ui/input";

export function CommandConsole({ caseId }: { caseId: Id<"cases"> }) {
  const [text, setText] = useState("");
  const submit = useMutation(api.commands.submit);
  const log = useQuery(api.commands.list, { caseId });

  const send = () => {
    const rawText = text.trim();
    if (!rawText) return;
    void submit({ caseId, rawText });
    setText("");
  };

  return (
    <div className="flex max-h-64 flex-col p-3">
      <div className="mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {log?.map((c) => (
          <div key={c._id} className="text-xs">
            <p className="font-medium">&gt; {c.rawText}</p>
            <p className="text-muted-foreground">
              {c.status === "pending" ? "…" : (c.response ?? c.status)}
            </p>
          </div>
        ))}
      </div>
      <Input
        autoFocus
        placeholder="Speak or type a command…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
    </div>
  );
}

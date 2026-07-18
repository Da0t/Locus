import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Re-audit coverage every two minutes, even if every human is heads-down.
crons.interval(
  "escalation sweep",
  { minutes: 2 },
  internal.escalation.sweep,
  {},
);

export default crons;

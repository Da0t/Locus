# LOCUS — Voice Coding Hackathon submission answers

Paste-ready answers for the Google Form. Two placeholders remain:
**Team Name** and the **YouTube link** in Demo URL.

---

## Project Name

Locus

## Project Description (one line pitch)

A voice-commanded search-and-rescue command center: LLM agents reason about
who the missing person is, a Monte Carlo simulation computes where they
likely are and how to search fastest, and the probability map re-plans
itself live as tips arrive — all hands-free.

## Team Name

**TODO** — not recorded anywhere; "Team Locus" if none was picked.

## Sponsors Tech Used

All three: **Voice Cursor**, **Convex**, **Respan**.

## Project Description (what did you build and why)

Search-and-rescue coordination today has a gap: tools like CalTopo are
great maps, but the probability thinking is done by hand and the search
plan is frozen the moment it's drawn. Locus is the other half — a live
probability picture that reasons and re-plans itself, commanded entirely
by voice.

LLM hypothesis agents (one per lost-person profile — hiker, dementia,
child, injured — grounded in Robert Koester's ISRID research and the
Hashimoto et al. Nature 2022 agent-based lost-person model) re-weight as
tips arrive. A pure-math Monte Carlo walker turns those hypotheses into a
live probability heatmap, and a greedy planner assigns search teams to
high-probability unsearched cells with no overlap. A credibility judge
scores each tip — a physically impossible sighting gets discounted instead
of sending a team the wrong way — and vector-embedding corroboration links
independent tips describing the same event.

**Convex is the entire live world:** a self-scheduling sim tick (~1.5s),
the Agent component for hypothesis threads, reactive queries driving every
screen, transactional grid claims under contention (two coordinators can't
double-task a sector), presence for a multi-coordinator facepile, file
storage for the subject photo, and crons for escalation. **Respan gateways
every LLM call** — voice-intent parsing, hypothesis reasoning, the tip
judge, and the found-moment debrief — with a regex fallback so the demo
survives without a network. **Voice Cursor** is both how we command it on
stage (dictation into the console, spoken read-back of answers) and how we
built it — we voice-coded a voice-commanded product, working four parallel
AI-driven branches merged at the end.

Architecture invariant: the LLM reasons, math does the searching, voice
drives it. This is decision support for trained searchers, not an
autonomous finder.

## Demo URL

- Video: **TODO — YouTube link**
- Live: https://locus-iota-orcin.vercel.app (public, no auth wall)

## Github repo

https://github.com/Da0t/Locus

## Team size

3 (Dat Nguyen, Mohak Akul Prakash, Laksh Goyal — the four "Person A–D"
branches were workstreams, not four humans)

## Your name

Dat Nguyen

## Primary Contact Email

datq.nguyen06@gmail.com

## Anything else? (optional)

Two things worth trying live: (1) the red-herring tip — a scripted
gas-station sighting 3 km away that the credibility judge correctly
discounts, so the heatmap never chases it; (2) open the same case in two
tabs and claim the same grid cell simultaneously — Convex's transactional
claims let one win and toast the other. Every LLM call rides the Respan
gateway; the app degrades gracefully (regex intent parsing) without it.

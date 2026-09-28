# LapLink

A fully custom, private remote-control system for a Windows 11 laptop, operated from an Android tablet (PWA).

## Read Order for Claude Code Sessions
1. `MEMORY.md`: Current state, context, and immediate next steps.
2. `TASKS.md`: Overall progress and task checklist.
3. `RULES.md`: Constraints and coding standards.

## Project Structure
- `agent/`: Windows 11 Python agent (GStreamer + NVENC).
- `relay/`: Linux VPS FastAPI signaling and TURN relay.
- `web/`: Android PWA Client (React + Vite).
- `docs/`: Specs, decisions, and setup guides.
- `shared/`: Protocol definitions.

## Key Commands (Windows)
- Run tests (Agent): `pytest agent/tests`
- Run Agent locally: `python -m laplink_agent.main`
- Run Worker locally: `npm run dev` (from `worker/` dir)
- Start Client dev server: `npm run dev` (from `web/` dir)

## Conventions
- No placeholders, only working code.
- Update `MEMORY.md` and `TASKS.md` after completing a step.
- Update docs synchronously with code changes.

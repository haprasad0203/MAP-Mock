# How to start with Claude Code

1. Copy the `reference/` folder from this kit into the root of the WMC app repo, so you have:
   - `reference/PROMPT_campus_map.md`
   - `reference/PLAN_campus_map.md`
   - `reference/IIM_Shillong_Campus_Map_Pack/` (README, satellite screenshots, style reference)
2. In Chrome, check that the Claude in Chrome extension (v1.0.36+) is signed in to the same Claude account, and that Gemini is open and logged in.
3. Start Claude Code with the browser connected:
   - Terminal (PowerShell, inside the repo folder): run `claude --chrome`. Then type `/chrome` and check that the status shows Enabled.
   - First-time install: `irm https://claude.ai/install.ps1 | iex` (Git for Windows recommended).
4. Switch to Plan mode (press Shift+Tab until it shows plan mode), then send:

> Read reference/PROMPT_campus_map.md and reference/PLAN_campus_map.md, plus reference/IIM_Shillong_Campus_Map_Pack/README.md. Do Step 0 (photo research) and Step 1 (the Gemini style tile and landmark sprites, only if needed), then write reference/IMPLEMENTATION_PLAN.md and stop for my approval. Don't write app code until I approve.

5. Review the plan, then approve one phase at a time.
6. On campus, open Survey mode on your phone and save points at each building entrance and main junction, so the blue dot lines up.

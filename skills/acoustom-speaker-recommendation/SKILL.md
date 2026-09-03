---
name: acoustom-speaker-recommendation
description: Recommend and compare Acoustom catalog speakers for a listener's room, preferences, format, and budget. Use when advising on catalog speaker selection; do not use for designing a custom build.
---

# Acoustom speaker recommendation

Use the Acoustom MCP tools as the source of truth for catalog facts and suitability. A broad buying request always begins with `acoustom-guided-discovery`; do not treat `recommend_speakers` as a shortcut around the discovery conversation. Start with `get_acoustom_overview` when the site or tool set is unfamiliar; otherwise use the smallest useful sequence.

## Gather the decision inputs

Establish room size, listening preference, preferred format, and budget in USD when they materially affect the recommendation. For missing room or music context, proactively offer the relevant approved connected source or upload/default fallback before asking the user to type details. Ask only one concise question for information that cannot be obtained that way and would change the outcome. When a material input is missing, ask for it or ask explicit permission to proceed with named assumptions; do not issue a provisional ranking first.

If listening taste would materially change a close recommendation and it is unknown, offer the connected music-preference prompt from guided discovery. If the user approves and the agent has a relevant connection, record only the derived preference summary with `set_music_preferences` so the reasoning and visible page share the same context. Do not retrieve or reproduce protected streaming audio.

Use `recommend_speakers` to produce an initial ranking, then use `get_product` for finalists. When the user asks for the best option, do not stop at a single product: load two or three credible candidates into the comparison workflow, compare the specifications that matter, and explain why the primary choice wins for this brief. Move the user to the finalist with `navigate_acoustom` so they can read the same specifications you are citing. If a custom build could address a stated requirement better than the catalog shortlist, proactively offer to validate one and compare it against the finalists; do not build one without the user's agreement. Hand off to the comparison skill once the user is weighing specific alternatives. If room-specific evidence is wanted, use the room-context enrichment flow before simulating when room inputs are missing.

## Explain the result

After navigating to the finalist and loading the comparison when applicable, use this response structure:

```md
## Recommendation

**Best fit:** [speaker] — [one-sentence reason]

### Why it fits
- [requirement] → [catalog fact or suitability reason]

### Key specs
- [the two to four specifications that matter]

### Trade-off
[one meaningful limitation or alternative]

### Custom alternative (optional)
[Offer a curated custom build only when it could address a stated limitation; explain what it would change and ask permission before building.]

### Next step
[inspect the visible speaker, compare it, simulate it, build the custom alternative, or one short question]
```

Separate:

- catalog facts returned by the tools;
- suitability reasoning based on the user's requirements; and
- simulated evidence, if a simulation was performed.

Do not invent availability, lead time, measured response, amplifier compatibility beyond returned specifications, or sound characteristics not supported by the catalog or simulation result. State when a choice is driven by preference rather than a measurable advantage.

## Simulation boundary

If a room simulation is used, carry `speakerPerformance.measurementStatus`, `modelType`, `note`, `metrics.rt60`, and `frequencyResponse` into the explanation. Describe `specification_based` profiles as estimates derived from published specifications, never as a completed-speaker measurement. RT60 describes the simulated room decay; it is not a rating of the speaker.

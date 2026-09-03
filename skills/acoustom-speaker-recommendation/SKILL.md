---
name: acoustom-speaker-recommendation
description: Recommend and compare Acoustom catalog speakers for a listener's room, preferences, format, and budget. Use when advising on catalog speaker selection; do not use for designing a custom build.
---

# Acoustom speaker recommendation

Use the Acoustom MCP tools as the source of truth for catalog facts and suitability. Start with `get_acoustom_overview` when the site or tool set is unfamiliar; otherwise use the smallest useful sequence.

## Gather the decision inputs

Establish room size, listening preference, preferred format, and budget in USD when they materially affect the recommendation. Ask only for unknown inputs that would change the outcome. A listening distance, placement constraints, or desire for active versus passive speakers may resolve a close choice.

If you already hold the user's listening habits or a playlist from outside Acoustom, record them with `set_music_preferences` so the reasoning and the visible page share the same context.

Use `recommend_speakers` to produce an initial ranking, then use `get_product` for finalists. Move the user to a finalist with `navigate_acoustom` so they can read the same specifications you are citing. Hand off to the comparison skill once the user is weighing specific alternatives. If the user supplies physical room dimensions and wants room-specific evidence, use `simulate_speaker_in_room` after selecting a candidate.

## Explain the result

Return a concise primary recommendation and, when useful, one alternative with a clear trade-off. Separate:

- catalog facts returned by the tools;
- suitability reasoning based on the user's requirements; and
- simulated evidence, if a simulation was performed.

Do not invent availability, lead time, measured response, amplifier compatibility beyond returned specifications, or sound characteristics not supported by the catalog or simulation result. State when a choice is driven by preference rather than a measurable advantage.

## Simulation boundary

If a room simulation is used, carry `speakerPerformance.measurementStatus`, `modelType`, `note`, `metrics.rt60`, and `frequencyResponse` into the explanation. Describe `specification_based` profiles as estimates derived from published specifications, never as a completed-speaker measurement. RT60 describes the simulated room decay; it is not a rating of the speaker.

---
name: acoustom-speaker-comparison
description: Compare up to five Acoustom speakers side by side, including saved custom builds, with specifications and matched room-simulation evidence, and summarise them against the user's stated requirements. Use when the user is deciding between candidates; do not use to produce an initial shortlist.
---

# Acoustom speaker comparison

The comparison matrix holds up to five speakers at once and accepts catalog products and locally saved custom builds together. Every slot is evaluated against one shared room and one reference track, so differences between columns are attributable to the speaker rather than the room.

## Put the comparison on screen

Use `compare_speakers` for the data and `set_comparison_selection` (or `navigate_acoustom` with `productNames`) to load the same set into the visible matrix. Do both: a comparison the user cannot see is hard to act on, and the matrix is where they add or remove a candidate.

Reference catalog products by name and custom builds by the `buildId` or name returned from `list_local_builds`. A custom build only carries specifications once it has been validated; if a column is missing specs, revalidate that build before comparing.

## Gather matched evidence

Set `includeSimulation` to true when the user wants performance evidence rather than a spec table. Every column is then simulated in the same room, so RT60 and in-room frequency response are comparable. For evidence in the user's own room, apply their room first — via `apply_agent_room_estimate` or the lab controls — and simulate against that instead of the default.

If room data is missing and simulation would change the decision, offer the room-context prompt from guided discovery before using a default room. If listening preference would decide between otherwise close candidates, offer the music-preference prompt instead of asking the user to describe their taste at length.

Before an audible comparison, offer an optional reference-track choice: use a built-in Listening Lab track or upload the user's own audio file. Do not make an upload a prerequisite. Use `set_reference_track` for a built-in option, or `upload_reference_audio` when the user supplies a supported audio data URL; the uploaded file remains browser-local and is used consistently across every comparison column.

Do not mix a simulation run in one room with a simulation run in another and present the numbers as a like-for-like comparison.

## Summarise against the brief

Use this response structure after the comparison matrix is visible. Structure the answer around the user's requirements, not around the spec sheet order:

```md
## Comparison: [candidate names]

**Best match for your brief:** [candidate]

### What matters for your brief
| Requirement | [candidate] | [candidate] | What it means |
|---|---|---|---|
| [requirement] | … | … | … |

### Decision
- Choose **[candidate]** if …
- Choose **[candidate]** if …

### Custom alternative (optional)
[If the shortlist leaves a stated requirement unresolved, offer a curated custom build and explain the specific comparison it would test. Do not create it without agreement.]

### Simulation evidence
[include only when simulated; state room and provenance]

### Next step
[one visible action or one short decision question]
```

Include:

- restate the requirements the comparison is being judged against;
- for each candidate, give the two or three specifications that actually bear on those requirements;
- report simulated evidence with its provenance (`speakerPerformance.measurementStatus`, `modelType`, `metrics.rt60`); and
- name the trade-off that separates the finalists.

Prices are USD per pair. A custom build's price is the configured component total from validation, not a catalog price; say so when comparing it against catalog models.

End with a recommendation and the single question or measurement that would change it. Where the columns are genuinely close, say the choice is preference and describe what the user should listen for using `set_reference_track` in the listening lab.

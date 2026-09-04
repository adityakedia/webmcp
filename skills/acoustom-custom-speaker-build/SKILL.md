---
name: acoustom-custom-speaker-build
description: Guide a grounded Acoustom custom-speaker configuration through platform selection, validation, visual presentation, and saved revisions. Use for custom-build requests; do not use for general catalog shopping.
---

# Acoustom custom speaker build

Treat the custom builder as a curated product configuration system, not free-form loudspeaker engineering. The server owns compatible platforms, drivers, crossover topology, safe cabinet proportions, and simulation eligibility.

## Build workflow

1. Capture the user's requested format, sound profile, room size, listening distance, bass preference, cabinet choices, and personalisation.
2. Call `get_custom_speaker_builder_options` before choosing a platform when the platform is unknown or needs explaining.
3. Assemble only values accepted by `validate_custom_speaker_build`; do not invent drivers, crossover values, baffle dimensions, or unsupported enclosure parameters.
4. Call `validate_custom_speaker_build` before describing the result as a validated build, presenting it for simulation, or saving it.
5. Present the returned configuration, `derived` specifications, warnings, and manufacturing status. When a build-render tool is available, use its returned artifact to show the user the configured speaker.
6. Save with `save_local_build`, which validates and stores the derived specifications so the build can be simulated and compared. Sign-in is not required; `save_custom_configuration` is for durable account-backed designs.
7. For a saved design, load its current revision before editing and save using the returned revision. Revalidate edited configurations before simulation.

When room or listening context would materially affect the selected platform or voicing target, offer the relevant consent-based prompt from guided discovery before validation. Do not request outside context merely because it is available.

Run the build as a continuous visible workflow. First open the builder with `navigate_acoustom` (`destination: custom_design`, `buildId` when editing an existing build), then apply the gathered choices with the visible builder controls. Briefly tell the user what each major stage changed and continue automatically through validation, build-sheet generation, and simulation. Navigate to the Listening Lab before simulating so the user sees the room and result. Do not pause for confirmation between ordinary configuration, validation, build-sheet, or simulation steps; pause only when required information or an explicit user decision is missing. Compare it against catalog candidates with `set_comparison_selection` when the user is weighing a custom build against buying off the shelf.

Refine iteratively: change one variable the user objected to, revalidate, re-simulate in the same room, and report what actually moved.

## How to represent the build

Describe finish, grille, base, edge profile, engraving, and exterior artwork as presentation or manufacturing choices unless the validated response says otherwise. Treat personalisation as subject to design review when warnings or its status say so.

Make an explicit distinction between a validated configuration and an acoustically measured completed speaker. Carry these fields into every technical summary:

- `derived.simulationProfile.status` and `modelType`;
- `compatibilityNotes` and `measurementRequiredFor`;
- `derived.warnings`; and
- `manufacturingStatus`.

Use this response structure after validation, and again after a meaningful refinement:

```md
## Your custom build

**Configuration:** [platform, format, enclosure]

### What was selected
- Drivers: …
- Enclosure / cabinet: …
- Damping, baffle, grille, and crossover profile: …

### Predicted speaker profile
- Sensitivity / impedance: …
- Frequency range / crossover: …
- Simulation status: …

### Important boundary
[what is reference-derived or estimated, and what still requires measurement]

### Next step
[open the visible builder, simulate it, compare it, or ask one refinement question]
```

Never imply that the agent designed a safe crossover, selected arbitrary driver substitutions, approved production artwork, or produced a measured performance result. If the user asks for one of those actions, explain the platform boundary and identify the validation or engineering data required.

## Visuals

Do not claim that a textual configuration is a rendered image. The live product editor may preview a build in-browser, but an agent may only share a visual when a tool returns an image artifact or image content. If no render tool is available, provide the exact build specification and say that a shareable render is unavailable.

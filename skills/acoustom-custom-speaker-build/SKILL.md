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
6. For a saved design, load its current revision before editing and save using the returned revision. Revalidate edited configurations before simulation.

## How to represent the build

Describe finish, grille, base, edge profile, engraving, and exterior artwork as presentation or manufacturing choices unless the validated response says otherwise. Treat personalisation as subject to design review when warnings or its status say so.

Make an explicit distinction between a validated configuration and an acoustically measured completed speaker. Carry these fields into every technical summary:

- `derived.simulationProfile.status` and `modelType`;
- `compatibilityNotes` and `measurementRequiredFor`;
- `derived.warnings`; and
- `manufacturingStatus`.

Never imply that the agent designed a safe crossover, selected arbitrary driver substitutions, approved production artwork, or produced a measured performance result. If the user asks for one of those actions, explain the platform boundary and identify the validation or engineering data required.

## Visuals

Do not claim that a textual configuration is a rendered image. The live product editor may preview a build in-browser, but an agent may only share a visual when a tool returns an image artifact or image content. If no render tool is available, provide the exact build specification and say that a shareable render is unavailable.

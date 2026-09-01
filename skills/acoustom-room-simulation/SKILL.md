---
name: acoustom-room-simulation
description: Run and explain grounded Acoustom stereo room simulations for catalog speakers or validated custom builds. Use for room-placement, RT60, frequency-response, or audition-preview requests; do not use to make unqualified acoustic-performance claims.
---

# Acoustom room simulation

Use the room simulator to estimate the interaction of a supported speaker profile, room geometry, surface absorption, source placement, and listener position. It returns stereo room impulse responses, a compact in-room frequency response, RT60, and profile provenance.

## Choose the correct simulation tool

- For a catalog model, call `simulate_speaker_in_room` with the exact catalog product name.
- For a custom design, first call `validate_custom_speaker_build`, then pass the returned build unchanged to `simulate_custom_speaker_in_room`.
- Use `get_room_simulation_presets` when the user has not supplied surface details. Use per-surface absorption only when the user has sufficiently specific room information.

Use default layout only when the user has not provided placement. If a custom layout is supplied, keep every speaker and listener coordinate within the stated room. Explain that source rotation/directivity is a simulation input, not a verified physical property unless supplied by the chosen profile.

## Interpret and report

State the room dimensions, preset or surface assumptions, placement assumptions, selected speaker, and profile provenance. Report RT60 as an estimated decay time and use the frequency-response points to identify broad, relevant trends rather than over-interpreting individual narrow points.

Always include the `speakerPerformance` fields in the explanation:

- `measurementStatus` and `modelType`;
- `frequencyRangeHz` and `sensitivityDb`, when available; and
- `note`.

For `specification_based` output, say that the speaker profile is estimated from published data. For a custom `component_model_ready` build, say it is an analytical component/enclosure estimate. A `reference_ready` profile may be described as a documented reference model, but not as a measurement of the user's completed build or room.

## Audio and artifacts

`impulseResponses.left` and `.right` are WAV room impulse responses, not a finished listening clip. They can be convolved with a source track by a compatible client. Do not present an RIR by itself as what the speaker sounds like, and do not say that an audio audition was produced unless a tool returned a rendered audio artifact.

End with a practical next action: refine placement, change room treatment assumptions, compare a different speaker, or obtain measurements when the result cannot support the user's decision.

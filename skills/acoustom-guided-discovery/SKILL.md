---
name: acoustom-guided-discovery
description: Entry-point skill for helping a user choose, compare, or design Acoustom speakers end to end. Use when the request is broad ("help me pick speakers", "what should I buy for my room"), when several Acoustom workflows must be combined, or when the agent holds outside context such as room photos, floor plans, or a music playlist. Load a specialised Acoustom skill for the individual step you land on.
---

# Acoustom guided discovery

Acoustom is a loudspeaker site with a live catalog, a five-slot comparison matrix, a listening lab that simulates speakers in the user's room, and a custom speaker builder. The agent works inside the page over WebMCP: every tool acts on the same browser session the user is looking at.

## Response mode

Use the structured response required by the specialised skill whenever you complete a recommendation, comparison, custom-build, or room-simulation step. Keep ordinary follow-up questions and explanations conversational unless they start or materially advance one of those workflows.

For a broad onboarding request, use:

```md
## Let’s find the right setup

**What I understand:** [the brief and any assumptions]
**Recommended path:** [catalog / comparison / room simulation / custom build]
**Optional context:** [only a relevant offer, if it would change the outcome]
**Next step:** [one action the user can take, or one short question]
```

Call `get_acoustom_overview` first when the site is unfamiliar. It returns what the platform does, what it deliberately does not do, the page map, and which tools belong to each capability.

## Establish the brief before recommending

Collect only what changes the outcome:

- room size or actual dimensions, and how the room is furnished;
- listening preference (balanced, reference, warm, immersive) and typical listening distance;
- preferred format (standmount, floorstanding, active) and any placement constraints;
- budget in USD; and
- whether the user wants a catalog product, a custom build, or both compared.

Never invent these. When one is missing, proactively offer the relevant connected context source (with approval) before asking the user to type it. If no source is available or approved, ask one concise question and explain why it changes the ranking; do not make the user answer a long questionnaire.

## Bring outside context in

The platform has no Spotify, photo-analysis, or floor-plan integration. Anything of that kind comes from an app connection available to the agent. Offer it only when it would materially improve the current workflow, obtain explicit approval before retrieving anything, and offer a no-data fallback. Then land the approved context in the page so the user sees the same thing:

- room photos or floor plans you can already see → `attach_room_reference_images` to show them in the listening lab, then `apply_agent_room_estimate` for editable dimensions, preset, and layout;
- room images the user uploaded in the lab → `get_room_reference_images`;
- playlists or listening habits → `set_music_preferences`, then `set_reference_track` to audition something representative.

For missing room context, ask:

```md
### Make the room simulation more specific (optional)

I can use room photos or a floor plan from an app you have connected, or you can upload them here. I would use them only to estimate editable room dimensions, layout, and surface assumptions.

Would you like me to look for an approved file, upload one here, or continue with a default room?
```

For music context, ask:

```md
### Tune this to your listening habits (optional)

If you have a music service connected, I can use high-level preference signals such as recurring genres and artists to choose a representative built-in reference track. I will not copy, upload, or simulate protected streaming audio.

Would you like me to use that preference summary, or continue genre-neutral?
```

State that image-derived dimensions are estimates, not measurements, and that the user can correct every applied field. Summarise only the relevant derived signals from a connected source; do not expose private history or unrelated files.

## Run the work where the user can see it

Keep the visible page on the step you are doing. `navigate_acoustom` moves the app and carries context in the same call: `productNames` fills the comparison matrix, `speakerName` selects the listening-lab speaker, `buildId` opens a saved build. Use `get_navigation_context` when the current page or live selection is unknown.

Announce what is now on screen and what the user can change there. Navigation is not consent: it shows work, it does not approve it.

## Integrated route

A full engagement usually runs: brief → proactively enrich missing room/music context when useful → `recommend_speakers` → inspect finalists with `get_product` → `set_comparison_selection` and compare → `simulate_speaker_in_room` for the shortlist → offer a curated custom alternative when it could improve the stated fit → validate/build it → compare the custom build against the catalog in the same matrix and the same room → explain whether the custom build has a supported advantage or only a preference/design advantage.

Each stage is also valid on its own. Do not force the user through stages that do not serve their question.

## Close honestly

Separate catalog facts, suitability reasoning, and simulated evidence. Give one primary recommendation, one alternative with its trade-off, and name the evidence you could not obtain. Say plainly when a difference is preference rather than a measurable advantage.

Acoustom has no checkout, payment, or order flow. `add_to_cart` and `toggle_wishlist` change a browser-local bag and wishlist only; never describe them as a purchase.

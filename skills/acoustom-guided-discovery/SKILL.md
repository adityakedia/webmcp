---
name: acoustom-guided-discovery
description: Entry-point skill for helping a user choose, compare, or design Acoustom speakers end to end. Use when the request is broad ("help me pick speakers", "what should I buy for my room"), when several Acoustom workflows must be combined, or when the agent holds outside context such as room photos, floor plans, or a music playlist. Load a specialised Acoustom skill for the individual step you land on.
---

# Acoustom guided discovery

Acoustom is a loudspeaker site with a live catalog, a five-slot comparison matrix, a listening lab that simulates speakers in the user's room, and a custom speaker builder. The agent works inside the page over WebMCP: every tool acts on the same browser session the user is looking at.

Call `get_acoustom_overview` first when the site is unfamiliar. It returns what the platform does, what it deliberately does not do, the page map, and which tools belong to each capability.

## Establish the brief before recommending

Collect only what changes the outcome:

- room size or actual dimensions, and how the room is furnished;
- listening preference (balanced, reference, warm, immersive) and typical listening distance;
- preferred format (standmount, floorstanding, active) and any placement constraints;
- budget in USD; and
- whether the user wants a catalog product, a custom build, or both compared.

Never invent these. Ask for the ones that would change the answer, and say which assumptions you are carrying when the user cannot supply a value.

## Bring outside context in

The platform has no Spotify, photo-analysis, or floor-plan integration. Anything of that kind comes from the agent's own connection to the user. Offer it explicitly, then land it in the page so the user sees the same thing:

- room photos or floor plans you can already see → `attach_room_reference_images` to show them in the listening lab, then `apply_agent_room_estimate` for editable dimensions, preset, and layout;
- room images the user uploaded in the lab → `get_room_reference_images`;
- playlists or listening habits → `set_music_preferences`, then `set_reference_track` to audition something representative.

State that image-derived dimensions are estimates, not measurements, and that the user can correct every applied field.

## Run the work where the user can see it

Keep the visible page on the step you are doing. `navigate_acoustom` moves the app and carries context in the same call: `productNames` fills the comparison matrix, `speakerName` selects the listening-lab speaker, `buildId` opens a saved build. Use `get_navigation_context` when the current page or live selection is unknown.

Announce what is now on screen and what the user can change there. Navigation is not consent: it shows work, it does not approve it.

## Integrated route

A full engagement usually runs: brief → `recommend_speakers` → inspect finalists with `get_product` → room from images or dimensions → `set_comparison_selection` and compare → `simulate_speaker_in_room` for the shortlist → optionally design an alternative with the custom builder → compare the custom build against the catalog in the same matrix and the same room → summarise against the original brief.

Each stage is also valid on its own. Do not force the user through stages that do not serve their question.

## Close honestly

Separate catalog facts, suitability reasoning, and simulated evidence. Give one primary recommendation, one alternative with its trade-off, and name the evidence you could not obtain. Say plainly when a difference is preference rather than a measurable advantage.

Acoustom has no checkout, payment, or order flow. `add_to_cart` and `toggle_wishlist` change a browser-local bag and wishlist only; never describe them as a purchase.

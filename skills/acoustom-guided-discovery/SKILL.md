---
name: acoustom-guided-discovery
description: Entry-point skill for helping a user choose, compare, or design Acoustom speakers end to end. Use when the request is broad ("help me pick speakers", "what should I buy for my room"), when several Acoustom workflows must be combined, or when the agent holds outside context such as room photos, floor plans, or a music playlist. Load a specialised Acoustom skill for the individual step you land on.
---

# Acoustom guided discovery

Acoustom is a loudspeaker site with a live catalog, a five-slot comparison matrix, a listening lab that simulates speakers in the user's room, and a custom speaker builder. The agent works inside the page over WebMCP: every tool acts on the same browser session the user is looking at.

## Shared browser session

Use the Codex built-in/in-app browser as the shared user-visible workspace. Follow this order without skipping ahead:

1. **Reuse first.** Inspect the in-app browser. If the Acoustom URL is already loaded in a tab, use that exact tab; do not open, replace, or duplicate it.
2. **Ask second.** If Acoustom is not loaded there, ask the user to open the Acoustom URL in the in-app browser and wait for it to load.
3. **Open last.** Only if the user asks the agent to open it, or cannot do so, open Acoustom in the active in-app browser yourself. Never use cloud/background browsing, a temporary hidden tab, a headless browser, or a separate browser context.

If the in-app browser itself is unavailable, ask the user to open it from the Codex toolbar before continuing.

**A chat response ends a model turn; it does not end the shared browser session.** After asking for input, leave the existing Acoustom tab open on the most useful editable view (normally the Listening Lab for room context). Do not close the tab, navigate away, create a replacement tab, or describe the workflow as finished merely because you are waiting for the user's reply. On the next turn, resume in that same tab and call `get_user_context` before asking for already-known information. The browser and agent host ultimately own tab lifetime, so this instruction reduces avoidable closure but cannot technically guarantee a tab remains open.

Before ending every response, mark the existing Acoustom in-app-browser tab for handoff and leave it open on the relevant editable view. This is mandatory for questions, progress updates, and completed stages: preserve the exact shared tab, never close, replace, duplicate, or call it temporary. On the next turn, inspect that same handed-off tab and call `get_user_context` before continuing. The browser host owns tab lifetime, so this is an agent protocol rather than a frontend-enforceable pin.

## Response mode

Use the structured response required by the specialised skill whenever you complete a recommendation, comparison, custom-build, or room-simulation step. Keep ordinary follow-up questions and explanations conversational unless they start or materially advance one of those workflows.

For a broad onboarding request, use:

```md
## Let's find the right setup

**What I understand:** [the brief and any assumptions]
**Recommended path:** [catalog / comparison / room simulation / custom build]

### Choose how to share room context

- **Fetch from a connected source** — [specific available source, e.g. Drive or Dropbox]
- **Upload here** — a room photo or floor plan
- **Tell me roughly** — dimensions, amp status, budget, and music taste
- **Use assumptions** — [state the exact assumptions]

Reply with one option, or combine them. Keep this question open while you decide.
```

Never put a list of alternatives inside a single `**Next step:**` sentence. Use a short heading and bullets whenever there are two or more choices. Keep each bullet to one action and its outcome. Only offer sources the agent can actually access in the current session.

For example, when room, amplifier, and budget are unknown:

```md
## Let's find the right setup

**What I understand:** You want a home speaker. I do not yet know your room, budget, music taste, or whether you own an amplifier.
**Recommended path:** Match catalog speakers to your room, then compare the finalists in the Listening Lab.

### Choose how to share room context

- **Fetch from connected Drive or Dropbox** — I’ll look for a room photo or floor plan.
- **Upload here** — share a room photo or floor plan in this chat.
- **Tell me roughly** — room dimensions, whether you have an amp, your budget, and your music taste.
- **Use assumptions** — medium living room with balanced sound; I’ll label them clearly.

I’ll keep the Listening Lab open while you decide.
```

Call `get_acoustom_overview` first when the site is unfamiliar. It returns what the platform does, what it deliberately does not do, the page map, and which tools belong to each capability.

## Proactive context fetching — MANDATORY at every decision point

**Before asking the user to type any room, music, or preference detail, you MUST first offer to fetch it from a connected source or accept a manual upload.** This applies to EVERY missing input that would change the recommendation — including the "Next step" question in the first response, and every follow-up question.

**Connected sources the agent can access (examples):**
- **Room images / floor plans:** Google Drive, OneDrive, Dropbox, iCloud, local file upload in chat
- **Music preferences:** Spotify, Apple Music, YouTube Music, Tidal, Last.fm — high-level genre/artist signals only, no protected audio
- **Room measurements:** Laser measure apps, AR room scans, smart home sensors (if connected)

**Always use this pattern:**
1. State what's missing and why it matters
2. Offer 2–3 specific source options + manual upload
3. Ask for approval to fetch, or invite upload, or offer assumption fallback
4. If approved, call the appropriate tool (`attach_room_reference_images`, `set_music_preferences`)
5. Land the context in the page so the user sees it (`navigate_acoustom` to listening_lab)
6. **Summarize back what you fetched/extracted** so the user can verify/correct before proceeding

## Establish the brief before recommending

Guided discovery is the required entry point for every broad buying request, including "help me choose", "what should I buy", and "best speaker under [budget]". Do not call `recommend_speakers`, inspect products, or state a provisional winner in the first response to one of these requests.

The first response has one job: establish the decision context. State the requirement already known, name only the missing inputs that would change the choice, and either ask for them or ask explicit permission to continue with named assumptions. Do not silently select a default room, listening profile, format, or system setup.

### Template: User gives only budget (first response)

```md
## Let's narrow this down

You've set a budget of [budget]. The choice still changes materially with your room and whether you want an active all-in-one speaker or already have an amplifier.

**Room context (pick one):**
- 📁 **Fetch from Google Drive / OneDrive / Dropbox** — I'll look for a room photo or floor plan and extract dimensions/layout
- 📤 **Upload an image here** — Drag a room photo or floor plan into this chat
- 📐 **Tell me roughly** — "Medium living room, ~4×5 m, carpet + curtains"

**Amplifier:** Do you already have a separate amplifier, or do you need an active speaker with built-in amp?

**Music taste (optional, pick one):**
- 🎵 **Fetch from Spotify / Apple Music / YouTube Music** — I'll read high-level genres/artists to pick a reference track
- 📝 **Tell me** — "Mostly jazz and vocals" or "Electronic with deep bass"

If you prefer, I can continue with clearly stated assumptions instead—would you like that?
```

### Template: Missing room size/dimensions (any turn)

```md
### Room context needed

To simulate accurately I need your room dimensions and layout. **Choose one:**

- 📁 **Fetch from Google Drive / OneDrive / Dropbox** — I'll find a room photo or floor plan and estimate dimensions, speaker/listener placement, and surface materials
- 📤 **Upload an image here** — Drag a photo, screenshot, or floor plan into this chat
- 📐 **Type it** — "4.2 × 5.1 × 2.7 m, speakers 1 m from front wall, listening position 3 m back"

The image-derived estimate will appear in the Listening Lab where you can edit every value before simulation.
```

### Template: Missing listening preference / music taste (any turn)

```md
### Music taste helps pick the right reference track

**Choose one:**

- 🎵 **Fetch from Spotify / Apple Music / YouTube Music** — I'll read your top genres/artists and pick a matching built-in reference track (no protected audio is copied or uploaded)
- 📤 **Upload a reference track** — Drag a WAV/MP3/FLAC file here (max 30 MB)
- 📝 **Describe it** — "Jazz vocals, acoustic bass" or "Electronic, heavy sub-bass"
- ⏭️ **Skip** — Use a neutral genre-agnostic track

I'll load the chosen track in the Listening Lab so you can audition speakers with it.
```

### Template: Missing amplifier / format preference (any turn)

```md
### System setup

**Do you have a separate amplifier, or do you need an active speaker with built-in amplification?**

- 🔌 **I have an amp** — I'll prioritize passive standmount/floorstanding speakers
- ⚡ **Need active** — I'll prioritize powered speakers with built-in amps
- ❓ **Not sure** — I'll show both and note the difference
```

### Handling vague answers — ALWAYS follow up with fetch/upload offer

When the user gives a vague answer (e.g., "avg size room", "medium room", "normal living room"), **do not proceed with assumptions**. Instead:

1. Acknowledge the vague answer
2. Explain why specifics matter (simulation accuracy, speaker placement, bass response)
3. Offer to **calculate exact dimensions from a photo/floor plan** via connected source or upload
4. Offer manual entry as fallback

**Template for vague room answer:**
```md
Thanks — "average size" helps, but simulation accuracy depends on exact dimensions, speaker-to-wall distances, and surface materials. A 4×5 m room with speakers 0.5 m from the front wall sounds very different from 1.5 m out.

**Let me get precise dimensions for you (pick one):**
- 📁 **Fetch from Google Drive / OneDrive / Dropbox** — I'll analyze a room photo or floor plan and calculate exact dimensions, speaker placement, and surface assumptions
- 📤 **Upload a photo/floor plan here** — I'll extract the measurements automatically
- 📐 **Type exact values** — "Width × Length × Height in metres, speaker distance from walls, listening position"

Once I have the image, I'll show the extracted estimate in the Listening Lab for you to review and correct before any simulation.
```

**Template for vague music answer:**
```md
Thanks — "a bit of everything" / "mostly rock" gives direction, but the reference track matters for auditioning bass, midrange, and treble balance.

**Let me pick the perfect reference track from your listening history (pick one):**
- 🎵 **Fetch from Spotify / Apple Music / YouTube Music** — I'll analyze your top genres/artists/playlists and select the best matching built-in track
- 📤 **Upload a favorite track** — Drag a WAV/MP3/FLAC you know well (max 30 MB)
- 📝 **Be specific** — "Norah Jones vocal jazz" or "Deadmau5 progressive house with deep sub-bass"
- ⏭️ **Skip** — I'll use a neutral track

I'll load it in the Listening Lab so you can hear each candidate with your music.
```

## Summarize fetched / uploaded context back to the user — MANDATORY

**After every successful fetch or upload, you MUST summarize what you extracted/received before proceeding.** This lets the user verify, correct, or approve.

**Room image/floor plan summary:**
```md
### Room estimate from your [Google Drive photo / uploaded floor plan]

**Extracted dimensions:** 4.3 × 5.2 × 2.7 m (W × L × H)
**Speaker positions:** Left 1.1 m from front wall, Right 1.0 m from front wall, 2.8 m apart
**Listener position:** 3.2 m from front wall, centered
**Surface assumptions:** Carpet floor (0.3), painted drywall walls (0.15), ceiling (0.1), large window on south wall (0.05)
**Confidence:** Medium — window area estimated from photo

**Review in Listening Lab:** [navigate_acoustom to listening_lab]
**Edit any value before I simulate.**
```

**Music preference summary:**
```md
### Music profile from your [Spotify / Apple Music / uploaded track]

**Top genres:** Jazz (35%), Vocal (22%), Classical (18%), Electronic (15%), Rock (10%)
**Key artists:** Norah Jones, Diana Krall, Bill Evans, Deadmau5, Pink Floyd
**Representative track selected:** "Vocal detail" (built-in reference track for jazz vocals)
**Why this track:** Emphasizes midrange clarity and natural timbre — matches your vocal-heavy listening

**Loaded in Listening Lab:** [navigate_acoustom to listening_lab]
**Want a different track? Tell me or pick from the reference track list.**
```

Collect only what changes the outcome:

- room size or actual dimensions, and how the room is furnished;
- listening preference (balanced, reference, warm, immersive) and typical listening distance;
- preferred format (standmount, floorstanding, active) and any placement constraints;
- budget in USD; and
- whether the user wants a catalog product, a custom build, or both compared.

Never invent these. **At every missing input, offer connected-source fetch + manual upload + type-it-yourself before proceeding.** Do not rank speakers until the material inputs are supplied or the user explicitly authorises the stated assumptions.

## Bring outside context in

The platform has no Spotify, photo-analysis, or floor-plan integration. Anything of that kind comes from an app connection available to the agent. Offer it only when it would materially improve the current workflow, obtain explicit approval before retrieving anything, and offer a no-data fallback. Then land the approved context in the page so the user sees the same thing:

- room photos or floor plans you can already see → `attach_room_reference_images` to show them in the listening lab, then `apply_agent_room_estimate` for editable dimensions, preset, and layout;
- room images the user uploaded in the lab → `get_room_reference_images`;
- playlists or listening habits → `set_music_preferences`, then `set_reference_track` to audition something representative.

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

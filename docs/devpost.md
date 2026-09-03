# Acoustom — Great sound is personal. Acoustom takes the guesswork out of buying decisions.

Acoustom is an AI-assisted speaker builder and listening-room simulator that helps users find the setup that best fits their **room, music, budget, equipment, and personal preferences**.

With WebMCP, an agent can bring relevant user context into Acoustom, guide the user through the experience, build and customize products with them, rapidly explore technically compatible alternatives, test them through simulation, compare the trade-offs, and recommend the strongest option — all through the same shared interface.

## At a glance

**Personalized to the listener**
Acoustom optimizes around the user's room, music, budget, aesthetics, existing equipment, and priorities — not a generic “best speaker” ranking.

**Bring your context with you**
The agent can use relevant context from services the user already has connected — such as room information from Google Drive, existing equipment documented elsewhere, or listening preferences from music history — without Acoustom needing a native integration with every platform.

**Navigate and guide through the experience**
The agent can visibly move through Acoustom's catalog, product details, builder, room setup, simulation, and comparison views while explaining what it is doing and why. The user follows the same journey, sees the progress, and can redirect the agent at any point.

**Build and customize together in 3D**
The agent can actively build and customize the speaker inside Acoustom's shared 3D builder — selecting components, changing the enclosure and configuration, adjusting placement, and iterating on the design while the user watches, evaluates, and makes changes alongside it.

**Generate and test alternatives quickly**
Instead of manually building one option at a time, the agent can create and batch-configure multiple viable builds, test them, eliminate weaker options, and refine the strongest candidates.

**Simulation-backed recommendations and trade-offs**
Acoustom uses technical data and simulation to test candidate builds before recommending them. The agent compares sound, size, price, aesthetics, power requirements, room suitability, and existing-equipment compatibility against the user's priorities, then proposes the strongest overall solution and explains the trade-offs. Users can inspect the evidence visually, technically, and through simulated audio using a standard reference track or their own audio.

**Technical complexity, simplified**
The agent translates specifications, compatibility constraints, and simulation results into practical explanations such as *better bass but a larger enclosure*, *better fit for your amplifier*, or *smoother response from your listening position*.

**Explore before you commit**
Users can freely browse the catalog, enter the builder, configure speakers, run simulations, and compare options without creating an account.

### The workflow

**Bring context → explore → build together → generate alternatives → check compatibility → simulate & compare → explain trade-offs → optimize → recommend → refine → decide**

---

## The problem

Choosing the right speaker is difficult because specifications and reviews only tell part of the story.

How a system performs depends on the complete setup: components, enclosure, amplifier, placement, room, listening position, budget, and what the person actually likes to listen to. A component that looks great on paper may not be the best choice once everything is considered together.

For most people, finding the right setup means technical research and repeated trial and error:

**choose → configure → check compatibility → test → compare → change something → repeat**

The information needed to make a personalized decision may also already exist elsewhere — room plans in Google Drive, measurements in documents, existing equipment details, or listening preferences reflected in music history.

Traditional shopping experiences often ask the user to recreate this context manually, require the platform to build separate integrations with every service, or force users through sign-up before they can meaningfully experience the product.

Acoustom is designed to remove that friction.

## What I built

Acoustom is a WebMCP-powered custom speaker builder, product catalog, and virtual listening-room simulator.

Users can browse products and components, build and customize a speaker in 3D, configure their room and listening position, compare alternatives, and hear simulated differences through the normal visual interface.

With WebMCP, an agent can work directly with those same structured capabilities.

It can understand the user's requirements, navigate through the product experience, actively build and modify configurations in the shared builder, propose compatible alternatives, test them through Acoustom's simulation, compare their trade-offs, and recommend the option that best matches the user's priorities.

The agent does not stop at producing a plausible recommendation.

**It tests the proposal using Acoustom's technical data and simulation before recommending it.**

That turns the process from product search into:

**understand → build → test → validate → compare → optimize**

The core Acoustom experience is also intentionally open.

A user does not need to create an account before they can browse the catalog, enter the builder, configure a speaker, explore the room simulator, or compare alternatives.

This matters even more in an agent-assisted experience. The agent can begin helping immediately — bringing in relevant context, navigating the user through the experience, configuring options, running tests, and explaining the results — without interrupting the journey with registration before the user has received value.

The experience starts with **exploration and product immersion, not account creation**.

## Why this is a strong fit for WebMCP

WebMCP works particularly well for Acoustom because the **agent and the website contribute different capabilities to the same decision**.

The agent understands the user.

With the user's permission, it can use context already available through services connected to their AI environment.

For example:

* room dimensions, layouts, or photos from Google Drive
* existing equipment information from documents
* listening preferences reflected in music history
* budget, size, aesthetic, and other preferences expressed in conversation

Acoustom does not need to integrate directly with every possible service or receive the user's entire personal context.

Instead, the agent can translate that broader context into only the constraints Acoustom actually needs:

**room size, available space, listening position, budget, existing equipment, sound preferences, and design priorities.**

Acoustom contributes the domain-specific capability.

It knows the product catalog, component specifications, compatibility constraints, current build, room configuration, placement, and simulation results.

In simple terms:

**the agent understands the user → Acoustom understands the speaker system → WebMCP lets them solve the decision together**

WebMCP also gives the agent a shared application environment rather than reducing the interaction to a final answer.

The agent can navigate the same experience the user sees, take them to the relevant product or configuration step, and explain what matters along the way.

Once inside the builder, it can work on the product itself.

It can select components, change configuration parameters, modify the 3D build, adjust the room setup, and visibly iterate with the user.

This distinction matters:

**navigation helps the user understand and move through the process.**

**shared building lets the user and agent actually create and refine the solution together.**

Speaker design is also a system-level optimization problem.

Changing one component can affect enclosure requirements, amplification, crossover behavior, cost, physical size, acoustic performance, and the suitability of other components.

An agent can explore those relationships much faster than a user manually rebuilding each possibility.

Instead of merely clicking through a configurator, it can use Acoustom as a specialized environment to **build, test, compare, and refine possible solutions**.

## Better experience for people and agents

A person can still use Acoustom normally.

They can browse products, configure a speaker in the 3D builder, adjust the room, change placement, compare alternatives, listen to results, and modify any decision manually.

The agent adds several layers of assistance without replacing that experience.

### The agent can navigate and guide

The agent can move through Acoustom's workflow while keeping the user oriented.

It might open a relevant product, move into the builder, switch to the room view, run a simulation, and then open the comparison.

The user sees the same pages and progress.

The agent can explain:

> “I've narrowed this to three suitable drivers. I'm opening the builder now so we can compare how they affect the enclosure.”

or:

> “The configuration looks technically viable. I'm moving to the room simulation to see how it behaves from your listening position.”

This turns navigation into part of the explanation rather than hidden automation.

### The agent can build and customize with the user

Inside the 3D builder, the interaction becomes collaborative.

The agent can assemble and modify the product while the user watches the design evolve.

It can change components, enclosure characteristics, dimensions, placement, or other supported configuration choices based on the user's requirements and the results of previous tests.

The user might say:

> “I like this design, but I want something less bulky.”

The agent can modify the build in front of them rather than simply describing what they should change.

Or:

> “Keep this woofer, but try the other tweeter.”

The agent can preserve the parts the user likes and change only the relevant component.

This turns the builder into a **shared design space**, rather than a form the agent fills out on the user's behalf.

### The agent can explore more options faster

Speaker building is not simply a matter of putting individually good components together.

The components form a system.

A different driver may require a different enclosure. Changing the enclosure can affect acoustic behavior and physical size. Amplification, crossover choices, room placement, and the user's existing equipment create further constraints.

The agent can reason across these relationships while exploring multiple alternatives.

Instead of requiring the user to manually build and test configurations one by one:

**Build A → test → rebuild → Build B → test → rebuild → Build C → compare**

the agent can rapidly explore:

**Build A + Build B + Build C**

↓

**cross-component and system compatibility**

↓

**simulation**

↓

**technical + user-priority comparison**

↓

**refinement**

↓

**recommended option**

This makes a highly technical iterative process much more efficient.

### Simulation validates the recommendation

Simulation is part of the decision process, not a decorative visualization.

The agent can use Acoustom to test candidate configurations, identify weaker combinations, compare their behavior, revise them, and validate the strongest options before recommending one.

It can compare the results against the user's priorities across factors such as:

* sound performance
* size
* price
* aesthetics
* power requirements
* room suitability
* compatibility with existing equipment

For example:

**Option A**
Strongest bass extension, but requires a larger enclosure and more amplifier power.

**Option B**
Slightly less bass, but smaller, within budget, compatible with the user's existing amplifier, and smoother in the room simulation.

**Option C**
Lowest cost, but less suitable for the user's preferred listening level.

The agent uses these trade-offs — together with the technical and simulation data — to propose the strongest overall solution.

For example:

> “Option B is the best fit for you because it stays within your available space and budget, works with the amplifier you already own, and produces the smoother simulated response from your listening position. Option A extends lower, but the added size and power requirements conflict with the priorities you gave me.”

That changes the experience from:

**“These components should probably work well.”**

to:

**“I tested several compatible configurations. This one best matches your priorities, and here is the evidence behind that decision.”**

The recommendation is supported by three layers:

**Technical data** establishes facts and constraints.

**Simulation** tests the behavior of the proposed configuration.

**The agent** interprets those results against the user's priorities and recommends the best trade-off.

### See and hear the difference

Users do not have to rely only on a technical score or recommendation.

They can inspect candidate builds visually and compare simulated audio.

A common reference track makes it possible to hear the same material through each simulated configuration for a consistent comparison.

The user can also upload their own reference audio and repeat the comparison with music they already know.

This connects technical simulation to something more intuitive:

**not just “what does the graph say?” but “what difference does this make to what I hear?”**

### Technical complexity becomes understandable

The user does not need to interpret every specification, compatibility rule, or acoustic graph themselves.

The agent can translate technical results into practical consequences:

> “This design gives you deeper bass, but the enclosure needs to be significantly larger.”

> “This alternative is a better match for the amplifier you already own.”

> “Moving the speakers forward gives a smoother simulated result from where you sit.”

The underlying data remains available, but the user can make the decision at the level of detail they are comfortable with.

### A lower-friction product journey

Three parts of the experience reinforce each other.

**Bring context without re-entering it.**
The user's agent can carry relevant information from services they already use.

**Start immediately without an account wall.**
The user can experience the catalog, builder, and simulator before being asked to identify themselves.

**Navigate, build, and evaluate together.**
The agent can guide the user through the experience and actively customize the product in the shared 3D builder while explaining what it is doing.

Together, these make the experience more personalized, transparent, immediate, and immersive.

The user reaches the useful part of Acoustom faster:

**arrive → bring context → explore → build together → test → compare → refine → decide**

## A realistic demo scenario

Imagine someone wants compact speakers for a home office.

They open Acoustom without creating an account and ask:

```text
I have a floor plan and photos of my office in Google Drive.

Use them to understand my room and desk space. Consider the kind of music
I listen to, and build three compact options under $1,000 that work with
my existing amplifier.

Test the strongest options and recommend the best trade-off.
```

With the user's permission, the agent uses their connected context.

It does not need to pass Acoustom the user's entire Google Drive files, music history, or broader personal profile.

Instead, it translates that information into the design constraints required by Acoustom:

* available room and desk space
* approximate listening position
* existing equipment
* budget
* listening preferences
* size or aesthetic priorities

The agent then visibly guides the user through Acoustom.

It navigates to the relevant products, enters the builder, and begins creating the candidate designs.

Inside the shared 3D builder, the user sees the builds take shape and can intervene as the agent works.

The complete flow is:

1. understand the user's context and constraints
2. navigate to the relevant products and builder
3. create several viable speaker configurations in the 3D builder
4. check cross-component and system compatibility
5. configure the room and listening position
6. simulate the strongest candidates
7. compare sound, size, price, aesthetics, power requirements, room suitability, and existing-equipment compatibility
8. eliminate weaker alternatives
9. explain the important trade-offs
10. recommend the strongest overall fit based on the user's priorities and simulation results

The user can compare the finalists using the same standard reference audio.

They can then upload a familiar track and repeat the comparison using their own music.

After listening, they might say:

```text
I prefer the second one, but it is still too large.

Keep what works about that design, make it smaller, and stay under $800.
```

The agent does not start over.

It returns to the existing build, preserves the relevant choices, modifies the design in the shared builder, reruns the required tests, and shows the updated comparison.

The interaction becomes an iterative optimization loop:

**build → test → compare → refine → rebuild → retest**

## Key Features

* Personalized speaker design based on room, listening preferences, budget, aesthetics, and existing equipment
* Context from user-authorized connected services without requiring Acoustom to build every integration
* Agent-guided navigation through catalog, builder, room setup, simulation, and comparison
* Collaborative product customization inside the shared 3D builder
* System-level and cross-component compatibility reasoning
* Agent-generated and batch-configured build alternatives
* Simulation-backed recommendations based on technical results and user-specific trade-offs
* Visual and simulated-audio comparison using standard or user-uploaded reference audio
* Plain-language explanation of complex technical data
* Catalog, builder, simulator, bag, and wishlist accessible without required sign-in

## Supported WebMCP tools

Acoustom registers **42 WebMCP tools** with `document.modelContext.registerTool()`. The tools below are the live application surface in `apps/frontend/src/hooks/useWebMcp.ts`.

| **Capability** | **Registered tools** | **What the agent can do** |
| --- | --- | --- |
| Orientation and shared state | `get_acoustom_overview`, `list_acoustom_skills`, `get_acoustom_skill`, `list_webmcp_tools`, `get_webmcp_tool_contract`, `get_user_context`, `get_acoustom_workflow` | Learn the site, discover available workflows and tools, inspect a tool contract, and read the current visible application state. |
| Navigation | `get_navigation_context`, `navigate_acoustom` | Read and change the user-visible page and carry product, build, speaker, comparison, or reference-track context into that view. |
| Catalog and recommendations | `recommend_speakers`, `list_products`, `get_product`, `compare_speakers`, `set_comparison_selection` | Find products, retrieve structured specifications, generate requirement-based recommendations, compare speakers, and set the visible comparison set. |
| Listening preferences and reference audio | `list_reference_tracks`, `set_reference_track`, `upload_reference_audio`, `set_music_preferences` | List and select standard reference tracks, load agent-provided base64 audio into the browser-local listening lab, and store the user’s stated listening preferences. |
| Room and listening setup | `get_room_simulation_presets`, `get_room_estimate_contract`, `attach_room_reference_images`, `get_room_reference_images`, `apply_agent_room_estimate`, `get_current_room_spec`, `set_listening_lab_speaker`, `refresh_room_simulation` | Inspect room-input guidance and presets, attach and retrieve user-provided room images, apply an agent-provided room estimate, read the current room spec, select the lab speaker, and refresh the simulation. |
| Simulation and audio evidence | `get_live_simulation_result`, `get_shared_simulated_audio`, `simulate_speaker_in_room`, `simulate_custom_speaker_in_room` | Read simulation results, retrieve shared simulated audio, and test catalog or custom speakers in the configured room. |
| Custom speaker builder | `get_custom_speaker_builder_options`, `fill_custom_builder_form`, `validate_custom_speaker_build`, `generate_custom_build_sheet` | Inspect builder choices, populate the shared custom-build form, validate a configuration, and generate its build sheet. |
| Saved builds | `list_saved_custom_configurations`, `get_saved_custom_configuration`, `save_custom_configuration`, `delete_saved_custom_configuration`, `list_local_builds`, `save_local_build`, `delete_local_build`, `rename_local_build` | List, inspect, save, rename, and delete custom configurations and local builder drafts. |
| Bag and wishlist | `get_cart`, `get_wishlist`, `add_to_cart`, `update_cart_quantity`, `remove_from_cart`, `toggle_wishlist` | Read and update the local bag and wishlist. These tools stop at the pre-checkout experience; Acoustom does not expose a checkout or purchase tool. |

## How I implemented WebMCP

Acoustom exposes its structured application capabilities through WebMCP using `document.modelContext.registerTool()`. The hook keeps a reference to that browser API as `context`, checks that WebMCP is available, and registers the app's tools with one shared `AbortSignal`.

For example, this is the catalog tool pattern used by the frontend:

```javascript
const context = document.modelContext;
if (!context?.registerTool) return;

const controller = new AbortController();

const listProductsTool = {
  name: "list_products",
  title: "List speakers",
  description:
    "Returns the current Acoustom catalog: name, type, price, tone, and category.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: () =>
    products.map(({ name, type, price, tone, category }) => ({
      name,
      type,
      price,
      tone,
      category,
    })),
};

await context.registerTool(listProductsTool, { signal: controller.signal });

// The app registers all tools this way and aborts registration on unmount.
return () => controller.abort();
```

In the live hook, `products` is read from the latest React state and the complete tool list is registered with `Promise.all`. The tool contract uses an object input schema with `additionalProperties: false`, read-only annotations where appropriate, and an `execute` function that reads or updates the same application stores used by the visible UI.

The important part is that WebMCP tools and the human interface operate on the same underlying application state.

When the agent navigates to another stage, changes the 3D build, modifies the room, runs a simulation, or compares alternatives, those changes appear in the normal Acoustom interface.

This lets the user and agent operate on the same state instead of maintaining separate representations of the task.

The responsibilities are also clearly separated:

**The agent** contributes user context, reasoning, navigation, exploration, and interpretation.

**Acoustom** contributes structured product data, engineering constraints, the interactive builder, configuration, simulation, and the visual and audible environment used to evaluate the result.

WebMCP provides the interface through which those capabilities work together.

## What is real, and what is intentionally simulated

Acoustom combines technical product data and real application state with modeled acoustic behavior.

The final submission should clearly distinguish three layers.

**Technical data**
Product specifications, component characteristics, dimensions, prices, compatibility constraints, and other source data used by the builder.

**Calculated and simulated results**
The modeled behavior produced by Acoustom for a particular build, room, placement, and listening configuration, including the simulated audio comparison where applicable.

**Agent interpretation**
Why one option is recommended over another based on the technical evidence and the user's stated priorities.

Acoustom does not present its simulation as a perfect reproduction of every physical listening environment.

Its purpose is to test proposed configurations consistently, reveal meaningful differences, validate assumptions, compare alternatives, and provide additional evidence before the user makes a decision.

## Why it matters

Most AI shopping experiences stop at recommendations.

Acoustom lets the agent **build and test the recommendation before asking the user to trust it**.

The agent can bring relevant personal context into a specialized product environment, guide the user through the workflow, actively customize the product with them, generate multiple technically viable options, rapidly test them, compare the results, explain the trade-offs, and refine the solution together.

Each side contributes what it does best.

**The agent** understands the user's context, preferences, goals, and constraints and can rapidly explore alternatives.

**Acoustom** understands speaker products, component relationships, configuration, compatibility, room setup, 3D customization, and acoustic simulation.

**The user** contributes judgment, preferences, and the final decision.

And because all three operate through the same visible product experience, the process remains understandable and controllable.

Three UX advantages reinforce each other:

**The user's context travels with them.**

**The user can start exploring without an account wall.**

**The agent can navigate, build, test, and explain through the same interface the user sees.**

The result is a lower-friction journey:

**explore without signing in → bring context → navigate together → build together → validate compatibility → simulate & compare → understand trade-offs → refine → decide → authenticate only when ready to buy**

Acoustom turns speaker selection from guesswork into a **personalized, evidence-backed and collaborative decision process**.

## Testing

Open the live app in ChatGPT's in-app browser or Chrome with WebMCP enabled.

The final test flow should demonstrate:

1. browsing the catalog and entering the builder without authentication
2. bringing relevant user context into the workflow
3. visibly navigating between catalog, builder, room, simulation, and comparison
4. creating and modifying a product inside the shared 3D builder
5. configuring multiple candidate builds
6. checking component and system compatibility
7. running the simulation workflow for the strongest candidates
8. comparing technical, visual, and simulated-audio results
9. explaining user-relevant trade-offs in plain language
10. changing a constraint and modifying the existing build rather than starting over
11. comparing candidates using standard reference audio
12. repeating the comparison using user-provided reference audio
13. loading and comparing agent-provided reference audio

Add the final registered WebMCP tool count, automated test results, browser compatibility, repository instructions, and production-build verification here.

# Custom speaker configuration system

## Product principle

The configurator should feel like an Acoustom product selector, not a CAD tool.
Customers choose a small number of meaningful product decisions. The platform
catalog owns driver matching, crossover topology, safe cabinet proportions, and
manufacturing tolerances.

## Customer journey

1. **Brief** — format, room size, listening distance, and preferred sound.
2. **Acoustic platform** — four curated bases: compact 2-way, extended 2-way,
   reference 3-way, or active subwoofer. Recommend one, then offer the others.
3. **Bass character** — tight, balanced, or extended. This exposes sealed or
   ported alignment and only shows port tuning when it is meaningful.
4. **Cabinet** — one size range, edge profile, grille, and base. Dimensions
   remain derived from the selected acoustic platform.
5. **Finish** — a concise finish family with 5–7 standard choices and a design
   review route for a custom colour.
6. **Personal mark** — none by default; engraving, inlaid pattern, print/decal,
   or customer-supplied artwork. Artwork is restricted to side/rear/badge zones,
   requires rights confirmation, and enters review before manufacture.
7. **Review** — show derived acoustic specs, manufacturing lead time, pricing,
   and any design-review warning before the simulation or order request.

## Choice-load guardrails

- Recommend a default at every step and reveal advanced alternatives only after
  the user chooses to compare them.
- Never expose raw crossover values, driver part numbers, port length, or free
  cabinet dimensions in the standard journey.
- Allow one personalisation treatment per build; this avoids conflicting visual
  layers and makes manufacturing review predictable.
- Keep baffle and driver areas free of printed/decal artwork. Engraving is
  limited to rear badge or lower side placement.
- Treat uploaded artwork as an asset workflow: upload, rights confirmation,
  design review, approval/rejection, then manufacture.

## Ownership boundary

`CustomSpeakerConfiguration` is the customer request. The engineering service
turns it into derived drivers, impedance, sensitivity, bass extension, pricing,
and manufacturing status. The 3D editor renders the request and derived result;
it does not become the source of engineering truth.

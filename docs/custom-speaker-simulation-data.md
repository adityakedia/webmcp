# Custom-speaker simulation data contract

The builder submits one `CustomSpeakerConfiguration` to `POST /api/custom-speakers/`.
The API derives drivers, source assets, physical build data, and a simulation profile.
The browser stores that returned profile for the simulator; it does not invent driver
or crossover values.

## Acoustic configuration fields

| Field | Physical meaning | Simulation policy |
| --- | --- | --- |
| `alignment` | Sealed or vented enclosure | Selects a documented reference or a supported component model. |
| `netVolumeLitres` | Net air volume after driver, brace and port displacement | Used by the Mimir sealed-box small-signal model. |
| `tuningHz` | Helmholtz tuning of a vented enclosure | Reference-only unless a matching verified vented model exists. |
| `portInnerDiameterMm` / `portLengthMm` | Port geometry | Must match a published reference for a `reference_ready` vented profile. |
| `dampingDescription` | Absorptive material and placement | Retained in the build spec; changes require completed-system measurement. |
| `cabinet` and `personalisation` fields | Physical/cosmetic manufacture choices | Do not modify the acoustic transfer model. |

Finish, grille treatment, base style, edge profile, engraving, and approved exterior
artwork are therefore manufacturing/presentation choices. They remain part of the
generated speaker specification, but do not invalidate an otherwise matching acoustic
reference. Driver substitution, enclosure, port, baffle, damping, and crossover changes
are acoustic choices and do invalidate it unless a supported component model is available.

## Profile statuses

| Status | Meaning | Simulator acceptance |
| --- | --- | --- |
| `reference_ready` | The submitted format, alignment, volume and port geometry match an explicitly complete published reference package. | Accepted. |
| `component_model_ready` | A documented small-signal component calculation is available. Currently this is a sealed SEAS Mimir using CA18RNX T/S values and selected net volume. | Accepted, labelled analytical. |
| `requires_measurement` | No complete fixed reference or defensible component model exists for the configuration. | Rejected. |

## Local source data

| Platform | Local data | Transfer path |
| --- | --- | --- |
| SEAS Mimir (`two_way_compact`) | CA18RNX/27TDFC FRD + ZMA, official driver datasheets, Mimir plan | Measured-driver/crossover reference; sealed variants use official CA18RNX T/S parameters. |
| SEAS Aphel (`two_way_extended`) | Official in-cabinet response/impedance curves at 0–60°, VituixCAD project | Component data is available, but final adjustable port length prevents release as a fixed reference. |
| SEAS 403 Revisited (`three_way_reference`) | All driver-angle responses, impedances, summed response, polarity check, VituixCAD project | Published completed-system response. |
| Dayton DCS165-4 active mini-sub (`subwoofer_active`) | Published kit/DSP/driver specifications | Measurement-required: official FRD/ZMA download is upstream-protected and no completed transfer package is local. |

## Server gate

`SimulationSpeakerProfile` is validated server-side. A browser cannot make Aphel
or the subwoofer simulation-ready by posting a forged `reference_ready` status.
Only the reference IDs explicitly marked eligible in the catalog, and the supported
sealed Mimir component-model input, reach `SimulationService`.

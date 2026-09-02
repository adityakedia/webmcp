import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type {
  CustomSpeakerConfiguration,
  AcousticPlatformId,
  CabinetFinishId,
  PersonalisationKind,
} from "@acoustom/types";
import type { Product } from "../App";
import ProceduralSpeaker from "./ProceduralSpeaker";
import SimulatorPage from "./SimulatorPage";
import {
  createLocalBuild,
  readLocalBuilds,
  removeLocalBuild,
  upsertLocalBuild,
  MAX_LOCAL_BUILDS,
  type LocalBuild,
} from "../lib/localBuilds";
import {
  deleteBuildFromAccount,
  syncBuildToAccount,
  validateBuild,
} from "../lib/customBuildRepository";

type Props = { products: Product[]; onBack: () => void };
type Category =
  "format" | "platform" | "bass" | "cabinet" | "finish" | "personalisation";

const money = (value: number) =>
  value ? `+$${value.toLocaleString()}` : "Included";
const platformBass = {
  two_way_compact: {
    tuningHz: 42,
    netVolumeLitres: 14,
    portInnerDiameterMm: 50,
    portLengthMm: 200,
  },
  two_way_extended: { tuningHz: 36, netVolumeLitres: 55 },
  three_way_reference: {
    tuningHz: 30,
    netVolumeLitres: 44,
    portInnerDiameterMm: 67,
    portLengthMm: 139.5,
  },
  subwoofer_active: { tuningHz: 36, netVolumeLitres: 18 },
} as const;
const options = {
  format: [
    {
      id: "standmount",
      title: "Standmount",
      image: "platform-compact.png",
      price: 0,
      copy: "Compact, stand-supported form.",
    },
    {
      id: "floorstanding",
      title: "Floorstanding",
      image: "platform-extended.png",
      price: 450,
      copy: "Full-height cabinet with more scale.",
    },
  ],
  platform: [
    {
      id: "two_way_compact",
      title: "SEAS Mimir · 2-way",
      image: "platform-compact.png",
      price: 2400,
      copy: "Tweeter + 6.5″ woofer · focused imaging.",
    },
    {
      id: "two_way_extended",
      title: "SEAS Aphel · 2-way",
      image: "platform-extended.png",
      price: 3200,
      copy: "Tweeter + 8″ woofer · deeper reach.",
    },
    {
      id: "three_way_reference",
      title: "SEAS 403 Revisited · 3-way",
      image: "platform-three-way.png",
      price: 4300,
      copy: "Tweeter + mid + woofer · full range.",
    },
    {
      id: "subwoofer_active",
      title: "Dayton active sub",
      image: "platform-subwoofer.png",
      price: 1400,
      copy: "Powered low-frequency foundation.",
    },
  ],
  enclosure: [
    {
      id: "ported",
      title: "Bass reflex",
      image: "ported.png",
      price: 160,
      copy: "Vented cabinet for deeper extension.",
    },
    {
      id: "sealed",
      title: "Sealed",
      image: "sealed.png",
      price: 120,
      copy: "Closed cabinet for firmer control.",
    },
  ],
  character: [
    {
      id: "tight",
      title: "Tight",
      image: "sealed.png",
      price: 0,
      copy: "Fast, controlled low end.",
    },
    {
      id: "balanced",
      title: "Balanced",
      image: "ported.png",
      price: 80,
      copy: "Even weight and control.",
    },
    {
      id: "extended",
      title: "Extended",
      image: "platform-extended.png",
      price: 160,
      copy: "More depth and room energy.",
    },
  ],
  size: [
    {
      id: "compact",
      title: "Compact",
      image: "platform-compact.png",
      price: 0,
      copy: "Smallest footprint.",
    },
    {
      id: "standard",
      title: "Standard",
      image: "grille-fabric.png",
      price: 220,
      copy: "Balanced proportions.",
    },
    {
      id: "large",
      title: "Large",
      image: "platform-three-way.png",
      price: 520,
      copy: "More internal volume.",
    },
  ],
  grille: [
    {
      id: "none",
      title: "Open",
      image: "woofer-reference.png",
      price: 0,
      copy: "Drivers remain visible.",
    },
    {
      id: "magnetic_fabric",
      title: "Magnetic fabric",
      image: "grille-fabric.png",
      price: 90,
      copy: "Soft acoustic protection.",
    },
    {
      id: "perforated_metal",
      title: "Perforated metal",
      image: "black-ash.png",
      price: 170,
      copy: "Rigid protective grille.",
    },
  ],
  base: [
    {
      id: "plinth",
      title: "Plinth",
      image: "base-plinth.png",
      price: 0,
      copy: "Grounded floor profile.",
    },
    {
      id: "slim_feet",
      title: "Slim feet",
      image: "platform-extended.png",
      price: 60,
      copy: "Minimal floor lift.",
    },
    {
      id: "stand",
      title: "Stand",
      image: "base-stand.png",
      price: 340,
      copy: "Dedicated standmount support.",
    },
  ],
  edge: [
    {
      id: "soft_radius",
      title: "Soft radius",
      image: "edge-soft.png",
      price: 0,
      copy: "Gentle rounded edge.",
    },
    {
      id: "sculpted_radius",
      title: "Sculpted radius",
      image: "black-ash.png",
      price: 180,
      copy: "More pronounced contour.",
    },
  ],
  finish: [
    {
      id: "walnut",
      title: "Natural walnut",
      image: "walnut.png",
      price: 0,
      copy: "Warm open-grain veneer.",
    },
    {
      id: "black_ash",
      title: "Black ash",
      image: "black-ash.png",
      price: 150,
      copy: "Dark open-grain veneer.",
    },
    {
      id: "satin_white",
      title: "Satin white",
      image: "satin-white.png",
      price: 120,
      copy: "Smooth painted surface.",
    },
  ],
  personalisation: [
    {
      id: "none",
      title: "None",
      image: "personalisation-none.png",
      price: 0,
      copy: "Uninterrupted cabinet surface.",
    },
    {
      id: "engraving",
      title: "Engraving",
      image: "personalisation-engraving.png",
      price: 120,
      copy: "Subtle side-panel maker detail.",
    },
    {
      id: "pattern",
      title: "Pattern",
      image: "personalisation-pattern.png",
      price: 220,
      copy: "Repeated side-panel motif.",
    },
    {
      id: "printed_panel",
      title: "Printed panel",
      image: "personalisation-printed-panel.png",
      price: 350,
      copy: "Full side-panel graphic.",
    },
    {
      id: "decal",
      title: "Decal",
      image: "personalisation-decal.png",
      price: 160,
      copy: "Small side-panel graphic.",
    },
    {
      id: "custom_artwork",
      title: "Custom artwork",
      image: "personalisation-custom-artwork.png",
      price: 500,
      copy: "Artwork prepared for review.",
    },
  ],
} as const;

function Card({
  item,
  selected,
  onClick,
  disabled = false,
}: {
  item: { title: string; image: string; price: number; copy: string };
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`selection-card${selected ? " selected" : ""}`}
    >
      <img src={`/images/components/${item.image}`} alt="" />
      <div className="selection-card-main">
        <div>
          <strong>{item.title}</strong>
          <span>{item.copy}</span>
          <em>{money(item.price)}</em>
        </div>
        <i>{selected ? "−" : "+"}</i>
      </div>
      {selected && (
        <div className="selection-card-details">
          <div>
            <small>Selection</small>
            <b>{item.copy}</b>
          </div>
          <div>
            <small>Price impact</small>
            <b>{money(item.price)}</b>
          </div>
        </div>
      )}
    </button>
  );
}

export default function CustomDesignBuilder({ products, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Category[]>([]);
  const stored = readLocalBuilds();
  const initialBuild =
    stored?.builds.find((build) => build.id === stored.activeBuildId) ??
    stored?.builds[0];
  const [builds, setBuilds] = useState<LocalBuild[]>(stored?.builds ?? []);
  const [activeBuildId, setActiveBuildId] = useState(initialBuild?.id ?? "");
  const [buildName, setBuildName] = useState(
    initialBuild?.name ?? "Untitled 01",
  );
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const [state, setState] = useState({
    format: initialBuild?.configuration.brief.format ?? "standmount",
    platform:
      initialBuild?.configuration.platformId ??
      ("two_way_compact" as AcousticPlatformId),
    enclosure: initialBuild?.configuration.bass.alignment ?? "ported",
    character: initialBuild?.configuration.bass.bassCharacter ?? "balanced",
    size: initialBuild?.configuration.cabinet.size ?? "standard",
    grille: initialBuild?.configuration.cabinet.grille ?? "magnetic_fabric",
    base: initialBuild?.configuration.cabinet.base ?? "stand",
    edge: initialBuild?.configuration.cabinet.edgeProfile ?? "soft_radius",
    finish:
      initialBuild?.configuration.cabinet.finish ??
      ("walnut" as CabinetFinishId),
    personalisation:
      initialBuild?.configuration.personalisation.kind ??
      ("none" as PersonalisationKind),
  });
  const choose = <K extends keyof typeof state>(
    category: Category,
    key: K,
    value: (typeof state)[K],
  ) => {
    setState((current) => ({ ...current, [key]: value }));
    setTouched((current) =>
      current.includes(category) ? current : [...current, category],
    );
  };
  const platform = options.platform.find((item) => item.id === state.platform)!;
  const config = useMemo<CustomSpeakerConfiguration>(() => {
    const bass = platformBass[state.platform];
    return {
      version: 1,
      name: buildName || "Custom speaker",
      brief: {
        format: (state.platform === "subwoofer_active"
          ? "subwoofer"
          : state.format) as "standmount" | "floorstanding" | "subwoofer",
        soundProfile: "balanced",
        roomSize: "medium",
        listeningDistanceM: 2.5,
      },
      platformId: state.platform,
      bass: {
        alignment: state.enclosure as "ported" | "sealed",
        bassCharacter: state.character as "tight" | "balanced" | "extended",
        ...(state.enclosure === "ported"
          ? bass
          : { netVolumeLitres: bass.netVolumeLitres }),
      },
      cabinet: {
        size: state.size as "compact" | "standard" | "large",
        finish: state.finish,
        finishFamily: state.finish === "satin_white" ? "paint" : "veneer",
        grille: state.grille as "none" | "magnetic_fabric" | "perforated_metal",
        base:
          state.format === "standmount"
            ? (state.base as "plinth" | "slim_feet" | "stand")
            : state.base === "stand"
              ? "slim_feet"
              : (state.base as "plinth" | "slim_feet"),
        edgeProfile: state.edge as "soft_radius" | "sculpted_radius",
      },
      personalisation:
        state.personalisation === "none"
          ? { kind: "none" }
          : state.personalisation === "engraving"
            ? {
                kind: "engraving",
                engraving: {
                  text: "ACOUSTOM",
                  font: "modern_sans",
                  placement: "side_lower",
                },
              }
            : {
                kind: state.personalisation,
                artwork: {
                  application: "side_panel",
                  treatment:
                    state.personalisation === "pattern"
                      ? "inlaid_pattern"
                      : state.personalisation === "printed_panel"
                        ? "uv_print"
                        : "matte_decal",
                  rightsConfirmed: true,
                  status: "approved",
                },
              },
    };
  }, [state, buildName]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validateAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    window.localStorage.setItem(
      "acoustom-custom-builder-draft",
      JSON.stringify(config),
    );
    if (!activeBuildId && touched.length === 0) return;
    const existing = readLocalBuilds()?.builds.find(
      (build) => build.id === activeBuildId,
    );
    const build = existing ?? createLocalBuild(config, buildName);
    const name = buildName.trim() || "Untitled build";
    const pending = {
      ...build,
      name,
      configuration: { ...config, name },
      updatedAt: new Date().toISOString(),
    };
    upsertLocalBuild(pending);
    if (!activeBuildId) setActiveBuildId(build.id);
    setBuilds(readLocalBuilds()?.builds ?? []);
    validateAbortRef.current?.abort();
    const controller = new AbortController();
    validateAbortRef.current = controller;
    const timer = window.setTimeout(() => {
      setValidationError(null);
      void validateBuild(pending.configuration, controller.signal)
        .then(async (validated) => {
          if (controller.signal.aborted) return;
          const complete = { ...pending, derived: validated.derived };
          upsertLocalBuild(complete);
          window.sessionStorage.setItem(
            "acoustom-custom-speaker-profile",
            JSON.stringify(validated.derived.simulationProfile),
          );
          const synced = await syncBuildToAccount(complete);
          if (controller.signal.aborted) return;
          upsertLocalBuild(synced);
          setBuilds(readLocalBuilds()?.builds ?? []);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setValidationError(
            error instanceof Error
              ? error.message
              : "Build validation failed",
          );
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [config, buildName, activeBuildId, touched.length]);
  const activateBuild = (id: string) => {
    const build = builds.find((item) => item.id === id);
    if (!build) return;
    setActiveBuildId(id);
    setBuildName(build.name);
    setState({
      format: build.configuration.brief.format,
      platform: build.configuration.platformId,
      enclosure: build.configuration.bass.alignment,
      character: build.configuration.bass.bassCharacter,
      size: build.configuration.cabinet.size,
      grille: build.configuration.cabinet.grille,
      base: build.configuration.cabinet.base,
      edge: build.configuration.cabinet.edgeProfile,
      finish: build.configuration.cabinet.finish,
      personalisation: build.configuration.personalisation.kind,
    });
    setTouched([]);
    setStep(0);
  };
  const newBuild = () => {
    if (builds.length >= MAX_LOCAL_BUILDS) {
      window.alert("You have reached the maximum of 20 saved builds. Delete one to create a new build.");
      return;
    }
    setActiveBuildId("");
    setBuildName(`Untitled ${String(builds.length + 1).padStart(2, "0")}`);
    setTouched([]);
    setStep(0);
  };
  const duplicateBuild = () => {
    if (builds.length >= MAX_LOCAL_BUILDS) {
      window.alert("You have reached the maximum of 20 saved builds. Delete one to create a new build.");
      return;
    }
    const source = builds.find((item) => item.id === activeBuildId);
    if (!source) return;
    const copy = createLocalBuild(
      { ...source.configuration, name: `${source.name} copy` },
      `${source.name} copy`,
    );
    upsertLocalBuild(copy);
    setBuilds(readLocalBuilds()?.builds ?? []);
    setActiveBuildId(copy.id);
    setBuildName(copy.name);
  };
  const deleteBuild = async () => {
    if (!activeBuildId || !window.confirm(`Delete “${buildName}”?`)) return;
    const deleted = builds.find((build) => build.id === activeBuildId);
    if (deleted?.remoteId) {
      try {
        await deleteBuildFromAccount(deleted);
      } catch {
        window.alert(`Could not delete "${buildName}" from your account. It will be removed locally but may still appear when you sign in.`);
      }
    }
    removeLocalBuild(activeBuildId);
    const next = readLocalBuilds();
    const replacement = next?.builds[0];
    setBuilds(next?.builds ?? []);
    setActiveBuildId(replacement?.id ?? "");
    setBuildName(replacement?.name ?? "Untitled 01");
    setTouched([]);
    setStep(0);
  };
  const selected = [
    {
      category: "format" as Category,
      item: options.format.find((x) => x.id === state.format)!,
    },
    { category: "platform" as Category, item: platform },
    {
      category: "bass" as Category,
      item: options.enclosure.find((x) => x.id === state.enclosure)!,
    },
    {
      category: "cabinet" as Category,
      item: options.size.find((x) => x.id === state.size)!,
    },
    {
      category: "finish" as Category,
      item: options.finish.find((x) => x.id === state.finish)!,
    },
    {
      category: "personalisation" as Category,
      item: options.personalisation.find(
        (x) => x.id === state.personalisation,
      )!,
    },
  ];
  const total =
    selected.reduce((sum, row) => sum + row.item.price, 0) +
    options.character.find((x) => x.id === state.character)!.price +
    options.grille.find((x) => x.id === state.grille)!.price +
    options.base.find((x) => x.id === state.base)!.price +
    options.edge.find((x) => x.id === state.edge)!.price;
  const steps = [
    "Listening brief",
    "Format",
    "Platform",
    "Bass",
    "Cabinet",
    "Finish",
    "Personalisation",
    "Review",
    "Listening Lab",
  ];
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  const group = (label: string, children: ReactNode) => (
    <section className="builder-choice-group">
      <label className="control-label">{label}</label>
      <div className="selection-card-stack">{children}</div>
    </section>
  );
  if (step === 8)
    return (
      <main className="editor-page">
        <SimulatorPage
          embedded
          products={products}
          customBuild={{
            name: buildName,
            format: config.brief.format,
            finish: state.finish,
            referenceName: platform.title,
          }}
          onBack={() => setStep(7)}
        />
      </main>
    );
  return (
    <main className="editor-page">
      <div className="editor-top">
        <button className="back-link" onClick={onBack}>
          ← Back to collection
        </button>
        <span className="editor-title">
          CUSTOM SPEAKER /{" "}
          <input
            aria-label="Build name"
            value={buildName}
            onChange={(event) => setBuildName(event.target.value)}
          />
        </span>
        <div className="build-library">
          <select
            aria-label="Choose build"
            value={activeBuildId}
            onChange={(event) => activateBuild(event.target.value)}
          >
            <option value="">New build</option>
            {builds.map((build) => (
              <option key={build.id} value={build.id}>
                {build.name}
              </option>
            ))}
          </select>
          <button onClick={newBuild} title="New build">
            <Plus size={14} /> New
          </button>
          <button
            onClick={duplicateBuild}
            disabled={!activeBuildId}
            title="Duplicate build"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            onClick={deleteBuild}
            disabled={!activeBuildId}
            title="Delete build"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="build-menu-wrap">
            <button
              className="build-menu"
              onClick={() => setBuildMenuOpen((open) => !open)}
              title="More build actions"
              aria-label="More build actions"
              aria-expanded={buildMenuOpen}
            >
              <MoreHorizontal size={16} />
            </button>
            {buildMenuOpen && (
              <div className="build-actions-menu" role="menu">
                <button onClick={newBuild} role="menuitem">
                  <Plus size={14} /> New build
                </button>
                <button onClick={duplicateBuild} disabled={!activeBuildId} role="menuitem">
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  disabled={!activeBuildId}
                  onClick={() => {
                    const name = window.prompt('Rename custom build', buildName)?.trim();
                    if (name) setBuildName(name);
                    setBuildMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  Rename
                </button>
                <button onClick={deleteBuild} disabled={!activeBuildId} role="menuitem">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="step-tabs">
        {steps.map((name, i) => (
          <button
            key={name}
            className={step === i ? "active" : step > i ? "done" : ""}
            onClick={() => setStep(i)}
          >
            <b>{String(i + 1).padStart(2, "0")}</b>
            {name}
          </button>
        ))}
      </div>
      {validationError && (
        <div className="validation-error-banner" role="alert">
          {validationError}
        </div>
      )}
      <section
        className={
          step === 0 ? "editor-workspace brief-workspace" : "editor-workspace"
        }
      >
        <div className="editor-stage">
          {touched.length > 0 && (
            <div className="stage-build-strip">
              <span>Selected build</span>
              {selected
                .filter((row) => touched.includes(row.category))
                .map((row) => (
                  <div key={row.category}>
                    <img src={`/images/components/${row.item.image}`} alt="" />
                    <p>
                      <small>{row.category}</small>
                      <b>{row.item.title}</b>
                    </p>
                    <em>{money(row.item.price)}</em>
                  </div>
                ))}
              <strong>
                Total <b>${total.toLocaleString()}</b>
              </strong>
            </div>
          )}
          {touched.length > 0 ? (
            <ProceduralSpeaker
              config={config}
              showDrivers={touched.includes("platform")}
              showBass={touched.includes("bass")}
              showPersonalisation={touched.includes("personalisation")}
            />
          ) : (
            <div className="empty-3d-state">
              <div className="empty-speaker-outline" />
              <strong>Your speaker will appear here</strong>
              <span>Choose a format to begin the 3D preview.</span>
            </div>
          )}
        </div>
        <aside ref={panelRef} className="editor-panel">
          <div className="panel-heading">
            <h1>{steps[step]}</h1>
          </div>
          {step === 0 && (
            <div className="brief-step">
              <div className="brief-hero">
                <p className="eyebrow">Optional starting point</p>
                <h2>What would make you love your next speaker?</h2>
                <p>
                  Choose anything that sounds like you. We will use it only to
                  set helpful starting choices.
                </p>
              </div>
              <div className="brief-question">
                <span>When a track feels right, it is…</span>
                <div className="brief-options">
                  <button>
                    <span>Warm and easy</span>
                    <small>Rich, relaxed, forgiving</small>
                  </button>
                  <button>
                    <span>Clear and natural</span>
                    <small>Honest, all-round listening</small>
                  </button>
                  <button>
                    <span>Big and involving</span>
                    <small>Wide, energetic, room-filling</small>
                  </button>
                </div>
              </div>
              <div className="brief-question">
                <span>Your usual listening space is…</span>
                <div className="brief-options">
                  <button>
                    <span>Small and close</span>
                    <small>Bedroom, study, snug</small>
                  </button>
                  <button>
                    <span>Everyday living room</span>
                    <small>The usual home setup</small>
                  </button>
                  <button>
                    <span>Open and spacious</span>
                    <small>More distance and air</small>
                  </button>
                </div>
              </div>
              <div className="brief-question">
                <span>You would like the speaker to feel…</span>
                <div className="brief-options two-up">
                  <button
                    onClick={() => choose("format", "format", "standmount")}
                  >
                    <span>Discreet</span>
                    <small>Compact and easy to live with</small>
                  </button>
                  <button
                    onClick={() => choose("format", "format", "floorstanding")}
                  >
                    <span>Confident</span>
                    <small>A more physical presence</small>
                  </button>
                </div>
              </div>
              <p className="optional-note">
                Nothing here is required. Continue to choose the specification
                yourself.
              </p>
            </div>
          )}
          {step === 1 &&
            group(
              "Choose a format",
              options.format.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  selected={
                    touched.includes("format") && state.format === item.id
                  }
                  onClick={() => choose("format", "format", item.id)}
                />
              )),
            )}
          {step === 2 &&
            group(
              "Choose an acoustic platform",
              options.platform.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  selected={
                    touched.includes("platform") && state.platform === item.id
                  }
                  onClick={() =>
                    choose(
                      "platform",
                      "platform",
                      item.id as AcousticPlatformId,
                    )
                  }
                />
              )),
            )}
          {step === 3 && (
            <>
              {group(
                "Enclosure",
                options.enclosure.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes("bass") && state.enclosure === item.id
                    }
                    onClick={() => choose("bass", "enclosure", item.id)}
                  />
                )),
              )}
              {group(
                "Bass character",
                options.character.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes("bass") && state.character === item.id
                    }
                    onClick={() => choose("bass", "character", item.id)}
                  />
                )),
              )}
            </>
          )}
          {step === 4 && (
            <>
              {group(
                "Cabinet size",
                options.size.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes("cabinet") && state.size === item.id
                    }
                    onClick={() => choose("cabinet", "size", item.id)}
                  />
                )),
              )}
              {group(
                "Grille",
                options.grille.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes("cabinet") && state.grille === item.id
                    }
                    onClick={() => choose("cabinet", "grille", item.id)}
                  />
                )),
              )}
              {group(
                "Base",
                options.base.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    disabled={
                      item.id === "stand" && state.format !== "standmount"
                    }
                    selected={
                      touched.includes("cabinet") && state.base === item.id
                    }
                    onClick={() => choose("cabinet", "base", item.id)}
                  />
                )),
              )}
              {group(
                "Edge profile",
                options.edge.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes("cabinet") && state.edge === item.id
                    }
                    onClick={() => choose("cabinet", "edge", item.id)}
                  />
                )),
              )}
            </>
          )}
          {step === 5 &&
            group(
              "Choose a finish",
              options.finish.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  selected={
                    touched.includes("finish") && state.finish === item.id
                  }
                  onClick={() =>
                    choose("finish", "finish", item.id as CabinetFinishId)
                  }
                />
              )),
            )}
          {step === 6 &&
            group(
              "Choose a treatment",
              options.personalisation.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  selected={
                    touched.includes("personalisation") &&
                    state.personalisation === item.id
                  }
                  onClick={() =>
                    choose(
                      "personalisation",
                      "personalisation",
                      item.id as PersonalisationKind,
                    )
                  }
                />
              )),
            )}
          {step === 7 && (
            <div className="review-summary">
              <p className="panel-copy">
                Review the selected components, then open this exact speaker in
                the Listening Lab.
              </p>
              <div className="review-parts">
                {selected.map((row) => (
                  <div key={row.category}>
                    <img src={`/images/components/${row.item.image}`} alt="" />
                    <span>
                      <small>{row.category}</small>
                      <b>{row.item.title}</b>
                    </span>
                    <em>{money(row.item.price)}</em>
                  </div>
                ))}
              </div>
              <div className="review-total">
                <span>Estimated build total</span>
                <strong>${total.toLocaleString()}</strong>
              </div>
            </div>
          )}
          <div className="panel-footer">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              ← Previous
            </button>
            <button
              className="next-button"
              onClick={() => setStep(Math.min(8, step + 1))}
            >
              {step === 7 ? "Open Listening Lab" : "Continue"}{" "}
              <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

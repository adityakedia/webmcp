import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Copy, MoreHorizontal, Plus, Trash2, X } from 'lucide-react';
import type {
  CustomSpeakerConfiguration,
  AcousticPlatformId,
  CabinetFinishId,
  PersonalisationKind,
} from '@acoustom/types';
import type { Product } from '../App';
import BuildSheetExporter from './BuildSheetExporter';
import ProceduralSpeaker from './ProceduralSpeaker';
import SimulatorPage from './SimulatorPage';
import {
  createLocalBuild,
  readLocalBuilds,
  removeLocalBuild,
  upsertLocalBuild,
  MAX_LOCAL_BUILDS,
  type LocalBuild,
  type ListeningPreferences,
} from '../lib/localBuilds';
import { useAgentViewStore } from '../store/agentView';
import {
  deleteBuildFromAccount,
  syncBuildToAccount,
  validateBuild,
} from '../lib/customBuildRepository';
import { customBuildPrice, options, platformBass } from '../lib/customBuildOptions';

type Props = { products: Product[]; onBack: () => void };
type Category = 'format' | 'platform' | 'bass' | 'cabinet' | 'finish' | 'personalisation';

const money = (value: number) => (value ? `+$${value.toLocaleString()}` : 'Included');

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
      className={`selection-card${selected ? ' selected' : ''}`}
    >
      <img src={`/images/components/${item.image}`} alt="" />
      <div className="selection-card-main">
        <div>
          <strong>{item.title}</strong>
          <span>{item.copy}</span>
          <em>{money(item.price)}</em>
        </div>
        <i>{selected ? '−' : '+'}</i>
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
  const ALL_CATEGORIES: Category[] = [
    'format',
    'platform',
    'bass',
    'cabinet',
    'finish',
    'personalisation',
  ];
  const stored = readLocalBuilds();
  const initialBuild =
    stored?.builds.find((build) => build.id === stored.activeBuildId) ?? stored?.builds[0];
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Category[]>(initialBuild ? ALL_CATEGORIES : []);
  const [builds, setBuilds] = useState<LocalBuild[]>(stored?.builds ?? []);
  const [activeBuildId, setActiveBuildId] = useState(initialBuild?.id ?? '');
  const [buildName, setBuildName] = useState(initialBuild?.name ?? 'Untitled 01');
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [preferences, setPreferences] = useState<ListeningPreferences>(initialBuild?.preferences ?? {});
  const panelRef = useRef<HTMLElement>(null);
  const [state, setState] = useState({
    format: initialBuild?.configuration.brief.format ?? 'standmount',
    platform: initialBuild?.configuration.platformId ?? ('two_way_compact' as AcousticPlatformId),
    enclosure: initialBuild?.configuration.bass.alignment ?? 'ported',
    character: initialBuild?.configuration.bass.bassCharacter ?? 'balanced',
    size: initialBuild?.configuration.cabinet.size ?? 'standard',
    grille: initialBuild?.configuration.cabinet.grille ?? 'magnetic_fabric',
    base: initialBuild?.configuration.cabinet.base ?? 'stand',
    edge: initialBuild?.configuration.cabinet.edgeProfile ?? 'soft_radius',
    finish: initialBuild?.configuration.cabinet.finish ?? ('walnut' as CabinetFinishId),
    personalisation:
      initialBuild?.configuration.personalisation.kind ?? ('none' as PersonalisationKind),
  });
  const resetState = () =>
    setState({
      format: 'standmount',
      platform: 'two_way_compact' as AcousticPlatformId,
      enclosure: 'ported',
      character: 'balanced',
      size: 'standard',
      grille: 'magnetic_fabric',
      base: 'stand',
      edge: 'soft_radius',
      finish: 'walnut' as CabinetFinishId,
      personalisation: 'none' as PersonalisationKind,
    });
  const choose = <K extends keyof typeof state>(
    category: Category,
    key: K,
    value: (typeof state)[K]
  ) => {
    setState((current) => ({ ...current, [key]: value }));
    setTouched((current) => (current.includes(category) ? current : [...current, category]));
  };
  const chooseFormat = (format: (typeof state)['format']) => {
    setState((current) => ({
      ...current,
      format,
      platform:
        format === 'subwoofer'
          ? 'subwoofer_active'
          : current.platform === 'subwoofer_active'
            ? format === 'floorstanding'
              ? 'two_way_extended'
              : 'two_way_compact'
            : current.platform,
      base: format === 'standmount' ? current.base : current.base === 'stand' ? 'slim_feet' : current.base,
    }));
    setTouched((current) => (current.includes('format') ? current : [...current, 'format']));
  };
  const choosePlatform = (platform: AcousticPlatformId) => {
    const formatByPlatform: Record<AcousticPlatformId, (typeof state)['format']> = {
      two_way_compact: 'standmount',
      two_way_extended: 'floorstanding',
      three_way_reference: 'standmount',
      subwoofer_active: 'subwoofer',
    };
    setState((current) => ({
      ...current,
      platform,
      format: formatByPlatform[platform],
      base:
        formatByPlatform[platform] === 'standmount'
          ? current.base
          : current.base === 'stand'
            ? 'slim_feet'
            : current.base,
    }));
    setTouched((current) => (current.includes('platform') ? current : [...current, 'platform']));
  };
  const platform = options.platform.find((item) => item.id === state.platform)!;
  const config = useMemo<CustomSpeakerConfiguration>(() => {
    const bass = platformBass[state.platform];
    return {
      version: 1,
      name: buildName || 'Custom speaker',
      brief: {
        format: (state.platform === 'subwoofer_active' ? 'subwoofer' : state.format) as
          'standmount' | 'floorstanding' | 'subwoofer',
        soundProfile: 'balanced',
        roomSize: 'medium',
        listeningDistanceM: 2.5,
      },
      platformId: state.platform,
      bass: {
        alignment: state.enclosure as 'ported' | 'sealed',
        bassCharacter: state.character as 'tight' | 'balanced' | 'extended',
        ...(state.enclosure === 'ported' ? bass : { netVolumeLitres: bass.netVolumeLitres }),
      },
      cabinet: {
        size: state.size as 'compact' | 'standard' | 'large',
        finish: state.finish,
        finishFamily: state.finish === 'satin_white' ? 'paint' : 'veneer',
        grille: state.grille as 'none' | 'magnetic_fabric' | 'perforated_metal',
        base:
          state.format === 'standmount'
            ? (state.base as 'plinth' | 'slim_feet' | 'stand')
            : state.base === 'stand'
              ? 'slim_feet'
              : (state.base as 'plinth' | 'slim_feet'),
        edgeProfile: state.edge as 'soft_radius' | 'sculpted_radius',
      },
      personalisation:
        state.personalisation === 'none'
          ? { kind: 'none' }
          : state.personalisation === 'engraving'
            ? {
                kind: 'engraving',
                engraving: {
                  text: 'ACOUSTOM',
                  font: 'modern_sans',
                  placement: 'side_lower',
                },
              }
            : {
                kind: state.personalisation,
                artwork: {
                  application: 'side_panel',
                  treatment:
                    state.personalisation === 'pattern'
                      ? 'inlaid_pattern'
                      : state.personalisation === 'printed_panel'
                        ? 'uv_print'
                        : 'matte_decal',
                  rightsConfirmed: true,
                  status: 'approved',
                },
              },
    };
  }, [state, buildName]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validateAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    window.localStorage.setItem('acoustom-custom-builder-draft', JSON.stringify(config));
    if (!activeBuildId && touched.length === 0) return;
    const existing = readLocalBuilds()?.builds.find((build) => build.id === activeBuildId);
    const build = existing ?? createLocalBuild(config, buildName);
    const name = buildName.trim() || 'Untitled build';
    const pending = {
      ...build,
      name,
      configuration: { ...config, name },
      preferences,
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
          const complete = { ...pending, derived: validated.derived, specs: validated.specs };
          upsertLocalBuild(complete);
          window.sessionStorage.setItem(
            'acoustom-custom-speaker-profile',
            JSON.stringify(validated.derived.simulationProfile)
          );
          const synced = await syncBuildToAccount(complete);
          if (controller.signal.aborted) return;
          upsertLocalBuild(synced);
          setBuilds(readLocalBuilds()?.builds ?? []);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setValidationError(error instanceof Error ? error.message : 'Build validation failed');
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [config, buildName, activeBuildId, touched.length, preferences]);
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
    setPreferences(build.preferences ?? {});
    setTouched(ALL_CATEGORIES);
    setStep(7);
  };
  const requestedBuildId = useAgentViewStore((state) => state.requestedCustomBuildId);
  const builderFormRequest = useAgentViewStore((state) => state.builderFormRequest);
  useEffect(() => {
    if (!requestedBuildId) return;
    if (activeBuildId === requestedBuildId) return;
    const build = builds.find((item) => item.id === requestedBuildId);
    if (build) activateBuild(requestedBuildId);
    // activateBuild is intentionally omitted: it is rebuilt on every render
    // and capturing it would re-trigger the effect for the same build id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBuildId, builds, activeBuildId]);
  useEffect(() => {
    if (!builderFormRequest) return;
    const { fields, preferences: briefPreferences, buildName: requestedName, focusStep } = builderFormRequest;
    const categoryByField: Record<string, Category> = {
      format: 'format',
      platform: 'platform',
      enclosure: 'bass',
      character: 'bass',
      size: 'cabinet',
      grille: 'cabinet',
      base: 'cabinet',
      edge: 'cabinet',
      finish: 'finish',
      personalisation: 'personalisation',
    };
    setState((current) => {
      const next = { ...current, ...(fields as unknown as Partial<typeof current>) };
      if (fields.format && !fields.platform)
        next.platform =
          fields.format === 'subwoofer'
            ? 'subwoofer_active'
            : current.platform === 'subwoofer_active'
              ? fields.format === 'floorstanding'
                ? 'two_way_extended'
                : 'two_way_compact'
              : current.platform;
      if (fields.platform && !fields.format) {
        next.format =
          fields.platform === 'subwoofer_active'
            ? 'subwoofer'
            : fields.platform === 'two_way_extended'
              ? 'floorstanding'
              : 'standmount';
      }
      if (next.format !== 'standmount' && next.base === 'stand') next.base = 'slim_feet';
      return next;
    });
    setTouched((current) => {
      const categories = Object.keys(fields)
        .map((field) => categoryByField[field])
        .filter((category): category is Category => Boolean(category));
      return [...current, ...categories.filter((category) => !current.includes(category))];
    });
    if (requestedName) setBuildName(requestedName);
    if (briefPreferences && Object.keys(briefPreferences).length)
      setPreferences((p) => ({ ...p, ...briefPreferences }));
    if (typeof focusStep === 'number')
      setStep(Math.max(0, Math.min(ALL_CATEGORIES.length, Math.trunc(focusStep))));
    useAgentViewStore.getState().clearBuilderFormRequest();
  }, [builderFormRequest]);
  const newBuild = () => {
    if (builds.length >= MAX_LOCAL_BUILDS) {
      window.alert(
        'You have reached the maximum of 20 saved builds. Delete one to create a new build.'
      );
      return;
    }
    setActiveBuildId('');
    setBuildName(`Untitled ${String(builds.length + 1).padStart(2, '0')}`);
    resetState();
    setPreferences({});
    setTouched([]);
    setStep(0);
  };
  const duplicateBuild = () => {
    if (builds.length >= MAX_LOCAL_BUILDS) {
      window.alert(
        'You have reached the maximum of 20 saved builds. Delete one to create a new build.'
      );
      return;
    }
    const source = builds.find((item) => item.id === activeBuildId);
    if (!source) return;
    const copy = createLocalBuild(
      { ...source.configuration, name: `${source.name} copy` },
      `${source.name} copy`
    );
    copy.preferences = source.preferences;
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
        window.alert(
          `Could not delete "${buildName}" from your account. It will be removed locally but may still appear when you sign in.`
        );
      }
    }
    removeLocalBuild(activeBuildId);
    const next = readLocalBuilds();
    const replacement = next?.builds[0];
    setBuilds(next?.builds ?? []);
    setActiveBuildId(replacement?.id ?? '');
    setBuildName(replacement?.name ?? 'Untitled 01');
    setTouched(replacement ? ALL_CATEGORIES : []);
    setStep(replacement ? 7 : 0);
  };
  const selected = [
    {
      category: 'format' as Category,
      item: options.format.find((x) => x.id === state.format)!,
    },
    { category: 'platform' as Category, item: platform },
    {
      category: 'bass' as Category,
      item: options.enclosure.find((x) => x.id === state.enclosure)!,
    },
    {
      category: 'cabinet' as Category,
      item: options.size.find((x) => x.id === state.size)!,
    },
    {
      category: 'finish' as Category,
      item: options.finish.find((x) => x.id === state.finish)!,
    },
    {
      category: 'personalisation' as Category,
      item: options.personalisation.find((x) => x.id === state.personalisation)!,
    },
  ];
  const total = customBuildPrice(config);
  const steps = [
    'Listening brief',
    'Format',
    'Platform',
    'Bass',
    'Cabinet',
    'Finish',
    'Personalisation',
    'Review',
    'Listening Lab',
  ];
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          roomPhotos={preferences.roomPhotos ?? (preferences.roomPhoto ? [preferences.roomPhoto] : [])}
          onRemoveRoomPhoto={(dataUrl) =>
            setPreferences((p) => {
              const photos = p.roomPhotos ?? (p.roomPhoto ? [p.roomPhoto] : []);
              const remaining = photos.filter((item) => item.dataUrl !== dataUrl);
              return { ...p, roomPhotos: remaining.length ? remaining : undefined, roomPhoto: undefined };
            })
          }
        />
      </main>
    );
  return (
    <>
      <main className="editor-page">
        <div className="editor-top">
          <button className="back-link" onClick={onBack}>
            ← Back to collection
          </button>
          <span className="editor-title">
            CUSTOM SPEAKER /{' '}
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
            <button onClick={duplicateBuild} disabled={!activeBuildId} title="Duplicate build">
              <Copy size={14} /> Duplicate
            </button>
            <button onClick={deleteBuild} disabled={!activeBuildId} title="Delete build">
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
              className={step === i ? 'active' : step > i ? 'done' : ''}
              onClick={() => setStep(i)}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              {name}
            </button>
          ))}
        </div>
        {validationError && (
          <div className="validation-error-banner" role="alert">
            {validationError}
          </div>
        )}
        <section className={step === 0 ? 'editor-workspace brief-workspace' : 'editor-workspace'}>
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
                showDrivers={touched.includes('platform')}
                showBass={touched.includes('bass')}
                showPersonalisation={touched.includes('personalisation')}
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
                    Choose anything that sounds like you. We will use it only to set helpful
                    starting choices.
                  </p>
                </div>
                <div className="brief-question">
                  <span>When a track feels right, it is…</span>
                  <div className="brief-options">
                    <button className={`brief-option${preferences.soundProfile === 'warm' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, soundProfile: 'warm' }))}>
                      <span>Warm and easy</span>
                      <small>Rich, relaxed, forgiving</small>
                    </button>
                    <button className={`brief-option${preferences.soundProfile === 'balanced' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, soundProfile: 'balanced' }))}>
                      <span>Clear and natural</span>
                      <small>Honest, all-round listening</small>
                    </button>
                    <button className={`brief-option${preferences.soundProfile === 'immersive' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, soundProfile: 'immersive' }))}>
                      <span>Big and involving</span>
                      <small>Wide, energetic, room-filling</small>
                    </button>
                  </div>
                </div>
                <div className="brief-question">
                  <span>Your usual listening space is…</span>
                  <div className="brief-options">
                    <button className={`brief-option${preferences.roomSize === 'small' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, roomSize: 'small' }))}>
                      <span>Small and close</span>
                      <small>Bedroom, study, snug</small>
                    </button>
                    <button className={`brief-option${preferences.roomSize === 'medium' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, roomSize: 'medium' }))}>
                      <span>Everyday living room</span>
                      <small>The usual home setup</small>
                    </button>
                    <button className={`brief-option${preferences.roomSize === 'large' ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, roomSize: 'large' }))}>
                      <span>Open and spacious</span>
                      <small>More distance and air</small>
                    </button>
                  </div>
                </div>
                <div className="brief-question">
                  <span>Your music benefits most from…</span>
                  <div className="brief-options music-options">
                    {[
                      ['vocals-and-texture', 'Acoustic, vocal jazz', 'Hear voices, strings and fingers clearly'],
                      ['rhythm-and-attack', 'Rock, funk, hip-hop', 'Keep drums and bass punchy and tight'],
                      ['scale-and-depth', 'Classical, orchestral', 'Give large ensembles room and depth'],
                      ['tonal-balance', 'Electronic, pop, mixed', 'Stay natural and even across styles'],
                    ].map(([value, title, copy]) => (
                      <button key={value} className={`brief-option${preferences.musicProfile === value ? ' selected' : ''}`} onClick={() => setPreferences((p) => ({ ...p, musicProfile: value }))}>
                        <span>{title}</span><small>{copy}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="brief-question">
                  <span>Room photo (optional)</span>
                  <label className="room-photo-upload" htmlFor="room-photo">
                    <span className="upload-plus">+</span>
                    <span>{(preferences.roomPhotos?.length ?? (preferences.roomPhoto ? 1 : 0)) > 0 ? 'Add another room photo' : 'Add photos of your listening room'}</span>
                    <small>{(preferences.roomPhotos?.length ?? (preferences.roomPhoto ? 1 : 0)) > 0 ? `${preferences.roomPhotos?.length ?? 1} photo${(preferences.roomPhotos?.length ?? 1) === 1 ? '' : 's'} saved to this build` : 'JPG, PNG or HEIC · up to 5 MB each'}</small>
                  </label>
                  <input className="visually-hidden" id="room-photo" type="file" accept="image/*" multiple onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
                    if (validFiles.length !== files.length) window.alert('Each photo must be smaller than 5 MB.');
                    validFiles.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = () => setPreferences((p) => ({
                        ...p,
                        roomPhotos: [...(p.roomPhotos ?? (p.roomPhoto ? [p.roomPhoto] : [])), { name: file.name, type: file.type, dataUrl: String(reader.result) }],
                        roomPhoto: undefined,
                      }));
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }} />
                  {(preferences.roomPhotos ?? (preferences.roomPhoto ? [preferences.roomPhoto] : [])).length > 0 && (
                    <div className="room-photo-thumbnails" aria-label="Uploaded room photos">
                      {(preferences.roomPhotos ?? (preferences.roomPhoto ? [preferences.roomPhoto] : [])).map((photo) => (
                        <div className="room-photo-thumb" key={`${photo.name}-${photo.dataUrl.slice(-12)}`}>
                          <img src={photo.dataUrl} alt={photo.name} title={photo.name} />
                          <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => setPreferences((p) => ({ ...p, roomPhotos: (p.roomPhotos ?? (p.roomPhoto ? [p.roomPhoto] : [])).filter((item) => item.dataUrl !== photo.dataUrl), roomPhoto: undefined }))}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="brief-question">
                  <span>You would like the speaker to feel…</span>
                  <div className="brief-options two-up">
                    <button className={state.format === 'standmount' ? 'selected' : ''} onClick={() => chooseFormat('standmount')}>
                      <span>Discreet</span>
                      <small>Compact and easy to live with</small>
                    </button>
                    <button className={state.format === 'floorstanding' ? 'selected' : ''} onClick={() => chooseFormat('floorstanding')}>
                      <span>Confident</span>
                      <small>A more physical presence</small>
                    </button>
                  </div>
                </div>
                <p className="optional-note">
                  Nothing here is required. Continue to choose the specification yourself.
                </p>
              </div>
            )}
            {step === 1 &&
              group(
                'Choose a format',
                options.format.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={touched.includes('format') && state.format === item.id}
                    onClick={() => chooseFormat(item.id)}
                  />
                ))
              )}
            {step === 2 &&
              group(
                'Choose an acoustic platform',
                options.platform.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={touched.includes('platform') && state.platform === item.id}
                    onClick={() => choosePlatform(item.id as AcousticPlatformId)}
                  />
                ))
              )}
            {step === 3 && (
              <>
                {group(
                  'Enclosure',
                  options.enclosure.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      selected={touched.includes('bass') && state.enclosure === item.id}
                      onClick={() => choose('bass', 'enclosure', item.id)}
                    />
                  ))
                )}
                {group(
                  'Bass character',
                  options.character.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      selected={touched.includes('bass') && state.character === item.id}
                      onClick={() => choose('bass', 'character', item.id)}
                    />
                  ))
                )}
              </>
            )}
            {step === 4 && (
              <>
                {group(
                  'Cabinet size',
                  options.size.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      selected={touched.includes('cabinet') && state.size === item.id}
                      onClick={() => choose('cabinet', 'size', item.id)}
                    />
                  ))
                )}
                {group(
                  'Grille',
                  options.grille.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      selected={touched.includes('cabinet') && state.grille === item.id}
                      onClick={() => choose('cabinet', 'grille', item.id)}
                    />
                  ))
                )}
                {group(
                  'Base',
                  options.base.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      disabled={item.id === 'stand' && state.format !== 'standmount'}
                      selected={touched.includes('cabinet') && state.base === item.id}
                      onClick={() => choose('cabinet', 'base', item.id)}
                    />
                  ))
                )}
                {group(
                  'Edge profile',
                  options.edge.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      selected={touched.includes('cabinet') && state.edge === item.id}
                      onClick={() => choose('cabinet', 'edge', item.id)}
                    />
                  ))
                )}
              </>
            )}
            {step === 5 &&
              group(
                'Choose a finish',
                options.finish.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={touched.includes('finish') && state.finish === item.id}
                    onClick={() => choose('finish', 'finish', item.id as CabinetFinishId)}
                  />
                ))
              )}
            {step === 6 &&
              group(
                'Choose a treatment',
                options.personalisation.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    selected={
                      touched.includes('personalisation') && state.personalisation === item.id
                    }
                    onClick={() =>
                      choose('personalisation', 'personalisation', item.id as PersonalisationKind)
                    }
                  />
                ))
              )}
            {step === 7 && (
              <div className="review-summary">
                <p className="panel-copy">
                  Review the selected components, then open this exact speaker in the Listening Lab.
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
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                ← Previous
              </button>
              <button className="next-button" onClick={() => setStep(Math.min(8, step + 1))}>
                {step === 7 ? 'Open Listening Lab' : 'Continue'} <ArrowRight size={15} />
              </button>
            </div>
          </aside>
        </section>
      </main>
      <BuildSheetExporter />
    </>
  );
}

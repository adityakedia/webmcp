"""Derive canonical product-shaped specs from a validated custom-speaker build.

This is the single source of truth for the spec pairs shown in the comparison
matrix and build sheet.  It mirrors the ``SPEC_KEYS`` used by the public catalog
so both catalog and custom speakers share the same first 17 rows; custom
speakers append additional engineering rows that only apply to them.
"""

DIMENSIONS: dict[str, dict[str, str]] = {
    "standmount": {
        "compact": "360 × 200 × 280 mm",
        "standard": "440 × 215 × 360 mm",
        "large": "520 × 250 × 430 mm",
    },
    "floorstanding": {
        "compact": "700 × 250 × 300 mm",
        "standard": "900 × 290 × 310 mm",
        "large": "1180 × 290 × 390 mm",
    },
    "subwoofer": {
        "compact": "320 × 320 × 360 mm",
        "standard": "380 × 380 × 420 mm",
        "large": "450 × 450 × 480 mm",
    },
}

WEIGHT: dict[str, dict[str, str]] = {
    "standmount": {
        "compact": "11 kg each",
        "standard": "16 kg each",
        "large": "24 kg each",
    },
    "floorstanding": {
        "compact": "18 kg each",
        "standard": "26 kg each",
        "large": "40 kg each",
    },
    "subwoofer": {
        "compact": "8 kg each",
        "standard": "12 kg each",
        "large": "16 kg each",
    },
}


def _amp_power(sensitivity_db: float | None) -> str:
    if not sensitivity_db:
        return "—"
    if sensitivity_db < 85:
        return "50 – 150 W"
    if sensitivity_db < 88:
        return "40 – 180 W"
    if sensitivity_db < 90:
        return "40 – 200 W"
    return "30 – 250 W"


def _pretty(value: str) -> str:
    return value.replace("_", " ")


def derive_product_specs(build: dict) -> list[list[str]]:
    """Convert a validated ``CustomSpeakerBuild`` dict into canonical ``[[key, value]]`` spec pairs.

    The first 17 rows use the same keys as ``PUBLIC_CATALOG`` so the comparison
    matrix can show catalog and custom speakers side by side.  Additional rows
    surface engineering details that only apply to custom builds.
    """
    d = build["derived"]
    p = d["simulationProfile"]
    a = d["acousticDesign"]
    c = d["physicalBuild"]
    is_sub = c["format"] == "subwoofer"

    return [
        ["System", p["referenceName"]],
        ["Frequency response", f'{p["frequencyRangeHz"][0]} Hz – {p["frequencyRangeHz"][1]} Hz'],
        ["Sensitivity", f'{p["sensitivityDb"]} dB (2.83 V / 1 m)' if p.get("sensitivityDb") else "—"],
        ["Nominal impedance", f'{p["nominalImpedanceOhm"]} Ω' if p.get("nominalImpedanceOhm") else "—"],
        ["Recommended amplifier power", _amp_power(p.get("sensitivityDb"))],
        ["Crossover frequency", " / ".join(str(hz) for hz in p["crossoverHz"]) + " Hz" if p["crossoverHz"] else "—"],
        ["Maximum SPL", f'{p["maxSplDb"]} dB at 1 m' if p.get("maxSplDb") else "—"],
        ["Amplification", "Built-in class-D amplification" if is_sub else "Passive (external amplification required)"],
        ["Cabinet materials", "MDF with internal bracing"],
        ["Cabinet finishes", _pretty(c["finish"])],
        ["Grille", _pretty(c["grille"])],
        ["Base", _pretty(c["base"])],
        ["Directivity", "—"],
        ["Inputs", "Line-level RCA / Speaker-level" if is_sub else "Single-wired speaker terminals"],
        ["Calibration", "—"],
        ["Dimensions (H × W × D)", DIMENSIONS.get(c["format"], {}).get(c["cabinetSize"], "—")],
        ["Weight", WEIGHT.get(c["format"], {}).get(c["cabinetSize"], "—")],
        ["Alignment", _pretty(a["alignment"])],
        ["Bass character", _pretty(a["bassCharacter"])],
        ["Net volume", f'{a["netVolumeLitres"]} L' if a.get("netVolumeLitres") else "—"],
        ["Port tuning", f'{a["portTuningHz"]} Hz' if a.get("portTuningHz") else "Sealed"],
        ["Architecture", d["architecture"]],
        ["Drivers", " / ".join(_pretty(driver["role"]) for driver in d["drivers"]) or "—"],
        ["Format", c["format"]],
        ["Cabinet size", c["cabinetSize"]],
        ["Finish family", c["finishFamily"]],
        ["Edge profile", _pretty(c["edgeProfile"])],
        ["Port diameter", f'{a["portInnerDiameterMm"]} mm' if a.get("portInnerDiameterMm") else "—"],
        ["Port length", f'{a["portLengthMm"]} mm' if a.get("portLengthMm") else "—"],
        ["Damping", a.get("dampingDescription") or "—"],
        ["Voicing target", a["voicingTarget"]],
        ["Measurement status", a["measurementStatus"]],
        ["Simulation status", p["status"]],
        ["Model type", p["modelType"]],
        ["Room size", d["roomRecommendation"]["roomSize"]],
        ["Listening distance", f'{d["roomRecommendation"]["listeningDistanceM"]} m'],
        ["Manufacturing status", d["manufacturingStatus"]],
        ["Warnings", "; ".join(d["warnings"]) if d["warnings"] else "None"],
        ["Compatibility notes", "; ".join(p["compatibilityNotes"]) or "—"],
        ["Measurement required for", "; ".join(p["measurementRequiredFor"]) or "—"],
        ["Simulated changes", "; ".join(p["simulatedChanges"]) or "—"],
        ["Reference source", p["sourceUrl"]],
        ["Source assets", "; ".join(asset["description"] for asset in p["sourceAssets"]) or "—"],
    ]

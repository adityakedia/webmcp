"""Published reference systems used as simulation-profile sources.

These are representative reference designs, not substitute measurements for a
new cabinet or crossover.  URLs are retained so engineering can re-verify each
catalog entry when a manufacturer revises a design.
"""

REFERENCE_SYSTEMS = {
    "two_way_compact": {
        "name": "SEAS Mimir",
        "source_url": "https://www.seas.no/images/stories/diykits/pdfdataheet/mimir_plans.pdf",
        "drivers": ["SEAS CA18RNX / H1215", "SEAS 27TDFC / H1189"],
        "frequency_range_hz": [20, 20000],
        "sensitivity_db": 84.0,
        "nominal_impedance_ohm": None,
        "max_spl_db": None,
        "crossover_hz": [2200],
        "alignment": "ported",
        "port_tuning_hz": 42.0,
        "net_volume_litres": 14.0,
        "port_inner_diameter_mm": 50.0,
        "port_length_mm": 200.0,
        "damping_description": "150 g Acousto-Q, distributed away from the port",
        "format": "standmount",
        "component_model": "mimir",
        "simulation_eligibility": "reference_ready",
        "model_type": "component_response_model",
        "source_assets": [
            {
                "kind": "driver_response",
                "source_url": "https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html",
                "description": "CA18RNX and 27TDFC FRD response data",
            },
            {
                "kind": "driver_response",
                "source_url": "https://www.seas.no/images/stories/prestige/pdfdatasheet/H1215_CA18RNX_Datasheet.pdf",
                "description": "Official CA18RNX T/S, response and impedance specification",
            },
            {
                "kind": "driver_response",
                "source_url": "https://www.seas.no/images/stories/prestige/pdfdatasheet/h1189_27tdfc_datasheet.pdf",
                "description": "Official 27TDFC response and impedance specification",
            },
            {
                "kind": "impedance",
                "source_url": "https://rjbaudio.com/Audiofiles/Driver%20FRD%20files.html",
                "description": "CA18RNX and 27TDFC ZMA impedance data",
            },
            {
                "kind": "crossover",
                "source_url": "https://www.seas.no/images/stories/diykits/pdfdataheet/mimir_plans.pdf",
                "description": "Published 2.2 kHz acoustic crossover and enclosure plan",
            },
        ],
    },
    "two_way_extended": {
        "name": "SEAS Aphel",
        "source_url": "https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip",
        "drivers": ["SEAS H1471-08 CA22RNY", "SEAS H1212-06 27TBFC/G"],
        "frequency_range_hz": [20, 20000],
        "sensitivity_db": None,
        "nominal_impedance_ohm": None,
        "max_spl_db": None,
        "crossover_hz": [2240],
        "alignment": "ported",
        "port_tuning_hz": 36.0,
        "net_volume_litres": 55.0,
        "port_inner_diameter_mm": None,
        "port_length_mm": None,
        "damping_description": (
            "4 mm bitumen and 10 mm wool felt; polyester foam above the lower brace, "
            "kept clear of the port"
        ),
        "format": "floorstanding",
        "component_model": "aphel",
        "simulation_eligibility": "requires_measurement",
        "model_type": "component_response_model",
        "source_assets": [
            {
                "kind": "driver_response",
                "source_url": "https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip",
                "description": "Official in-cabinet on- and off-axis driver responses",
            },
            {
                "kind": "impedance",
                "source_url": "https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip",
                "description": "Official in-cabinet driver impedance curves",
            },
            {
                "kind": "crossover",
                "source_url": "https://www.seas.no/images/stories/diykits/aphel/DIY_kit_SEAS_Aphel.zip",
                "description": "VituixCAD crossover project and component values",
            },
        ],
    },
    "three_way_reference": {
        "name": "SEAS 403 Revisited",
        "source_url": "https://www.seas.no/index.php?Itemid=250&catid=66%3Aseas-diy-kits&id=651%3Aseas-403-revisited-kit&option=com_content&view=article",
        "drivers": ["SEAS 22TFF", "SEAS MCA12RC", "SEAS CA26RE4X"],
        "frequency_range_hz": [46.875, 22050],
        "sensitivity_db": None,
        "nominal_impedance_ohm": None,
        "max_spl_db": None,
        "crossover_hz": [430, 2350],
        "alignment": "ported",
        "port_tuning_hz": 30.0,
        "net_volume_litres": 44.0,
        "port_inner_diameter_mm": 67.0,
        "port_length_mm": 139.5,
        "damping_description": "Light damping in marked enclosure areas, clear of drivers and port",
        "format": "standmount",
        "component_model": "seas_403",
        "simulation_eligibility": "reference_ready",
        "model_type": "published_system_response",
        "source_assets": [
            {
                "kind": "system_response",
                "source_url": "https://solen.ca/en/products/seas-prestige-403-revisited-3way-loudspeaker-kit",
                "description": "Published completed-system ALL_SPL curve and VituixCAD project",
            },
            {
                "kind": "impedance",
                "source_url": "https://solen.ca/en/products/seas-prestige-403-revisited-3way-loudspeaker-kit",
                "description": "Published woofer, midrange and tweeter impedance curves",
            },
            {
                "kind": "cabinet",
                "source_url": "https://www.seas.no/images/stories/diykits/403/DIY_kit_SEAS_403_Revisited.pdf",
                "description": "Published 44 L cabinet, port and damping plan",
            },
        ],
    },
    "subwoofer_active": {
        "name": "Dayton Audio DCS165-4 active mini-sub kit",
        "source_url": "https://www.parts-express.com/Dayton-Audio-6-1-2-Down-Firing-Active-Mini-Subwoofer-Kit-with-2.1-Channel-Amplifier-300-7161",
        "drivers": ["Dayton Audio DCS165-4"],
        "frequency_range_hz": [35, 1000],
        "sensitivity_db": 87.4,
        "nominal_impedance_ohm": 4,
        "max_spl_db": None,
        "crossover_hz": [30, 150],
        "alignment": "ported",
        "port_tuning_hz": None,
        "simulation_eligibility": "requires_measurement",
        "model_type": "requires_measurement",
        "source_assets": [
            {
                "kind": "driver_response",
                "source_url": "https://www.daytonaudio.com/images/resources/data-files/295-198--Dayton-Audio-DCS165-4_data%20%281%29.zip",
                "description": "Official FRD/ZMA package; download currently upstream-protected",
            },
            {
                "kind": "driver_response",
                "source_url": "https://www.brl.fi/bilder/artiklar/pdf/860DCS1654.pdf",
                "description": "Downloaded DCS165-4 manufacturer datasheet with response and impedance plots",
            },
            {
                "kind": "cabinet",
                "source_url": "https://www.parts-express.com/Dayton-Audio-6-1-2-Down-Firing-Active-Mini-Subwoofer-Kit-with-2.1-Channel-Amplifier-300-7161",
                "description": "Published kit dimensions and DSP crossover range",
            },
        ],
    },
}

// Configuration options for Fc-Construct's MIRE Squiglink
const init_phones = ["10 dB downwards tilt Target", "Sennheiser HE1"], // Graphs to display on initial load
      DIR = "data/",                                // Directory where graph files are stored
      PHONE_BOOK = "data/phone_book.json",          // Path to phone book JSON file
      default_channels = ["L","R"],                 // Default channels to display
      default_normalization = "Hz",                 // Sets default graph normalization mode ("dB" or "Hz")
      default_norm_db = 60,                         // Sets default dB normalization point
      default_norm_hz = 500,                        // Sets default Hz normalization point (500Hz)
      default_smoothing = 0,                        // 0 smoothing by default (pre-smoothed in REW with 1/6-octave acoustic)
      scale_smoothing = 0.2,                        // Scaling factor for smoothing transitions
      max_channel_imbalance = 5,                    // Channel imbalance threshold to show ! in channel selector
      alt_layout = true,                            // Use modern alt layout
      alt_sticky_graph = true,                      // Stick graph to viewport on scroll
      alt_animated = false,                         // Instant graph rendering
      alt_header = true,                            // Configurable header at the top
      alt_header_new_tab = true,                    // Header links open in new tab
      alt_tutorial = true,                          // Display frequency response guide below the graph
      alt_augment = true,                           // Display augment card in phone list
      site_url = './',                              // Base URL
      share_url = true,                             // Enable shareable URLs
      watermark_text = "Fc-Construct's MIRE SquigLink", // Watermark text behind graphs
      watermark_image_url = "",                     // Watermark logo (optional)
      rig_description = "Open-Canal MIRE (In-Ear Mic)", // Rig description
      page_title = "Fc-Construct's MIRE Squiglink", // Appended to page title
      page_description = "Fc-Construct's headphone database taken with open canal in-ear microphones",
      accessories = true,                           // Displays HTML accessories at bottom
      externalLinksBar = true,                      // Row of links at bottom
      expandable = false,
      expandableOnly = false,
      headerHeight = '0px',
      themingEnabled = true,                        // Dark/light theme toggling
      targetDashed = true,                          // Dashed target lines
      targetColorCustom = false,
      targetRestoreLastUsed = false,
      labelsPosition = "bottom-left",
      stickyLabels = true,
      analyticsEnabled = false,                     // Disabled by default
      extraEnabled = true,
      extraUploadEnabled = true,                    // Allow user upload for comparison
      extraEQEnabled = true,                        // Parametric EQ module
      extraEQBands = 10,
      extraEQBandsMax = 20,
      autoEqMode = 'OE',                            // AutoEQ smoothing mode ('OE' for over-ear headphones)
      autoEqSmooth = true,
      num_samples = 3;                              // Default seating samples per channel

// Target curves: Flat reference representing personal DF-HRTF baseline
const targets = [
    { type: "Reference View", files: ["Fc-Construct DF-HRTF", "10 dB downwards tilt"] }
];

// Preference adjustments & Tilt configuration
const preference_bounds_name = "Bounds",
      preference_bounds_dir = "assets/pref_bounds/",
      preference_bounds_startup = false,
      allowSquigDownload = false,
      default_y_scale = "40db",
      default_DF_name = "10 dB downwards tilt",                     // Default base target curve is Flat (0 dB)
      dfBaseline = true,                            // Uses baseline reference for custom tilt
      default_bass_shelf = 0,                       // Default custom bass shelf
      default_tilt = -1,                             // Default custom tilt value
      default_ear = 0,                              // Default ear gain value
      default_treble = 0,                           // Default treble gain value
      tiltableTargets = ["Fc-Construct DF-HRTF", "10 dB downwards tilt"],                   // Targets allowed to be tilted
      compTargets = ["Fc-Construct DF-HRTF", "10 dB downwards tilt"],                       // Targets allowed to be compensated
      allowCreatorSupport = false,                  // Creator support button in header
      creatorSupportUrl = "",                       // Creator support link (e.g. Ko-fi, Patreon)
      sponsorshipsEnabled = false,                  // Third-party sponsorship popup and banner framework (disabled)
      shoplinksEnabled = false,                     // Automated shop/affiliate links framework (disabled)
      graphAggregatorEnabled = false;               // Cross-database search aggregator (disabled by default)

// Coupler-specific Harman preset filters removed
const harmanFilters = false;

// Watermark setup
function watermark(svg) {
    let wm = svg.append("g")
        .attr("transform", "translate(" + (pad.l + W / 2) + "," + (pad.t + H / 2 - 20) + ")")
        .attr("opacity", 0.18);

    if (watermark_image_url) {
        wm.append("image")
            .attrs({id: 'logo', x: -64, y: -64, width: 128, height: 128, "xlink:href": watermark_image_url, "class": "graph_logo"});
    }

    if (watermark_text) {
        wm.append("text")
            .attrs({id: 'wtext', x: 0, y: 75, "font-size": 24, "text-anchor": "middle", "class": "graph-name"})
            .text(watermark_text);
    }

    if (rig_description) {
        wm.append("text")
            .attrs({x: 380, y: -134, "font-size": 9, "text-anchor": "end", "class": "rig-description", "style": "filter: var(--svg-filter);"})
            .text("Measured on: " + rig_description);
    }
}

// Parse FR text data from REW or AudioTool format
function tsvParse(fr) {
    if (!fr || typeof fr !== 'string' || fr.trim().startsWith('<')) return [];
    return fr.split(/[\r\n]/)
        .map(l => l.trim()).filter(l => l && l[0] !== '*')
        .map(l => l.split(/[\s,]+/).map(e => parseFloat(e)).slice(0, 2))
        .filter(t => !isNaN(t[0]) && !isNaN(t[1]));
}

// Apply layout stylesheets
function setLayout() {
    function applyStylesheet(styleSheet) {
        var docHead = document.querySelector("head"),
            linkTag = document.createElement("link");
        linkTag.setAttribute("rel", "stylesheet");
        linkTag.setAttribute("type", "text/css");
        linkTag.setAttribute("href", styleSheet);
        docHead.append(linkTag);
    }
    if (!alt_layout) {
        applyStylesheet("assets/css/style.css");
    } else {
        applyStylesheet("assets/css/style-alt.css");
        applyStylesheet("assets/css/style-alt-theme.css");
    }
}
setLayout();

// Footer accessories
const simpleAbout = `
    <p class="center">Fc-Construct's MIRE Squiglink — Open-canal in-ear microphone measurements compensated against personal measured HRTF baseline.</p>
`;
const whichAccessoriesToUse = simpleAbout;

// External links bar
const linkSets = [
    {
        label: "Resources & Databases",
        links: [
            {
                name: "Headphones.com Reviews",
                url: "https://headphones.com/"
            },
            {
                name: "In-Ear Fidelity",
                url: "https://crinacle.com/"
            },
            {
                name: "Squiglink Network",
                url: "https://squig.link/"
            }
        ]
    }
];

// Header branding
let headerLogoText = "Fc-Construct",
    headerLogoImgUrl = "",
    headerLinks = [
        {
            name: "Reviews",
            url: "https://www.youtube.com/channel/UCPY9gXKSlBKqYKOxmcaMrDA"
        }
    ];

// Tutorial guide spectrum definitions
let tutorialDefinitions = [
    {
        name: 'Sub bass',
        width: '16%',
        description: 'The Rumble (20-60 Hz). Deep low-end extension felt as visceral weight.'
    },
    {
        name: 'Bass',
        width: '20.6%',
        description: 'The Punch and Warmth (60-250 Hz). Determines bass body, kick drum impact, and bass guitar fullness.'
    },
    {
        name: 'Lower Mids',
        width: '10.1%',
        description: 'Body & Foundation (250-500 Hz). Fundamental frequencies of male vocals and primary instrument resonance.'
    },
    {
        name: 'Midrange',
        width: "20%",
        description: 'Vocal Presence & Clarity (500-2000 Hz). The primary vocal and instrumental intelligibility range.'
    },
    {
        name: 'Upper Mids / Ear Gain',
        width: "10%",
        description: 'Ear Canal Gain region (2-4 kHz). In MIRE measurements, pre-compensated for open-canal HRTF baseline.'
    },
    {
        name: 'Presence',
        width: '5.9%',
        description: 'Definition & Articulation (4-6 kHz). Adds attack to percussion and crisp consonant definition.'
    },
    {
        name: 'Treble & Air',
        width: '17.4%',
        description: 'Harmonics, Sparkle, & Air (6-20 kHz). Cymbals, micro-detail, and room reverberation.'
    }
];

// Plugins
let extraEQplugins = [];

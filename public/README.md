# Fc-Construct's MIRE Squiglink

An open-canal **MIRE (Microphone-in-Real-Ear)** frequency response database and interactive visualization tool for over-ear headphones, maintained by **Fc-Construct**.

---

## 1. Project Overview & Vision

This application is customized specifically for **open-canal MIRE headphone acoustic measurements**, eliminating artificial coupler assumptions, stripping third-party ad injection, and introducing dedicated seating, channel, and variant controls.

### The MIRE Acoustic Paradigm
- **Microphone-in-Real-Ear (MIRE)**: Measurements are captured using miniature probe microphones placed at the entrance of Fc-Construct's unoccluded ear canal while wearing over-ear headphones.
- **Natural Anatomical HRTF**: Because sound naturally interacts with the human head, pinna, and concha during testing, measured responses incorporate Fc-Construct's real Head-Related Transfer Function (HRTF).
- **The Reference View & Custom Tilt Engine**:
  - **`10 dB downwards tilt`**: Applies a $-1\text{ dB/Octave}$ downwards slope ($+5\text{ dB}$ to $-5\text{ dB}$ from 20 Hz to 20 kHz). This is the **default view on initial page load**, reflecting Harman research preference averages.
  - **`Fc-Construct DF-HRTF`**: The flat (0 dB) baseline representing Fc-Construct's uncompensated diffuse-field/free-field HRTF measurement.
  - **Dynamic `CUSTOM` Reference State**: Modifying preference adjustments (Tilt, Bass shelf, Treble, or Ear Gain) automatically shifts the reference view to **`CUSTOM`**, rendering a dedicated `CUSTOM` box in the Reference View panel and displaying parameters on the graph.
- **Acoustic Seating Variance**:
  - Over-ear headphones exhibit placement and pad leakage variance. Headphones are measured across multiple distinct seatings (e.g. 3 seatings per ear: `L1..L3` and `R1..R3`) as well as pad-seal variations (e.g. wearing eyeglasses vs clean seal).

---

## 2. Key Architecture & Visualization Systems

### A. Color-Blind Safe Palette & Consistent Anchor Color Architecture
- **Curated Color-Blind Safe HCL Palette**: Built with 12 perceptually uniform HCL hues specifically calibrated to avoid red-green confusion, providing high legibility for all color vision types.
- **Anchor Color Consistency**:
  - **Primary/Anchor Model**: The first active headphone on screen is always assigned **Index 0 (Cobalt Blue)**.
  - **Comparator Models**: Additional headphones receive subsequent colors in a strict, high-contrast sequence (Orange, Sea Green, Violet, Magenta, Teal, etc.).
  - **Screenshot Continuity**: Deselecting headphones allows remaining models to dynamically retain their stable slot position, keeping colors consistent across comparative screenshots.

### B. Channel Line Styles & Visual Legend
- **Right Channel (`R`)**: Displayed as a **solid line** (`─ R`) for maximum readability.
- **Left Channel (`L`)**: Displayed as a **dashed line** (`- - L`).
- **Legend Prefixes**: Both the graph legend and the bottom comparison table explicitly display **`- - L`** and **`─ R`** prefixes next to channel text.
- **Non-Clashing Target/Tilt Lines**: Reference targets and preference tilt bounds are styled as **fine dotted lines** (`2, 4` at 55% opacity) to prevent visual confusion with headphone left channels.

### C. Calculate Band Area Tool (`∫ calculate`)
- **Interactive Frequency Span Selection**: Click the **`∫ calculate`** button in the top control bar to activate the interactive band area tool. Drag across any region of the frequency graph (e.g. 250 Hz – 508 Hz or 1.5 kHz – 4.1 kHz) to highlight a specific acoustic region.
- **Selection Style**: Renders a clean, neutral light grey selection box (`rgba(255, 255, 255, 0.08)` fill) bounded by a thin solid line (`1px` neutral border).
- **Log-Weighted Octave Average Calculation**: Computes the log-weighted average decibel difference across the highlighted frequency band between the active curves (e.g. Left vs Right channel matching or headphone comparison).
- **Subtle Floating Pop-Up Note**: Displays a compact pop-up note badge showing the selected frequency range in Hz/kHz, octave span, and the exact average decibel difference (e.g. `250 Hz – 508 Hz (1.02 Oct)` and `Avg Diff: 0.12 dB`).

### D. Technical Data Pipeline
```
                               ┌──────────────────────────────────────────┐
                               │           /data/ DIRECTORY               │
                               │   (Your Single Source of Truth on GitHub)│
                               └────────────────────┬─────────────────────┘
                                                    │
                                                    ▼
                                       ┌──────────────────────────┐
                                       │   update_phonebook.py    │
                                       │ (Automated Python Script)│
                                       └────────────┬─────────────┘
                                                    │
                                ┌───────────────────┴───────────────────┐
                                ▼                                       ▼
                     ┌─────────────────────┐                 ┌─────────────────────┐
                     │ data/phone_book.json│                 │ /public/data/ Mirror│
                     │  (Production Site)  │                 │  (AI Studio Preview)│
                     └─────────────────────┘                 └─────────────────────┘
```

1. **`/data/` Single Source of Truth**: You only drop `.txt` files into `/data/`. A GitHub Action automatically triggers on every commit, runs `update_phonebook.py`, and publishes the updated `phone_book.json`.
2. **100% Dynamic Variant Discovery**: Variants are extracted dynamically by identifying common model prefixes and extracting remaining tokens (e.g., `G` or `Glasses` $\rightarrow$ `Glasses`, `Vienna` $\rightarrow$ `Vienna`).
3. **Smoothing Metadata Detector**: Header metadata is parsed upon load. Non-standard or missing REW smoothing (e.g. `1/12 octave` or `None`) displays a subtle `⚠️` warning badge with a tooltip, while standard 1/6-octave acoustic measurements remain clean.
4. **Performance & RAM Caching**: Parsed curve arrays and raw text files are cached in memory. An idle-time background prefetcher (`requestIdleCallback`) pre-loads remaining library items during idle browser time for instantaneous switching.

---

## 3. How the Parser Works (Reference Guide)

Understanding how `update_phonebook.py` processes filenames will help you upload data cleanly so headphones appear with the exact desired names.

### Step 1: Stemming Channel & Seating
The parser strips `.txt` and looks at the very end of the string for channel (`L` or `R`) and seating number (`1` to `9`):
- `Audio Technica ATH R50x G L1.txt` $\rightarrow$ Channel: `L`, Seating: `1`, Base string: `Audio Technica ATH R50x G`
- `Sony MDR-MV1 R2.txt` $\rightarrow$ Channel: `R`, Seating: `2`, Base string: `Sony MDR-MV1`

### Step 2: Multi-Word Brand Extraction
The parser splits single-word brands (like `Sony`, `Sennheiser`, `Focal`, `Hifiman`, `AUNE`) automatically on the first space.

For **multi-word brands** (where a space occurs inside the brand name itself), the parser checks the `MULTIWORD_BRANDS` list at the top of `update_phonebook.py`:
```python
MULTIWORD_BRANDS = [
    "Audio Technica",
    "Dan Clark Audio",
    "Austrian Audio",
    "Meze Audio",
    "ZMF Headphones"
]
```
- **Example**: `Audio Technica ATH R50x`
  - Matches `Audio Technica` as the brand name.
  - Leaves `ATH R50x` as the model string.
  - *Note*: If you ever add a new headphone from a multi-word brand that isn't listed (e.g., `Bang Olufsen` or `Final Audio`), simply add that string to `MULTIWORD_BRANDS` in `update_phonebook.py`.

### Step 3: Variant & Suffix Extraction
The parser groups files under the shortest common core model name and assigns variant suffixes:
- **Priority 1: Parentheses `(...)`**:
  - `AUNE AR3000 (Vienna Glasses) L1.txt` $\rightarrow$ Core Model: `AR3000`, Variant: `Vienna Glasses`
  - `Sennheiser HD600 (Velour Pads) L1.txt` $\rightarrow$ Core Model: `HD600`, Variant: `Velour Pads`
- **Priority 2: Keyword scanning without brackets**:
  - `Audio Technica ATH R50x L1.txt` $\rightarrow$ Core Model: `ATH R50x`, Variant: `""` (Main)
  - `Audio Technica ATH R50x G L1.txt` $\rightarrow$ Core Model: `ATH R50x`, Variant: `Glasses`
  - `AUNE AR3000 Vienna L1.txt` $\rightarrow$ Core Model: `AR3000`, Variant: `Vienna`
  - `AUNE AR3000 Vienna G L1.txt` $\rightarrow$ Core Model: `AR3000`, Variant: `Vienna Glasses`

---

## 4. User Guide: How to Upload New Measurements

### Step 1: Exporting from REW
1. In REW, take your measurements (typically 3 seatings on Left and 3 seatings on Right).
2. Apply **1/6-octave acoustic smoothing** to your measurements. Apply L and R DF-HRTF compensation.
3. Choose **File $\rightarrow$ Export $\rightarrow$ Export measurement as text** (`.txt`, tab/space separated).

---

### Step 2: Naming Your Files
Name your files following this standard format:
```
[Brand] [Model] [Optional Variant or G] [Channel][Seating].txt
```

#### Filename Examples:
| What You Measured | Filename to Upload | How It Appears in App |
| :--- | :--- | :--- |
| **Sony MDR-MV1 (Clean Seal, Left Ear, Seat 1)** | `Sony MDR-MV1 L1.txt` | Brand: `Sony`, Model: `MDR-MV1` |
| **Sony MDR-MV1 (Eyeglasses, Left Ear, Seat 1)** | `Sony MDR-MV1 G L1.txt` | Brand: `Sony`, Model: `MDR-MV1` (Variant toggle: `Glasses`) |
| **Audio Technica ATH R50x (Clean Seal, Left Ear, Seat 1)** | `Audio Technica ATH R50x L1.txt` | Brand: `Audio Technica`, Model: `ATH R50x` |
| **Audio Technica ATH R50x (Eyeglasses, Left Ear, Seat 1)** | `Audio Technica ATH R50x G L1.txt` | Brand: `Audio Technica`, Model: `ATH R50x` (Variant toggle: `Glasses`) |
| **AUNE AR3000 (Vienna Demo Unit, Clean Seal, Left Ear, Seat 1)** | `AUNE AR3000 Vienna L1.txt` | Brand: `AUNE`, Model: `AR3000` (Variant toggle: `Vienna`) |
| **AUNE AR3000 (Vienna Demo Unit, Eyeglasses, Left Ear, Seat 1)** | `AUNE AR3000 Vienna G L1.txt` | Brand: `AUNE`, Model: `AR3000` (Variant toggle: `Vienna Glasses`) |
| **Custom Pad Swap (Parentheses example)** | `Sennheiser HD600 (Velour Pads) L1.txt` | Brand: `Sennheiser`, Model: `HD600` (Variant toggle: `Velour Pads`) |

---

### Step 3: Uploading Directly on GitHub
1. Open your repository on **GitHub.com**.
2. Navigate to the **`/data/`** directory.
3. Click **Add file $\rightarrow$ Upload files**.
4. Drag and drop your `.txt` files into the box and click **Commit changes**.
5. The GitHub Action will process the files and update the live site within seconds!

---

## 5. Summary Ingestion Checklist
- [ ] **File Extension**: Ensure files end in `.txt`.
- [ ] **Channel & Seating**: End filenames with `L1..L9` or `R1..R9` (e.g. `L1`, `L2`, `L3`).
- [ ] **Glasses Seal**: Use `G` or `Glasses` (e.g., `Sony MDR-MV1 G L1.txt` or `Sony MDR-MV1 (Glasses) L1.txt`).
- [ ] **Multi-Word Brands**: Add new multi-word brand names like `Audio Technica` or `Dan Clark Audio` to `MULTIWORD_BRANDS` in `update_phonebook.py` if needed.
- [ ] **REW Smoothing**: Keep **1/6-octave acoustic smoothing** enabled during REW text export so the header contains `* Smoothing: 1/6 octave` to avoid warning badges.
- [ ] **REW Calibration**: Calibrate measurements with the appropriate L and R Fc-Construct DF-HRTF files prior to export. 
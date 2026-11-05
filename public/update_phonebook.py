#!/usr/bin/env python3
"""
update_phonebook.py
Automation script for Fc-Construct's MIRE Squiglink.

Treats /data/ as the single source of truth:
1. Scans /data/ directory for headphone measurement files.
2. Parses brands, models, variants, channels, and seatings.
   - Eliminates "Default" terminology so main measurements have no variant suffix.
   - Priority 1: Explicit parentheses `(...)` for variants.
   - Priority 2: Keyword scanning for seal (`G`, `Glasses`) and location/unit tags (`Vienna`, `CanJam`, `Tour`, `Unit B`, `Sample 2`, etc.).
3. Generates data/phone_book.json.
4. Automatically mirrors all measurement files and phone_book.json into /public/data/
   so the AI Studio / Vite preview environment is always 100% in sync with /data/.
"""

import os
import re
import json
import shutil
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "phone_book.json")
PUBLIC_OUTPUT_FILE = os.path.join(PUBLIC_DATA_DIR, "phone_book.json")

# Known headphone brands for clean categorization
COMMON_BRANDS = [
    "Sennheiser", "Hifiman", "Audeze", "Beyerdynamic", "Focal",
    "AKG", "Audio-Technica", "Meze", "Sony", "Dan Clark Audio",
    "Moondrop", "Koss", "Stax", "ZMF", "Abyss", "Grado",
    "Shure", "Bose", "Apple", "Austrian Audio", "Denon", "Fostex",
    "AUNE", "Aune"
]

# Known non-model variant keywords (locations, event demos, condition tags)
KNOWN_VARIANT_KEYWORDS = [
    "Vienna", "CanJam", "Tour", "Demo", "Event",
    "Unit 1", "Unit 2", "Unit A", "Unit B",
    "Sample 1", "Sample 2", "S1", "S2"
]

def parse_filename(filename):
    """
    Parses a measurement filename.
    Returns dict with file metadata or None.

    Examples handled:
      - Sennheiser HD600 L1.txt                        -> Model: HD600, Variant: None
      - Sennheiser HD600 (Glasses) L1.txt              -> Model: HD600, Variant: Glasses
      - Sony MDR-MV1 G L1.txt                          -> Model: MDR-MV1, Variant: Glasses
      - AUNE AR3000 Vienna L1.txt                      -> Model: AR3000, Variant: Vienna
      - AUNE AR3000 Vienna G L.txt                     -> Model: AR3000, Variant: Vienna Glasses
      - AUNE AR3000 (Vienna Glasses) L1.txt            -> Model: AR3000, Variant: Vienna Glasses
    """
    if not filename.endswith(".txt"):
        return None

    stem = filename[:-4].strip()

    # Match channel and optional seating number at the end: e.g. " L1", " R3", " L"
    match = re.search(r"^(.*?)\s+([LR])(\d*)$", stem, re.IGNORECASE)
    if not match:
        return None

    full_name = match.group(1).strip()
    channel = match.group(2).upper()
    seating = match.group(3)

    model_root = full_name
    variant_suffix = None

    # PRIORITY 1: Explicit parentheses check e.g. "AUNE AR3000 (Vienna Glasses)"
    paren_match = re.search(r"^(.*?)\s*\(([^)]+)\)$", full_name)
    if paren_match:
        model_root = paren_match.group(1).strip()
        v_str = paren_match.group(2).strip()
        # Clean up "G" in brackets to "Glasses"
        v_str = re.sub(r"\bG\b", "Glasses", v_str, flags=re.IGNORECASE)
        variant_suffix = v_str
    else:
        # PRIORITY 2: Keyword scanning without brackets e.g. "AUNE AR3000 Vienna G"
        tokens = full_name.split()
        var_parts = []
        model_parts = []

        for token in tokens:
            t_lower = token.lower()
            if t_lower in ["g", "glasses"]:
                var_parts.append("Glasses")
            elif any(t_lower == kw.lower() for kw in KNOWN_VARIANT_KEYWORDS):
                var_parts.append(token)
            else:
                model_parts.append(token)

        if var_parts:
            model_root = " ".join(model_parts)
            variant_suffix = " ".join(var_parts)

    return {
        "full_file_prefix": full_name,
        "model_root": model_root,
        "variant": variant_suffix,
        "channel": channel,
        "seating": int(seating) if seating else 1
    }

def extract_brand_and_model(model_root):
    """
    Extracts brand and model from model_root string.
    Checks against COMMON_BRANDS, otherwise splits on first word.
    """
    for brand in COMMON_BRANDS:
        if model_root.lower().startswith(brand.lower()):
            model = model_root[len(brand):].strip()
            return brand, model if model else brand

    # Fallback: split on first space
    parts = model_root.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return model_root, model_root

def sync_data_to_public():
    """
    Synchronizes /data/ to /public/data/ so Vite in AI Studio serves
    identical files without manual copying.
    """
    if not os.path.exists(DATA_DIR):
        return

    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

    # Copy / update files from DATA_DIR to PUBLIC_DATA_DIR
    for root, dirs, files in os.walk(DATA_DIR):
        rel_path = os.path.relpath(root, DATA_DIR)
        dest_dir = os.path.join(PUBLIC_DATA_DIR, rel_path) if rel_path != "." else PUBLIC_DATA_DIR
        os.makedirs(dest_dir, exist_ok=True)
        for f in files:
            src_file = os.path.join(root, f)
            dest_file = os.path.join(dest_dir, f)
            if not os.path.exists(dest_file) or os.path.getmtime(src_file) > os.path.getmtime(dest_file):
                shutil.copy2(src_file, dest_file)

    # Remove files in PUBLIC_DATA_DIR that were deleted from DATA_DIR
    for root, dirs, files in os.walk(PUBLIC_DATA_DIR):
        rel_path = os.path.relpath(root, PUBLIC_DATA_DIR)
        src_dir = os.path.join(DATA_DIR, rel_path) if rel_path != "." else DATA_DIR
        for f in files:
            src_file = os.path.join(src_dir, f)
            if not os.path.exists(src_file):
                try:
                    os.remove(os.path.join(root, f))
                except OSError:
                    pass

def generate_phonebook():
    if not os.path.exists(DATA_DIR):
        print(f"Error: Directory '{DATA_DIR}' does not exist.")
        return

    # Scan for measurement files (excluding targets and subdirectories)
    entries = []
    for fname in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.isfile(fpath):
            parsed = parse_filename(fname)
            if parsed:
                entries.append(parsed)

    if not entries:
        print(f"No valid measurement files found in '{DATA_DIR}'.")
        return

    # Group by Brand -> Model Root -> Variants
    brand_groups = defaultdict(lambda: defaultdict(dict))
    seating_stats = defaultdict(lambda: defaultdict(int))

    for item in entries:
        brand, model = extract_brand_and_model(item["model_root"])
        var = item["variant"] or ""  # Main measurement has empty variant label (no "Default")
        full_prefix = item["full_file_prefix"]
        brand_groups[brand][model][var] = full_prefix
        seating_stats[full_prefix][item["channel"]] = max(
            seating_stats[full_prefix][item["channel"]],
            item["seating"]
        )

    # Build JSON structure
    phonebook = []
    for brand in sorted(brand_groups.keys()):
        phones_list = []
        for model in sorted(brand_groups[brand].keys()):
            variants = brand_groups[brand][model]
            
            # If multiple variants exist
            if len(variants) > 1:
                # Put main measurement (empty var "") first
                sorted_var_keys = sorted(variants.keys(), key=lambda v: (0 if v == "" else 1, v))
                file_list = [variants[v] for v in sorted_var_keys]
                suffix_list = [v for v in sorted_var_keys]
                
                phones_list.append({
                    "name": model,
                    "file": file_list,
                    "suffix": suffix_list
                })
            else:
                var_name = list(variants.keys())[0]
                file_prefix = variants[var_name]
                phones_list.append({
                    "name": model if var_name == "" else f"{model} ({var_name})",
                    "file": file_prefix
                })

        phonebook.append({
            "name": brand,
            "phones": phones_list
        })

    # Save to data/phone_book.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(phonebook, f, indent=2)

    # Sync everything to /public/data/ for AI Studio preview
    sync_data_to_public()

    # Also save to public/data/phone_book.json
    with open(PUBLIC_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(phonebook, f, indent=2)

    print(f"Successfully generated {OUTPUT_FILE} and synced to {PUBLIC_DATA_DIR}")
    print(f"Indexed {len(phonebook)} brand(s):")
    for b in phonebook:
        print(f"  • {b['name']}: {len(b['phones'])} model(s)")
        for p in b["phones"]:
            name = p["name"] if isinstance(p["name"], str) else p["name"][0]
            if "suffix" in p:
                display_suffixes = [s if s != "" else "Main" for s in p['suffix']]
                print(f"     - {name} [Variants: {', '.join(display_suffixes)}]")
            else:
                print(f"     - {name}")

if __name__ == "__main__":
    generate_phonebook()

#!/usr/bin/env python3
"""
update_phonebook.py
Automation script for Fc-Construct's MIRE Squiglink.

Treats /data/ as the single source of truth:
1. Scans /data/ directory for headphone measurement files.
2. Parses brands, models, variants, channels, and seatings.
3. Generates data/phone_book.json.
4. Automatically mirrors all measurement files and phone_book.json into /public/data/.
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

# Known multi-word headphone brands for clean categorization
# Any single-word brand (like Sony, Sennheiser, Focal, AUNE) is dynamically handled by fallback splitting!
MULTIWORD_BRANDS = [
    "Audio Technica",
    "Dan Clark Audio",
    "Austrian Audio",
    "Meze Audio",
    "ZMF Headphones"
]

def parse_filename(filename):
    """
    Stems channel and seating number from the end of the filename.
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

    return {
        "full_file_prefix": full_name,
        "channel": channel,
        "seating": int(seating) if seating else 1
    }

def extract_brand_and_model(full_file_prefix):
    """
    Extracts brand and model string.
    1. Checks if file starts with a known multi-word brand (e.g. "Audio Technica").
    2. Fallback: Splits on the first space (e.g. "Sony MDR-MV1" -> Brand: "Sony", Model: "MDR-MV1").
    """
    # Sort multi-word brands by length descending
    sorted_multi = sorted(MULTIWORD_BRANDS, key=len, reverse=True)
    for brand in sorted_multi:
        if full_file_prefix.lower().startswith(brand.lower()):
            rest = full_file_prefix[len(brand):].strip()
            return brand, rest if rest else brand

    # Universal Fallback: split on first space
    parts = full_file_prefix.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return full_file_prefix, full_file_prefix

def sync_data_to_public():
    if not os.path.exists(DATA_DIR):
        return

    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

    for root, dirs, files in os.walk(DATA_DIR):
        rel_path = os.path.relpath(root, DATA_DIR)
        dest_dir = os.path.join(PUBLIC_DATA_DIR, rel_path) if rel_path != "." else PUBLIC_DATA_DIR
        os.makedirs(dest_dir, exist_ok=True)
        for f in files:
            src_file = os.path.join(root, f)
            dest_file = os.path.join(dest_dir, f)
            if not os.path.exists(dest_file) or os.path.getmtime(src_file) > os.path.getmtime(dest_file):
                shutil.copy2(src_file, dest_file)

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

    # Scan for measurement files
    raw_files = set()
    for fname in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.isfile(fpath):
            parsed = parse_filename(fname)
            if parsed:
                raw_files.add(parsed["full_file_prefix"])

    if not raw_files:
        print(f"No valid measurement files found in '{DATA_DIR}'.")
        return

    # Group by Brand -> List of file prefixes
    brand_prefixes = defaultdict(set)
    for prefix in raw_files:
        brand, rest = extract_brand_and_model(prefix)
        brand_prefixes[brand].add((prefix, rest))

    # Dynamic model & variant discovery per brand
    phonebook = []
    for brand in sorted(brand_prefixes.keys()):
        prefixes_info = list(brand_prefixes[brand])  # List of (full_prefix, rest_string)

        # 1. Identify base primary files (files without explicit parentheses, and without trailing ' G')
        base_models = {}
        for full_p, rest in prefixes_info:
            clean_rest = re.sub(r"\s*\([^)]+\)", "", rest).strip()
            clean_rest = re.sub(r"\s+\b(G|Glasses)\b$", "", clean_rest, flags=re.IGNORECASE).strip()
            if not clean_rest:
                clean_rest = brand

            if clean_rest not in base_models:
                base_models[clean_rest] = []
            base_models[clean_rest].append(full_p)

        # 2. Further merge models if one model string is a prefix of another model string
        sorted_model_names = sorted(base_models.keys(), key=len)
        merged_groups = defaultdict(list)

        for name in sorted_model_names:
            target_group = name
            for existing in merged_groups.keys():
                if name == existing or name.startswith(existing + " "):
                    target_group = existing
                    break
            merged_groups[target_group].extend(base_models[name])

        # 3. Build phones_list for this brand
        phones_list = []
        for core_model, file_prefixes in sorted(merged_groups.items()):
            def get_variant_label(prefix):
                _, rest = extract_brand_and_model(prefix)
                paren = re.search(r"\(([^)]+)\)", rest)
                if paren:
                    label = paren.group(1).strip()
                    return re.sub(r"\bG\b", "Glasses", label, flags=re.IGNORECASE)

                diff = rest[len(core_model):].strip() if rest.startswith(core_model) else rest.strip()
                if not diff:
                    return ""

                diff_tokens = diff.split()
                cleaned_tokens = ["Glasses" if t.lower() in ["g", "glasses"] else t for t in diff_tokens]
                return " ".join(cleaned_tokens)

            variants_map = {}
            for p in file_prefixes:
                label = get_variant_label(p)
                variants_map[label] = p

            if len(variants_map) > 1:
                sorted_labels = sorted(variants_map.keys(), key=lambda v: (0 if v == "" else 1, v))
                file_list = [variants_map[v] for v in sorted_labels]
                suffix_list = [v for v in sorted_labels]

                phones_list.append({
                    "name": core_model,
                    "file": file_list,
                    "suffix": suffix_list
                })
            else:
                var_name = list(variants_map.keys())[0]
                file_prefix = variants_map[var_name]
                phones_list.append({
                    "name": core_model if var_name == "" else f"{core_model} ({var_name})",
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

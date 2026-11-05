# Architecture Plan: Multi-Layer Nested Checkbox Selection Engine (Revised)

This document outlines the revised architectural design and implementation plan for replacing Squiglink's legacy selection system with a **modular, multi-layer nested checkbox tree** directly inside the sidebar.

---

## 1. Key Clarifications & UI/UX Principles

1. **L Average and R Average Separation (No Forced Mono L+R Mix)**:
   - **Left Channel Average** (`L AVG`): The acoustic average of the left-ear seatings (`L1`, `L2`, `L3`...).
   - **Right Channel Average** (`R AVG`): The acoustic average of the right-ear seatings (`R1`, `R2`, `R3`...).
   - **Single Headphone Active**: Plots both **`L AVG`** and **`R AVG`** as two distinct curves.
   - **Multiple Headphones Active (Comparison Mode)**: Automatically defaults to plotting **`R AVG`** for each compared headphone to avoid overwhelming clutter, while allowing users to manually expand and toggle `L AVG` or individual seatings as desired.

2. **Fully Nested Sidebar Hierarchy**:
   - Everything lives inside the main sidebar tree under **Brand $\rightarrow$ Model**. There are no separate tabs for variants or channels.
   - **Structure**:
     - `Brand` (e.g., `Sennheiser`)
       - `[ ] Model` (e.g., `HE1`) — Chevron `[►]` on the far right
         - `[ ] Stock` (Variant 1) — Chevron `[►]` on the far right
           - `[ ] Left Channel (L)` — Chevron `[►]` on the far right
             - `[ ] Seat 1 (L1)`
             - `[ ] Seat 2 (L2)`
             - `[ ] Seat 3 (L3)`
           - `[ ] Right Channel (R)` — Chevron `[►]` on the far right
             - `[ ] Seat 1 (R1)`
             - `[ ] Seat 2 (R2)`
             - `[ ] Seat 3 (R3)`
         - `[ ] Glasses (G)` (Variant 2) — Chevron `[►]` on the far right...

3. **Right-Aligned Chevron Toggles (`►` / `▼`)**:
   - Placed on the **far right** side of any node that has child items (Models, Variants, and Channels).
   - Clicking the chevron expands/collapses the children without toggling the checkbox.
   - Clicking the text or checkbox toggles selection state.

4. **First-Load Placeholder Swap**:
   - On initial load, `Sennheiser HE1` is active by default as a placeholder.
   - The **first time** a user checks any other model, `Sennheiser HE1` automatically unchecks itself and disappears from the graph.
   - All subsequent selections are 100% additive.

---

## 2. Refactoring Strategy & Code Architecture

To prevent `graphtool.js` from becoming monolithic and hard to maintain:

### Modular Component Strategy:
- **`assets/js/tool_components/phoneTree.js` (New Component)**:
  - Encapsulates all sidebar tree rendering, DOM hierarchy, chevron expand/collapse toggles, and checkbox state propagation (`[x]`, `[-]`, `[ ]`).
  - Exposes a clean, event-driven callback API:
    ```js
    phoneTree.onSelectionChange(activeCurves => {
        // Pure data contract: passes updated active curve objects to graphtool
    });
    ```
- **`graphtool.js` (Clean Consumer)**:
  - Consumes selection events from `phoneTree.js`.
  - Responsible strictly for graph rendering, D3 path calculations, target tilt math, and the bottom comparison table.

---

## 3. Implementation Steps

1. **Step 1: Modular Sidebar Tree Component (`phoneTree.js`)**:
   - Build hierarchical tree model from `allPhones` data.
   - Implement right-aligned chevron toggles and nested DOM structure.
   - Build Indeterminate (`[-]`) state logic for parent nodes.

2. **Step 2: Selection & Channel Channel Rules (`graphtool.js`)**:
   - Implement `L AVG` and `R AVG` defaults for single vs. multi-headphone comparison mode.
   - Implement first-click placeholder swap for initial `Sennheiser HE1`.

3. **Step 3: Graph & Table Sync**:
   - Connect `phoneTree` events to `updatePaths()`, `updatePhoneTable()`, and `getColor_AC()`.

4. **Step 4: Verification & Final Polish**:
   - Verify chevron toggles, right alignment, smooth expansion, and fast curve rendering.

---

## 4. Verification & Testing Checklist

- [ ] **Single Selection**: Checking `Sennheiser HE1` plots both `L AVG` and `R AVG` separately.
- [ ] **First-Click Swap**: Checking `Sony MDR-MV1` automatically unchecks `Sennheiser HE1`.
- [ ] **Multi-Headphone Comparison**: Checking `ZMF Caldera` plots its `R AVG` alongside `Sony MDR-MV1 R AVG`.
- [ ] **Chevrons**: Expand/collapse chevrons appear on the right side of Models, Variants, and Channels (L/R).
- [ ] **Seating Drill-Down**: Expanding `Right Channel (R)` shows `R1`, `R2`, `R3` checkboxes. Checking `R1` sets `R` to `[-]` (Indeterminate) and plots only `R1`.

# MIRE Model, Variant, and Channel Selection UX

## Project context

Mirelink is a browser-based headphone frequency-response comparison tool forked from Squiglink and customized for open-canal MIRE measurements. The live GitHub Pages app is served from the repository root. Its graph and much of its shared state are managed by `assets/js/graphtool.js`; comparison-row controls are in `assets/js/tool_components/phoneTable.js`.

The existing sidebar browses brands and models. Selecting an item adds it to the graph and comparison panel. Variant selection and channel/seating display are currently handled separately, primarily through controls in the comparison panel.

## Measurement model

A headphone model can have multiple measurement variants, such as clean seal and glasses. Each variant can contain several left-ear seatings and several right-ear seatings, for example `L1`, `L2`, `L3`, `R1`, `R2`, and `R3`.

Treat these as distinct dimensions:

- **Variant:** measurement condition, such as clean seal or glasses.
- **Channel:** left ear (L) or right ear (R).
- **Seating:** repeated measurement of the same channel and variant.

Left and right are not interchangeable samples. Average seatings within their own channel first. Only combine L and R when the user explicitly enables the L+R view.

For L+R average, first compute the L seating average and the R seating average separately, then combine those two channel averages with equal weight. Do not pool all raw L/R seatings together, because the number of seatings may differ between channels.

Use the existing `avgCurves` convention in `assets/js/graphtool.js` for averaging unless investigation shows it cannot support the intended calculations. Do not silently switch to arithmetic averaging of dB values.

## Product direction

An earlier design exploration considered a deeply nested measurement tree, with individual channels and seatings as selectable nodes. The current direction is intentionally simpler:

- Keep the existing sidebar and selection behavior.
- Make model variants directly visible and selectable in the sidebar.
- Use the bottom comparison row to choose which channel data to display.
- Let users show either a channel average or all seatings for that channel.
- Do not require users to select individual seating measurements.

The sidebar answers **which model and variant should be compared?** The bottom row answers **which channel data and seating view should be plotted?**

This is an incremental feature, not a rewrite of the graph engine or selection system.

## Sidebar behavior: models and variants

Keep the existing brand/model browsing experience and expose each model’s variants beneath its sidebar entry when the model is selected (here you could use a simple nested tree approach). Users should be able to select a variant without opening the variant selector in the bottom comparison panel.

Selecting a variant should use the existing model/variant activation behavior where possible, including the existing `showPhone` / `showVariant` flow. Keep variants separate: selecting clean seal and glasses must not silently combine their measurement data.

Preserve the existing additive-selection behavior, including the current Ctrl-click and pin behavior. Add a pin control beside a sidebar model or variant if it can reuse the existing pin state and behavior. Do not create a second “keep selected” state.

## Bottom-panel behavior: channel display controls

For each active model/variant row, provide three independent display controls:

- **Left (L)**
- **Right (R)**
- **L+R**

These controls are **not mutually exclusive**. A user may show L AVG, R AVG, and L+R AVG at the same time to compare channel asymmetry and the combined response.

Each control has two display states:

1. **Average:** show the relevant average curve or curves.
2. **All seatings:** show every available seating measurement relevant to that control, with each seating plotted separately.

Clicking a control toggles between its average and all-seatings states. Do not cycle through individual seating numbers.

### Left control

- **L average:** average only the available L seatings for this variant.
- **L all seatings:** plot each available L seating separately.
- Must not include R measurements.

### Right control

- **R average:** average only the available R seatings for this variant.
- **R all seatings:** plot each available R seating separately.
- Must not include L measurements.

### L+R control

- **L+R average:** average the L seatings and R seatings independently, then combine the two channel averages with equal weight.
- **L+R all seatings:** plot all available L and R seating measurements separately, preserving each curve’s channel identity. Do not average or pair individual L and R seatings.

The L+R control is an additional view, not a replacement for L or R. It is valid to show it alongside either or both channel controls. If the same underlying seating is selected by more than one control, avoid creating duplicate or confusingly labeled graph curves where practical.

If a required channel is missing, do not fabricate data. Use only the .txt data available in the /data/ folder. The L and R controls should show whichever channel data is available to them. L+R average should only be presented as a combined L+R curve when both channel averages exist. L+R all-seatings may show all available measurements and must retain their channel labels.

## Defaults

- Preserve the app’s configured initial model/target behavior.
- For a single active headphone model, default to **L average** and **R average** separately; L+R is available as an additional view.
- For multi-model comparisons, prefer **R average** for each model as the initial comparison view to reduce clutter. Users can separately use the channel display for comparisons, but for simplicity default to R average for all the models on display when a new comparator gets added.

If existing initialization makes these defaults difficult to distinguish from user choices, keep the current startup behavior and implement the requested controls first rather than introducing fragile implicit state.

## Implementation guidance

Relevant existing code includes:

- `setCurves` in `assets/js/graphtool.js`, which derives active curves from channel and seating state.
- `avgCurves` in `assets/js/graphtool.js`, which defines the existing curve-averaging convention.
- `addKey` and `updateKey` in `assets/js/tool_components/phoneTable.js`, which build and update channel/seating controls in the comparison row.
- `cycleSeating` in `assets/js/tool_components/phoneTable.js`, which currently cycles through average, individual seats, and all seatings.
- `showPhone` and `showVariant`, which manage activation and variants.
- `updatePaths` and `updatePhoneTable`, which refresh the graph and comparison panel.

Extend these existing integration points where practical. Keep one authoritative state for each active model/variant’s L, R, and L+R display modes. The sidebar, comparison row, and graph should reflect that same state; do not make a new component maintain a competing list of selected models or curves.

The current seating state is shared across channels. Ensure the new L, R, and L+R controls have independent state so toggling one does not unintentionally change the others.

Avoid broad unrelated refactoring. If a small extraction is necessary to isolate the new display state or calculation, keep it focused and preserve the existing classic-script loading model.

## Suggested implementation sequence

1. Inspect the existing sidebar variant flow, pin behavior, and comparison-row channel/seating controls.
2. Make variants visible and selectable from the sidebar; verify current additive selection and pinning still work.
3. Add the L average/all-seatings toggle.
4. Add the R average/all-seatings toggle with state independent of L.
5. Add L+R average/all-seatings using separately averaged L and R data.
6. Add the sidebar pin affordance by reusing existing pin behavior, if it can be done without changing pin semantics.
7. Verify graph, table, sidebar, and share URL remain synchronized after mode and variant changes.

## Acceptance checks

- Model variants are directly selectable from the sidebar without opening the lower-panel variant selector.
- Existing additive selection, Ctrl-click, and pin behavior continue to work.
- Clean-seal and glasses data remain separate when both variants are selected.
- A single model initially displays L and R averages separately.
- Multiple-model comparisons default to R average for models that have not had their display mode explicitly changed.
- L average uses only available L seatings; R average uses only available R seatings.
- L all-seatings and R all-seatings each show only their respective channel’s measurements.
- L+R average first averages each channel independently and then gives those two averages equal weight, even when the channels have different seating counts.
- L+R all-seatings displays the available individual measurements separately and preserves L/R identity.
- L, R, and L+R can be displayed simultaneously; each mode’s average/all-seatings toggle is independent of the others.
- Missing channels or seatings do not cause errors or fabricated curves.
- The graph, comparison rows, sidebar state, variants, and share URL remain synchronized after changes.
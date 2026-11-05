// Curve / phone color helpers (Consistent Anchor Index Palette)

// 12-color curated base palette designed for high contrast and color-blind safety
const curatedPalette = [
    d3.hcl(245, 80, 68), // 0: Vivid Cobalt Blue (Anchor Headphone)
    d3.hcl(42,  85, 68), // 1: Bright Amber / Orange (2nd Headphone)
    d3.hcl(155, 75, 66), // 2: Mint / Sea Green (3rd Headphone)
    d3.hcl(295, 75, 68), // 3: Deep Purple / Violet (4th Headphone)
    d3.hcl(335, 80, 68), // 4: Magenta / Hot Pink
    d3.hcl(180, 75, 66), // 5: Crisp Teal / Cyan
    d3.hcl(95,  70, 72), // 6: Lime / Yellow-Green
    d3.hcl(20,  85, 66), // 7: Coral / Red-Orange
    d3.hcl(215, 80, 68), // 8: Sky Blue
    d3.hcl(270, 80, 68), // 9: Electric Indigo
    d3.hcl(65,  85, 72), // 10: Warm Gold
    d3.hcl(315, 75, 68)  // 11: Orchid / Fuchsia
];

/**
 * Returns the base hue index for a phone object.
 * Based on the position of the headphone model in the current active activePhones list,
 * so the primary (first active) headphone is ALWAYS Index 0 (Blue).
 */
function getPhoneBaseHueIndex(p) {
    if (!p) return 0;
    
    // Check index of p directly or via copyOf in activePhones
    if (typeof activePhones !== 'undefined' && activePhones.length) {
        let activeDataPhones = activePhones.filter(q => !q.isTarget && !q.isPrefBounds);
        let idx = activeDataPhones.indexOf(p);
        if (idx === -1 && p.copyOf) {
            idx = activeDataPhones.indexOf(p.copyOf);
        }
        if (idx === -1) {
            // Find by brand and model match
            idx = activeDataPhones.findIndex(q => q.phone === p.phone && q.dispName === p.dispName);
        }
        if (idx !== -1) {
            return idx % curatedPalette.length;
        }
    }
    
    let fallbackId = (p.id !== undefined && !isNaN(p.id)) ? Math.abs(p.id) : 0;
    return fallbackId % curatedPalette.length;
}

/**
 * Core curve color calculator:
 * Uses unified model hue, shared by both L & R channels, with seating shade variations.
 */
function getCurveColor(id, o, hex, curveObj) {
    let p = (curveObj && curveObj.p) ? curveObj.p : null;
    let isTarget = (curveObj && curveObj.isTarget) || (p && p.isTarget) || (id !== undefined && id < 0);
    
    if (isTarget) {
        return d3.hcl(360, 5, 66);
    }

    if (hex && (!curveObj || (!curveObj.channel && curveObj.chIdx === undefined))) {
        let rgb = d3.rgb(hex);
        let hcl = d3.hcl(rgb);
        return d3.hcl(hcl.h, hcl.c, hcl.l);
    }

    let baseIdx = p ? getPhoneBaseHueIndex(p) : ((id !== undefined && !isNaN(id)) ? Math.abs(id) % curatedPalette.length : 0);
    let baseColor = curatedPalette[baseIdx];
    let h = baseColor.h;
    let cVal = baseColor.c;
    let lVal = baseColor.l;

    if (curveObj) {
        // Seating shade differentiation:
        // Individual seatings (e.g. R1, R2, R3) share the model's base hue but use subtle lightness steps
        let sIdx = curveObj.sIdx;
        let sCount = curveObj.sCount || 3;
        if (sIdx !== undefined && !isNaN(sIdx) && sCount > 1) {
            let step = (sIdx - (sCount - 1) / 2) * 8;
            lVal = Math.min(84, Math.max(48, lVal + step));
            let cStep = (sIdx - (sCount - 1) / 2) * -5;
            cVal = Math.min(95, Math.max(50, cVal + cStep));
        }
    }

    return d3.hcl(h, cVal, lVal);
}

var getColor_AC = (c) => {
    if (!c) return d3.hcl(245, 80, 68);
    return getCurveColor(c.p ? c.p.id : 0, c.o, c.p ? c.p.hexColor : null, c);
};

var getColor_ph = (p, i) => {
    if (!p || !p.activeCurves || !p.activeCurves[i]) return d3.hcl(245, 80, 68);
    return getColor_AC(p.activeCurves[i]);
};

function getDivColor(id, active, hex, p) {
    let c = getCurveColor(id, 0, hex, p ? { p: p } : null);
    if (!c) c = d3.hcl(245, 80, 68);
    let l = c.l !== undefined ? c.l : 68;
    let cc = c.c !== undefined ? c.c : 80;
    let newL = 100 - (80 - Math.min(l, 60)) / (active ? 1.5 : 3);
    let newC = (cc - 20) / (active ? 3 : 4);
    return d3.hcl(c.h, newC, newL);
}

function color_curveToText(c) {
    if (!alt_layout) {
        let l = c.l !== undefined ? c.l : 68;
        let cc = c.c !== undefined ? c.c : 80;
        return d3.hcl(c.h, cc / 3, l / 5 + 10);
    }
    return c;
}

var getTooltipColor = curve => color_curveToText(getColor_AC(curve));
var getTextColor = p => color_curveToText(getCurveColor(p.id, 0, p.hexColor, { p: p }));
var getBgColor = p => {
    let c = getCurveColor(p.id, 0, p.hexColor, { p: p }).rgb();
    ['r', 'g', 'b'].forEach(k => c[k] = 255 - (255 - Math.max(0, c[k])) * 0.85);
    return c;
};

var phoneNumber = 0;
var nextPN = 0;
function nextPhoneNumber() {
    if (nextPN === null) {
        nextPN = phoneNumber;
        let pin = activePhones.filter(p => p.pin).map(p => p.id);
        if (pin.length) {
            let l = a => b => Math.abs(a - b),
                d = id => d3.min(pin, l(id));
            for (let i = nextPN, max = d(i); max < 1 && ++i < phoneNumber + 12;) {
                let m = d(i);
                if (m > max) { max = m; nextPN = i; }
            }
        }
    }
    return nextPN;
}

function getPhoneNumber() {
    let pn = nextPhoneNumber();
    phoneNumber = pn + 1;
    nextPN = null;
    return pn;
}

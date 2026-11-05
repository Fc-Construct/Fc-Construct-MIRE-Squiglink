// ==========================================
// Calculate Band Area Component
// ==========================================
let interactCalc = false;
let calcBrush = null;
let calcBrushGroup = null;

function stopCalc() {
    if (calcBrushGroup) {
        calcBrushGroup.remove();
        calcBrushGroup = null;
    }
}

function initCalcBrush() {
    stopCalc();
    
    calcBrush = d3.brushX()
        .extent([[pad.l, pad.t], [pad.l + W, pad.t + H]])
        .on("brush end", function() {
            let selection = d3.event.selection;
            gr.selectAll(".calc-badge").remove();
            
            if (!selection) return;
            
            let x0 = selection[0];
            let x1 = selection[1];
            
            if (Math.abs(x1 - x0) < 5) return;
            
            let f0 = x.invert(x0);
            let f1 = x.invert(x1);
            if (f0 >= f1) return;
            
            let idx0 = fr_to_ind(f0);
            let idx1 = fr_to_ind(f1);
            if (idx0 > idx1) { let tmp = idx0; idx0 = idx1; idx1 = tmp; }
            if (idx0 === idx1) idx1 = Math.min(f_values.length - 1, idx0 + 1);
            
            let octaves = Math.log2(f_values[idx1] / f_values[idx0]);
            
            // Gather active non-hidden curves (e.g. Left and Right channels of the active headphone)
            let activeCs = [];
            if (typeof activePhones !== 'undefined' && Array.isArray(activePhones)) {
                let validPhones = activePhones.filter(p => !p.hide && p.activeCurves && Array.isArray(p.activeCurves));
                activeCs = d3.merge(validPhones.map(p => p.activeCurves));
            }
            if (!activeCs.length) return;
            
            let primaryCurve = activeCs[0];
            let secondaryCurve = activeCs.length > 1 ? activeCs[1] : null;
            
            let avgDiffText = "";
            
            if (secondaryCurve) {
                let sumWeightedAbsDiff = 0;
                let sumWeights = 0;
                
                for (let i = idx0; i < idx1; i++) {
                    let freqCurr = f_values[i];
                    let freqNext = f_values[i + 1] || freqCurr;
                    let logStep = Math.log2(freqNext / freqCurr) || 0.01;
                    
                    let val1 = baseline.fn(primaryCurve.l)[i][1] + getOffset(primaryCurve.p);
                    let val2 = baseline.fn(secondaryCurve.l)[i][1] + getOffset(secondaryCurve.p);
                    
                    let diff = Math.abs(val1 - val2);
                    sumWeightedAbsDiff += diff * logStep;
                    sumWeights += logStep;
                }
                
                let meanAbsDiff = sumWeights > 0 ? (sumWeightedAbsDiff / sumWeights) : 0;
                avgDiffText = meanAbsDiff.toFixed(2) + " dB";
            } else {
                let sumWeightedVal = 0;
                let sumWeights = 0;
                
                for (let i = idx0; i < idx1; i++) {
                    let freqCurr = f_values[i];
                    let freqNext = f_values[i + 1] || freqCurr;
                    let logStep = Math.log2(freqNext / freqCurr) || 0.01;
                    
                    let val1 = baseline.fn(primaryCurve.l)[i][1] + getOffset(primaryCurve.p);
                    sumWeightedVal += Math.abs(val1) * logStep;
                    sumWeights += logStep;
                }
                
                let meanVal = sumWeights > 0 ? (sumWeightedVal / sumWeights) : 0;
                avgDiffText = meanVal.toFixed(2) + " dB";
            }
            
            let formatFreq = f => f >= 1000 ? (f / 1000).toFixed(1) + " kHz" : Math.round(f) + " Hz";
            let fRangeText = formatFreq(f_values[idx0]) + " – " + formatFreq(f_values[idx1]) + " (" + octaves.toFixed(2) + " Oct)";
            
            // Smaller, subtle pop-up note badge placed slightly lower (not pinned against the top)
            let badgeX = Math.min(pad.l + W - 170, Math.max(pad.l + 10, (x0 + x1) / 2 - 85));
            let badgeY = pad.t + 45;
            
            let badge = calcBrushGroup.append("g")
                .attr("class", "calc-badge")
                .attr("transform", "translate(" + badgeX + "," + badgeY + ")");
                
            badge.append("rect")
                .attrs({
                    width: 170,
                    height: 38,
                    rx: 4,
                    ry: 4,
                    fill: "rgba(20, 24, 33, 0.88)",
                    stroke: "rgba(255, 255, 255, 0.25)",
                    "stroke-width": 1
                });
                
            badge.append("text")
                .attrs({ x: 85, y: 13, "text-anchor": "middle", fill: "#94a3b8", "font-size": "9.5px", "font-weight": "500" })
                .text(fRangeText);
                
            badge.append("text")
                .attrs({ x: 85, y: 28, "text-anchor": "middle", fill: "#f1f5f9", "font-size": "11.5px", "font-weight": "600" })
                .text("Avg Diff: " + avgDiffText);
        });
        
    calcBrushGroup = gr.append("g")
        .attr("class", "calc-brush-group")
        .call(calcBrush);
        
    // Thin solid neutral grey line around the selection box (removed dashed pattern)
    calcBrushGroup.selectAll(".selection")
        .style("fill", "rgba(255, 255, 255, 0.08)")
        .style("stroke", "rgba(255, 255, 255, 0.45)")
        .style("stroke-width", "1px")
        .style("stroke-dasharray", "none");
}

function initCalculateComponent() {
    doc.select("#calcBtn").on("click", function () {
        let btn = d3.select(this);
        interactCalc = !interactCalc;
        btn.classed("selected", interactCalc);
        if (interactCalc) {
            initCalcBrush();
        } else {
            stopCalc();
        }
    });
}

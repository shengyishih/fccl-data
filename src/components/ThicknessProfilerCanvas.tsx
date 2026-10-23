import React, { useRef, useEffect, useState } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { FCCL_PRODUCT_SPECS, ANOMALY_META } from '../services/fcclData';
import { Layers, AlertCircle, CheckCircle2, Sliders, Info, Eye } from 'lucide-react';

interface Props {
  batch: FCCLBatchRecord;
  compareBatch?: FCCLBatchRecord | null;
  onSelectPoint?: (pointIndex: number) => void;
}

export const ThicknessProfilerCanvas: React.FC<Props> = ({ batch, compareBatch, onSelectPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [showSubstrateLayers, setShowSubstrateLayers] = useState<boolean>(true);
  const [showToleranceEnvelope, setShowToleranceEnvelope] = useState<boolean>(true);
  const [animProgress, setAnimProgress] = useState<number>(1);

  const spec = FCCL_PRODUCT_SPECS[batch.Product_Model];
  const anomalyInfo = ANOMALY_META[batch.Anomaly_Pattern] || ANOMALY_META['Normal'];

  // Trigger smooth transition animation when batch changes
  useEffect(() => {
    let frameId: number;
    let start: number | null = null;
    const duration = 400; // ms

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      setAnimProgress(progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    setAnimProgress(0);
    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [batch.Batch_ID]);

  // Canvas drawing routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Margins
    const padding = { top: 40, right: 70, bottom: 90, left: 65 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines & Axis setup
    const points = batch.points;
    const nominal = batch.Nominal_Thickness_um;
    const tol = batch.Tolerance_um;
    const usl = batch.USL_um;
    const lsl = batch.LSL_um;

    // Y Range: slightly broader than LSL/USL or min/max points
    const minVal = Math.min(lsl - tol * 0.4, ...points, compareBatch ? Math.min(...compareBatch.points) : lsl);
    const maxVal = Math.max(usl + tol * 0.4, ...points, compareBatch ? Math.max(...compareBatch.points) : usl);
    const ySpan = Math.max(0.1, maxVal - minVal);

    const getY = (val: number) => padding.top + chartHeight - ((val - minVal) / ySpan) * chartHeight;
    const getX = (index: number) => padding.left + (index / (points.length - 1)) * chartWidth;

    // Draw Subtle Horizontal Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const yStep = tol > 1 ? 0.5 : 0.2;
    const firstYTick = Math.ceil(minVal / yStep) * yStep;
    for (let v = firstYTick; v <= maxVal; v += yStep) {
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${v.toFixed(2)}µm`, padding.left - 8, y + 3.5);
    }

    // 1. Shaded Tolerance Envelope Zone (LSL ~ USL)
    if (showToleranceEnvelope) {
      const uslY = getY(usl);
      const lslY = getY(lsl);

      // In-spec green zone
      const gradientInSpec = ctx.createLinearGradient(0, uslY, 0, lslY);
      gradientInSpec.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      gradientInSpec.addColorStop(0.5, 'rgba(16, 185, 129, 0.03)');
      gradientInSpec.addColorStop(1, 'rgba(16, 185, 129, 0.08)');
      ctx.fillStyle = gradientInSpec;
      ctx.fillRect(padding.left, uslY, chartWidth, lslY - uslY);

      // Upper out-of-spec red wash
      ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.fillRect(padding.left, padding.top, chartWidth, uslY - padding.top);

      // Lower out-of-spec red wash
      ctx.fillRect(padding.left, lslY, chartWidth, (padding.top + chartHeight) - lslY);

      // USL Line
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, uslY);
      ctx.lineTo(width - padding.right, uslY);
      ctx.stroke();

      // USL Label
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`USL: ${usl.toFixed(2)}µm`, width - padding.right + 6, uslY + 3);

      // LSL Line
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(padding.left, lslY);
      ctx.lineTo(width - padding.right, lslY);
      ctx.stroke();

      // LSL Label
      ctx.fillText(`LSL: ${lsl.toFixed(2)}µm`, width - padding.right + 6, lslY + 3);
    }

    // Nominal Target Line
    const nominalY = getY(nominal);
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([6, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, nominalY);
    ctx.lineTo(width - padding.right, nominalY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Nominal Label
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Target: ${nominal.toFixed(2)}µm`, width - padding.right + 6, nominalY + 3);

    // 2. Optional: Draw Compare Batch curve if provided
    if (compareBatch) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      compareBatch.points.forEach((val, i) => {
        const x = getX(i);
        const y = getY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Points on compare curve
      compareBatch.points.forEach((val, i) => {
        const x = getX(i);
        const y = getY(val);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 3. Draw Actual Batch Profile Curve (Animated)
    // Interpolated values with easing
    const currentPoints = points.map(p => nominal + (p - nominal) * animProgress);

    // Gradient fill under profile curve
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    areaGradient.addColorStop(0, batch.QC_Result === 'PASS' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(244, 63, 94, 0.25)');
    areaGradient.addColorStop(1, 'rgba(15, 23, 42, 0.02)');

    ctx.beginPath();
    ctx.moveTo(getX(0), padding.top + chartHeight);
    for (let i = 0; i < currentPoints.length; i++) {
      const x = getX(i);
      const y = getY(currentPoints[i]);
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        // Natural smooth curve
        const prevX = getX(i - 1);
        const prevY = getY(currentPoints[i - 1]);
        const cpX1 = prevX + (x - prevX) * 0.5;
        const cpX2 = prevX + (x - prevX) * 0.5;
        ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
      }
    }
    ctx.lineTo(getX(currentPoints.length - 1), padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Main line stroke
    ctx.beginPath();
    for (let i = 0; i < currentPoints.length; i++) {
      const x = getX(i);
      const y = getY(currentPoints[i]);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(i - 1);
        const prevY = getY(currentPoints[i - 1]);
        const cpX1 = prevX + (x - prevX) * 0.5;
        const cpX2 = prevX + (x - prevX) * 0.5;
        ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
      }
    }
    ctx.strokeStyle = batch.QC_Result === 'PASS' ? '#38bdf8' : '#fb7185';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. Draw Individual Points & Halo
    currentPoints.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      const isHovered = hoveredPoint === i;
      const isOut = val < lsl || val > usl;

      // Glow halo
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isOut ? 'rgba(239, 68, 68, 0.3)' : (isHovered ? 'rgba(56, 189, 248, 0.4)' : 'rgba(14, 165, 233, 0.2)');
      ctx.fill();

      // Solid point core
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isOut ? '#ef4444' : '#ffffff';
      ctx.strokeStyle = isOut ? '#f87171' : '#0284c7';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Point label above/below dot
      ctx.fillStyle = isHovered ? '#ffffff' : (isOut ? '#fca5a5' : '#94a3b8');
      ctx.font = isHovered ? 'bold 11px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const delta = val - nominal;
      const deltaSign = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
      ctx.fillText(`${val.toFixed(2)}`, x, y - (isHovered ? 14 : 10));
      if (isHovered) {
        ctx.fillStyle = Math.abs(delta) > tol ? '#ef4444' : '#38bdf8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`(${deltaSign}µm)`, x, y - 25);
      }
    });

    // 5. Draw Transverse Direction Bottom Track (TD Points 1 to 10 + Substrate Cross-section)
    const trackY = height - 55;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padding.left, trackY, chartWidth, 32);

    // Draw TD Location labels
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('◄ 操作側 (Operator Side / OS)', padding.left + 8, trackY - 6);
    ctx.textAlign = 'center';
    ctx.fillText('基材幅寬橫切面取樣 (TD: Transverse Direction)', padding.left + chartWidth / 2, trackY - 6);
    ctx.textAlign = 'right';
    ctx.fillText('傳動側 (Drive Side / DS) ►', width - padding.right - 8, trackY - 6);

    // Draw 10 contact measurement points in bottom track
    for (let i = 0; i < points.length; i++) {
      const x = getX(i);
      const isHovered = hoveredPoint === i;
      const isOut = points[i] < lsl || points[i] > usl;

      // Contact anvil indicator line
      ctx.strokeStyle = isHovered ? '#38bdf8' : (isOut ? '#ef4444' : '#334155');
      ctx.lineWidth = isHovered ? 1.5 : 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top + chartHeight);
      ctx.lineTo(x, trackY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point box in track
      ctx.fillStyle = isHovered ? '#0284c7' : (isOut ? 'rgba(239, 68, 68, 0.2)' : '#0f172a');
      ctx.strokeStyle = isHovered ? '#38bdf8' : (isOut ? '#ef4444' : '#334155');
      ctx.lineWidth = 1;
      const boxW = chartWidth / 12;
      ctx.fillRect(x - boxW / 2, trackY + 4, boxW, 24);
      ctx.strokeRect(x - boxW / 2, trackY + 4, boxW, 24);

      // Point text inside box
      ctx.fillStyle = isHovered ? '#ffffff' : (isOut ? '#fca5a5' : '#cbd5e1');
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`P${i + 1}`, x, trackY + 16);
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = isOut ? '#f87171' : '#64748b';
      ctx.fillText(`${points[i].toFixed(1)}`, x, trackY + 25);
    }

    // 6. Microscopic Substrate Multi-Layer Schematic (if toggled)
    if (showSubstrateLayers) {
      const substrateY = padding.top + 4;
      const substrateH = 18;
      const subW = 180;
      const subX = padding.left + 8;

      ctx.save();
      // Mini container background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.fillRect(subX, substrateY, subW, 28);
      ctx.strokeRect(subX, substrateY, subW, 28);

      // Micro layer label
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText(`結構層剖面 (${spec?.structure || 'FCCL'})`, subX + 6, substrateY + 10);

      // Layer 1: Copper (Cu) metallic amber/orange
      ctx.fillStyle = '#b45309'; // Copper
      ctx.fillRect(subX + 6, substrateY + 14, 30, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`Cu ${spec?.copperThickness1_um || 18}µ`, subX + 40, substrateY + 20);

      // Layer 2: PI (golden polyimide)
      ctx.fillStyle = '#eab308'; // Amber PI
      ctx.fillRect(subX + 85, substrateY + 14, 36, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`PI ${spec?.piThickness_um || 25}µ`, subX + 125, substrateY + 20);
      ctx.restore();
    }

  }, [batch, compareBatch, hoveredPoint, showSubstrateLayers, showToleranceEnvelope, animProgress]);

  // Handle canvas mouse move for interactive points
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padding = { left: 65, right: 70 };
    const chartWidth = rect.width - padding.left - padding.right;
    const pointsCount = batch.points.length;

    let closestIdx = -1;
    let minDist = 30;

    for (let i = 0; i < pointsCount; i++) {
      const pointX = padding.left + (i / (pointsCount - 1)) * chartWidth;
      const dist = Math.abs(x - pointX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx !== hoveredPoint) {
      setHoveredPoint(closestIdx !== -1 ? closestIdx : null);
      if (closestIdx !== -1 && onSelectPoint) {
        onSelectPoint(closestIdx);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Profiler Header Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                基材機械厚度跨幅 10 點剖面 (Cross-Web TD Profile)
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${batch.QC_Result === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                {batch.QC_Result}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${anomalyInfo.badgeBg} ${anomalyInfo.badgeText} border border-current/20`}>
                {anomalyInfo.nameZh}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              批號: <span className="font-mono text-slate-300 font-semibold">{batch.Batch_ID}</span> · 型號: <span className="text-sky-300">{batch.Product_Model}</span> · 取樣日期: {batch.Sample_Date}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToleranceEnvelope(v => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showToleranceEnvelope
                ? 'bg-slate-800 text-sky-400 border-sky-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            公差帶 (±{batch.Tolerance_um}µm)
          </button>

          <button
            onClick={() => setShowSubstrateLayers(v => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showSubstrateLayers
                ? 'bg-slate-800 text-amber-400 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            結構層示意
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative w-full h-[340px] bg-slate-950">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Floating Point Detail Overlay when Hovered */}
        {hoveredPoint !== null && (
          <div className="absolute top-3 right-4 bg-slate-900/95 border border-sky-500/40 rounded-lg p-3 text-xs shadow-2xl backdrop-blur-md pointer-events-none transition-all">
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800 mb-2">
              <span className="font-bold text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                檢測點 P{hoveredPoint + 1}
              </span>
              <span className="font-mono text-slate-400">
                {hoveredPoint === 0 ? '操作側 (OS)' : hoveredPoint === 9 ? '傳動側 (DS)' : `幅寬中段 ${(hoveredPoint + 1) * 10}%`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
              <span className="text-slate-400">實測厚度:</span>
              <span className="text-white font-bold text-right">{batch.points[hoveredPoint].toFixed(3)} µm</span>

              <span className="text-slate-400">標稱規格:</span>
              <span className="text-slate-300 text-right">{batch.Nominal_Thickness_um.toFixed(1)} µm</span>

              <span className="text-slate-400">偏差量 (Δ):</span>
              <span className={`text-right font-bold ${
                Math.abs(batch.points[hoveredPoint] - batch.Nominal_Thickness_um) > batch.Tolerance_um
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}>
                {(batch.points[hoveredPoint] - batch.Nominal_Thickness_um) > 0 ? '+' : ''}
                {(batch.points[hoveredPoint] - batch.Nominal_Thickness_um).toFixed(3)} µm
              </span>

              <span className="text-slate-400">判定:</span>
              <span className={`text-right font-bold ${
                batch.points[hoveredPoint] >= batch.LSL_um && batch.points[hoveredPoint] <= batch.USL_um
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}>
                {batch.points[hoveredPoint] >= batch.LSL_um && batch.points[hoveredPoint] <= batch.USL_um ? '合格 PASS' : '超差 OOS'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Profiler Bottom Stats Footer */}
      <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">平均厚度 (X-bar)</span>
          <span className="font-mono text-sm font-bold text-white">{batch.Thickness_Mean_um.toFixed(3)} µm</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">標準差 (Std.Dev σ)</span>
          <span className="font-mono text-sm font-bold text-sky-400">{batch.Thickness_Std_um.toFixed(3)} µm</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">全幅極差 (Range R)</span>
          <span className={`font-mono text-sm font-bold ${batch.Thickness_Range_um > batch.Tolerance_um * 1.5 ? 'text-amber-400' : 'text-slate-200'}`}>
            {batch.Thickness_Range_um.toFixed(3)} µm
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">製程能力 Cpk</span>
          <span className={`font-mono text-sm font-bold ${batch.cpk >= 1.33 ? 'text-emerald-400' : batch.cpk >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {batch.cpk.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">製程準度 Ca</span>
          <span className="font-mono text-sm font-bold text-slate-300">
            {(batch.ca * 100).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">檢測法標準</span>
          <span className="text-slate-300 font-medium truncate block">IPC-TM-650 2.2.18</span>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { Maximize2, Compass, Waves, Flame, Grid3X3, RotateCcw } from 'lucide-react';

interface Props {
  batch: FCCLBatchRecord;
}

export const RollTopographyHeatmapCanvas: React.FC<Props> = ({ batch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; tdIndex: number; mdPosM: number; thickness: number } | null>(null);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<'thermal' | 'deviation' | 'contour'>('thermal');
  const [scanPosition, setScanPosition] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(true);

  // Animate scanning probe along the roll MD length
  useEffect(() => {
    if (!isScanning) return;
    let frameId: number;
    const speed = 0.003; // animation speed

    const loop = () => {
      setScanPosition(pos => (pos + speed) % 1);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isScanning]);

  // Synthetic 2D grid matrix along MD (Longitudinal) based on batch anomaly characteristics
  const gridData = useMemo(() => {
    const points = batch.points;
    const nominal = batch.Nominal_Thickness_um;
    const pattern = batch.Anomaly_Pattern;
    const lengthM = batch.Batch_Length_m || 20000;
    
    // We generate 40 MD rows x 10 TD columns
    const rows = 40;
    const cols = 10;
    const matrix: number[][] = [];

    for (let r = 0; r < rows; r++) {
      const rowNorm = r / (rows - 1); // 0 (start) to 1 (end of roll)
      const rowValues: number[] = [];

      for (let c = 0; c < cols; c++) {
        const basePt = points[c] || nominal;
        let val = basePt;

        // Apply anomaly longitudinal signature:
        if (pattern === 'Drift') {
          // Drifts progressively along the roll length
          val = basePt + (rowNorm - 0.5) * (batch.Tolerance_um * 1.6);
        } else if (pattern === 'Center_Bulge') {
          // Consistent center bulge with slight thermal wave along length
          const wave = Math.sin(rowNorm * Math.PI * 4) * 0.12;
          val = basePt + wave;
        } else if (pattern === 'Wedge') {
          // Persistent wedge from die gap tilt with minor roller vibration
          const flutter = Math.cos(rowNorm * Math.PI * 6) * 0.08;
          val = basePt + flutter;
        } else if (pattern === 'Local_Spike') {
          // Spike persists along narrow lane or repeats periodically
          const repeatSpike = Math.abs(Math.sin(rowNorm * Math.PI * 5)) > 0.8;
          val = repeatSpike ? basePt : nominal + (Math.random() - 0.5) * 0.15;
        } else if (pattern === 'Mean_Shift') {
          // Consistent offset throughout roll
          val = basePt + Math.sin(rowNorm * Math.PI * 2) * 0.05;
        } else {
          // Normal: random thermal micro-fluctuations
          const micro = Math.sin(rowNorm * 8 + c) * 0.06;
          val = basePt + micro;
        }

        rowValues.push(val);
      }
      matrix.push(rowValues);
    }

    return { matrix, rows, cols, lengthM };
  }, [batch]);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 35, bottom: 45, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const { matrix, rows, cols, lengthM } = gridData;
    const nominal = batch.Nominal_Thickness_um;
    const tol = batch.Tolerance_um;
    const lsl = batch.LSL_um;
    const usl = batch.USL_um;

    // Helper for color calculation
    const getColor = (val: number): string => {
      const delta = val - nominal; // delta in um
      const ratio = delta / tol;   // -1 = LSL, 0 = Nom, +1 = USL

      if (colorMode === 'thermal') {
        // Multi-stop continuous thermal scale:
        // Deep blue (very thin) -> Cyan -> Emerald (nominal) -> Amber (thick) -> Crimson (out of spec)
        if (ratio <= -1) return '#1e3a8a'; // Blue 900
        if (ratio < -0.3) {
          const t = (ratio + 1) / 0.7;
          return `rgb(${Math.round(30 + 10 * t)}, ${Math.round(58 + 120 * t)}, ${Math.round(138 + 50 * t)})`;
        }
        if (ratio < 0.3) {
          // Golden Zone: green/cyan
          const t = (ratio + 0.3) / 0.6;
          return `rgb(${Math.round(16 + 20 * t)}, ${Math.round(185 - 10 * t)}, ${Math.round(129 - 40 * t)})`;
        }
        if (ratio < 1) {
          // Yellow-Amber
          const t = (ratio - 0.3) / 0.7;
          return `rgb(${Math.round(245 + 5 * t)}, ${Math.round(158 - 60 * t)}, ${Math.round(11 - 10 * t)})`;
        }
        // Exceeding USL
        return '#ef4444'; // Red
      } else if (colorMode === 'deviation') {
        // High contrast divergence: Emerald (in-spec), Red (out of spec)
        if (val < lsl || val > usl) {
          return '#e11d48'; // Rose
        }
        const devNorm = Math.min(1, Math.abs(delta) / tol);
        return `rgba(16, 185, 129, ${0.4 + (1 - devNorm) * 0.6})`;
      } else {
        // Contour isoline monochrome high-res topo
        const stepped = Math.floor((val - lsl) / (tol * 0.25));
        const levels = ['#0f172a', '#1e293b', '#0284c7', '#06b6d4', '#10b981', '#f59e0b', '#dc2626'];
        const safeIdx = Math.max(0, Math.min(levels.length - 1, stepped));
        return levels[safeIdx];
      }
    };

    // Render 2D bilinear-interpolated cell tiles
    const cellW = chartW / (cols - 1);
    const cellH = chartH / (rows - 1);

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const x = padding.left + c * cellW;
        const y = padding.top + r * cellH;

        // Bilinear patch render
        const val = matrix[r][c];
        ctx.fillStyle = getColor(val);
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);

        // Optional contour hairline borders
        if (showContours && (r % 4 === 0 || c % 2 === 0)) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      }
    }

    // Draw Continuous Dynamic Scanning Probe Line
    if (isScanning) {
      const probeY = padding.top + scanPosition * chartH;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(padding.left, probeY);
      ctx.lineTo(padding.left + chartW, probeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Probe Laser Sensor Heads
      for (let c = 0; c < cols; c++) {
        const probeX = padding.left + c * cellW;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(probeX, probeY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Probe Label
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      const scannedMeters = Math.round(scanPosition * lengthM);
      ctx.fillText(`掃描測頭: ${scannedMeters}m`, padding.left - 8, probeY + 3);
    }

    // Y Axis: Roll Length MD (0m to Length M)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.stroke();

    const mdSteps = 4;
    for (let i = 0; i <= mdSteps; i++) {
      const y = padding.top + (i / mdSteps) * chartH;
      const meters = Math.round((i / mdSteps) * lengthM);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${meters}m`, padding.left - 6, y + 3);

      ctx.beginPath();
      ctx.moveTo(padding.left - 3, y);
      ctx.lineTo(padding.left, y);
      ctx.stroke();
    }

    // X Axis: Transverse Width (P1 to P10)
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    for (let c = 0; c < cols; c++) {
      const x = padding.left + c * cellW;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`P${c + 1}`, x, padding.top + chartH + 14);

      ctx.beginPath();
      ctx.moveTo(x, padding.top + chartH);
      ctx.lineTo(x, padding.top + chartH + 3);
      ctx.stroke();
    }

    // X Axis Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('幅寬方向 TD 橫向點位 (P1 操作側 OS ───► P10 傳動側 DS)', padding.left + chartW / 2, padding.top + chartH + 32);

    // Y Axis Vertical Label
    ctx.save();
    ctx.translate(14, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('捲長縱向 MD (Machine Direction / 米)', 0, 0);
    ctx.restore();

    // Crosshair inspection if hovered
    if (hoverPos) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverPos.x, padding.top);
      ctx.lineTo(hoverPos.x, padding.top + chartH);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, hoverPos.y);
      ctx.lineTo(padding.left + chartW, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Coordinate marker
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [batch, gridData, colorMode, showContours, scanPosition, isScanning, hoverPos]);

  // Handle Mouse movement on Heatmap
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padding = { top: 25, right: 35, bottom: 45, left: 60 };
    const chartW = rect.width - padding.left - padding.right;
    const chartH = rect.height - padding.top - padding.bottom;

    if (mouseX >= padding.left && mouseX <= padding.left + chartW && mouseY >= padding.top && mouseY <= padding.top + chartH) {
      const relX = (mouseX - padding.left) / chartW;
      const relY = (mouseY - padding.top) / chartH;

      const tdIndex = Math.min(9, Math.max(0, Math.round(relX * 9)));
      const mdPosM = Math.round(relY * (batch.Batch_Length_m || 20000));

      const { matrix, rows } = gridData;
      const rowIndex = Math.min(rows - 1, Math.max(0, Math.round(relY * (rows - 1))));
      const thickness = matrix[rowIndex][tdIndex];

      setHoverPos({
        x: mouseX,
        y: mouseY,
        tdIndex,
        mdPosM,
        thickness
      });
    } else {
      setHoverPos(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              全捲表面地貌厚度熱圖 (2D Surface Topography Heatmap)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              幅寬 TD (10點) × 捲長 MD ({batch.Batch_Length_m.toLocaleString()}m) 連續微米梯度分析
            </p>
          </div>
        </div>

        {/* Color Palette Switcher & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setColorMode('thermal')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                colorMode === 'thermal' ? 'bg-slate-800 text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              熱成色譜
            </button>
            <button
              onClick={() => setColorMode('deviation')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                colorMode === 'deviation' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              公差遮罩
            </button>
            <button
              onClick={() => setColorMode('contour')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                colorMode === 'contour' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              等高線階
            </button>
          </div>

          <button
            onClick={() => setIsScanning(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isScanning
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            動態掃描
          </button>
        </div>
      </div>

      {/* Heatmap Canvas Container */}
      <div className="relative w-full h-[320px] bg-slate-950">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Dynamic Probe Readout Badge */}
        {hoverPos && (
          <div className="absolute top-3 left-16 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-2xl backdrop-blur-md font-mono pointer-events-none">
            <div className="text-sky-300 font-bold mb-1">
              坐標: TD (點 P{hoverPos.tdIndex + 1}) · MD ({hoverPos.mdPosM} 米)
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300">厚度: <span className="text-white font-bold">{hoverPos.thickness.toFixed(2)}µm</span></span>
              <span className={`font-semibold ${
                Math.abs(hoverPos.thickness - batch.Nominal_Thickness_um) > batch.Tolerance_um ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                Δ {(hoverPos.thickness - batch.Nominal_Thickness_um) > 0 ? '+' : ''}{(hoverPos.thickness - batch.Nominal_Thickness_um).toFixed(2)}µm
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-12 right-6 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1.5 flex items-center gap-2 text-[10px] backdrop-blur-md">
          <span className="text-slate-400">薄 (&lt;{batch.LSL_um.toFixed(1)}µm)</span>
          <div className="w-24 h-2 rounded-sm bg-gradient-to-r from-blue-700 via-emerald-500 via-amber-500 to-red-500"></div>
          <span className="text-slate-400">厚 (&gt;{batch.USL_um.toFixed(1)}µm)</span>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react';

interface Props {
  batches: FCCLBatchRecord[];
  currentBatch: FCCLBatchRecord;
  onSelectBatch?: (batch: FCCLBatchRecord) => void;
}

export const SpcControlChartCanvas: React.FC<Props> = ({ batches, currentBatch, onSelectBatch }) => {
  const xbarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const distCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'xbar' | 'range' | 'gaussian'>('xbar');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter batches of the same product model to maintain statistically valid SPC
  const modelBatches = useMemo(() => {
    const list = batches.filter(b => b.Product_Model === currentBatch.Product_Model);
    // Sort chronologically
    return [...list].sort((a, b) => a.Sample_Date.localeCompare(b.Sample_Date));
  }, [batches, currentBatch.Product_Model]);

  // Compute Grand Mean & Control Limits for X-bar and R
  const spcMetrics = useMemo(() => {
    if (modelBatches.length === 0) {
      return { xBarGrand: 0, uclX: 0, lclX: 0, rBar: 0, uclR: 0, lclR: 0, sigma: 0, cpkAvg: 0, cp: 0 };
    }

    const n = modelBatches.length;
    const xBars = modelBatches.map(b => b.Thickness_Mean_um);
    const ranges = modelBatches.map(b => b.Thickness_Range_um);

    const xBarGrand = xBars.reduce((a, b) => a + b, 0) / n;
    const rBar = ranges.reduce((a, b) => a + b, 0) / n;

    // For sample size subgroup n=10:
    // A2 = 0.308, D3 = 0.223, D4 = 1.777, d2 = 3.078
    const A2 = 0.308;
    const D3 = 0.223;
    const D4 = 1.777;
    const d2 = 3.078;

    const uclX = xBarGrand + A2 * rBar;
    const lclX = xBarGrand - A2 * rBar;
    const uclR = D4 * rBar;
    const lclR = D3 * rBar;

    const sigmaEst = rBar / d2;
    const usl = currentBatch.USL_um;
    const lsl = currentBatch.LSL_um;
    const cp = (usl - lsl) / (6 * Math.max(0.001, sigmaEst));
    const cpu = (usl - xBarGrand) / (3 * Math.max(0.001, sigmaEst));
    const cpl = (xBarGrand - lsl) / (3 * Math.max(0.001, sigmaEst));
    const cpk = Math.min(cpu, cpl);

    return { xBarGrand, uclX, lclX, rBar, uclR, lclR, sigma: sigmaEst, cpkAvg: cpk, cp };
  }, [modelBatches, currentBatch]);

  // Draw X-bar & R Canvas
  useEffect(() => {
    const canvas = xbarCanvasRef.current;
    if (!canvas || modelBatches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 65, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const isXbar = activeTab === 'xbar';
    const values = isXbar ? modelBatches.map(b => b.Thickness_Mean_um) : modelBatches.map(b => b.Thickness_Range_um);
    const centerLine = isXbar ? spcMetrics.xBarGrand : spcMetrics.rBar;
    const ucl = isXbar ? spcMetrics.uclX : spcMetrics.uclR;
    const lcl = isXbar ? spcMetrics.lclX : spcMetrics.lclR;

    // Y bounds
    const minVal = Math.min(lcl, ...values) - (isXbar ? currentBatch.Tolerance_um * 0.3 : 0.1);
    const maxVal = Math.max(ucl, ...values) + (isXbar ? currentBatch.Tolerance_um * 0.3 : 0.2);
    const ySpan = Math.max(0.01, maxVal - minVal);

    const getY = (val: number) => padding.top + chartH - ((val - minVal) / ySpan) * chartH;
    const getX = (i: number) => padding.left + (modelBatches.length > 1 ? (i / (modelBatches.length - 1)) * chartW : chartW / 2);

    // Draw Grid & UCL/LCL Control Limits
    // UCL Line
    const uclY = getY(ucl);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, uclY);
    ctx.lineTo(padding.left + chartW, uclY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`UCL: ${ucl.toFixed(2)}`, padding.left + chartW + 4, uclY + 3);

    // LCL Line
    const lclY = getY(lcl);
    ctx.beginPath();
    ctx.moveTo(padding.left, lclY);
    ctx.lineTo(padding.left + chartW, lclY);
    ctx.stroke();
    ctx.fillText(`LCL: ${lcl.toFixed(2)}`, padding.left + chartW + 4, lclY + 3);

    // Center Line (CL)
    const clY = getY(centerLine);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, clY);
    ctx.lineTo(padding.left + chartW, clY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`CL: ${centerLine.toFixed(2)}`, padding.left + chartW + 4, clY + 3);

    // If X-bar chart, also show Specification Limits (USL & LSL) in gold dashed line
    if (isXbar) {
      const uslY = getY(currentBatch.USL_um);
      const lslY = getY(currentBatch.LSL_um);
      ctx.strokeStyle = '#eab308';
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, uslY);
      ctx.lineTo(padding.left + chartW, uslY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding.left, lslY);
      ctx.lineTo(padding.left + chartW, lslY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#eab308';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(`USL ${currentBatch.USL_um.toFixed(1)}`, padding.left + 6, uslY - 4);
      ctx.fillText(`LSL ${currentBatch.LSL_um.toFixed(1)}`, padding.left + 6, lslY + 11);
    }

    // Connect batches with line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = getX(i);
      const y = getY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot Points with Out-of-control rule highlights
    values.forEach((v, i) => {
      const x = getX(i);
      const y = getY(v);
      const isSelected = modelBatches[i].Batch_ID === currentBatch.Batch_ID;
      const isHovered = hoverIndex === i;
      const isOutOfControl = v > ucl || v < lcl;

      // Glow halo
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 8 : (isHovered ? 7 : 4), 0, Math.PI * 2);
      ctx.fillStyle = isOutOfControl
        ? 'rgba(239, 68, 68, 0.4)'
        : (isSelected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(14, 165, 233, 0.2)');
      ctx.fill();

      // Point circle
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 5 : (isHovered ? 4.5 : 3), 0, Math.PI * 2);
      ctx.fillStyle = isOutOfControl ? '#ef4444' : (isSelected ? '#38bdf8' : '#ffffff');
      ctx.strokeStyle = isOutOfControl ? '#fca5a5' : '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });

    // X Axis ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(modelBatches.length / 8));
    for (let i = 0; i < modelBatches.length; i += step) {
      const x = getX(i);
      const batchShort = modelBatches[i].Batch_ID.split('-').slice(-2).join('-');
      ctx.fillText(batchShort, x, padding.top + chartH + 16);
    }

  }, [modelBatches, currentBatch, spcMetrics, activeTab, hoverIndex]);

  // Draw Gaussian Distribution Bell Curve
  useEffect(() => {
    const canvas = distCanvasRef.current;
    if (!canvas || modelBatches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 30, bottom: 40, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const mu = spcMetrics.xBarGrand;
    const sigma = Math.max(0.01, spcMetrics.sigma);
    const usl = currentBatch.USL_um;
    const lsl = currentBatch.LSL_um;

    // Range: from mu - 4.5sigma to mu + 4.5sigma or beyond LSL/USL
    const xMin = Math.min(lsl - sigma, mu - 4 * sigma);
    const xMax = Math.max(usl + sigma, mu + 4 * sigma);
    const xSpan = xMax - xMin;

    const getX = (val: number) => padding.left + ((val - xMin) / xSpan) * chartW;

    // Normal probability density function
    const pdf = (x: number) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
    const peak = pdf(mu);
    const getY = (p: number) => padding.top + chartH - (p / peak) * chartH * 0.95;

    // Shaded In-Spec / Out-of-Spec Zones
    const steps = 100;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);

    for (let i = 0; i <= steps; i++) {
      const val = xMin + (i / steps) * xSpan;
      const x = getX(val);
      const y = getY(pdf(val));
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.closePath();

    const bellGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    bellGradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    bellGradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
    ctx.fillStyle = bellGradient;
    ctx.fill();

    // Curve Stroke
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const val = xMin + (i / steps) * xSpan;
      const x = getX(val);
      const y = getY(pdf(val));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Specification Lines
    // LSL
    const lslX = getX(lsl);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lslX, padding.top);
    ctx.lineTo(lslX, padding.top + chartH);
    ctx.stroke();

    // USL
    const uslX = getX(usl);
    ctx.beginPath();
    ctx.moveTo(uslX, padding.top);
    ctx.lineTo(uslX, padding.top + chartH);
    ctx.stroke();

    // Mean (Mu) Line
    const muX = getX(mu);
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(muX, padding.top);
    ctx.lineTo(muX, padding.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('LSL', lslX, padding.top + chartH + 14);
    ctx.fillText('USL', uslX, padding.top + chartH + 14);

    ctx.fillStyle = '#10b981';
    ctx.fillText('Mean (µ)', muX, padding.top + chartH + 14);

  }, [spcMetrics, currentBatch, modelBatches]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              統計製程管制 SPC (X-bar &amp; R Chart) 與製程能力評估
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              基準型號: <span className="text-sky-300 font-semibold">{currentBatch.Product_Model}</span> · 統計樣本數: {modelBatches.length} 批次 (n=10)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('xbar')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'xbar' ? 'bg-slate-800 text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            X-bar 平均值管制圖
          </button>
          <button
            onClick={() => setActiveTab('range')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'range' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            R 全幅極差管制圖
          </button>
        </div>
      </div>

      {/* Grid: Left SPC Chart Canvas (2/3) + Right Cpk Normal Dist Curve (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-slate-800">
        <div className="lg:col-span-2 relative h-[280px] bg-slate-950 border-r border-slate-800">
          <canvas
            ref={xbarCanvasRef}
            className="w-full h-full block cursor-pointer"
            onClick={(e) => {
              const canvas = xbarCanvasRef.current;
              if (!canvas || !onSelectBatch) return;
              const rect = canvas.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const padding = { left: 60, right: 65 };
              const chartW = rect.width - padding.left - padding.right;
              const relX = (x - padding.left) / chartW;
              const index = Math.min(modelBatches.length - 1, Math.max(0, Math.round(relX * (modelBatches.length - 1))));
              onSelectBatch(modelBatches[index]);
            }}
          />
          <div className="absolute top-2 left-4 text-[10px] text-slate-400 font-mono">
            {activeTab === 'xbar' ? '連續批次平均厚度 (X-bar µm)' : '連續批次極差變異 (R µm)'}
          </div>
        </div>

        <div className="relative h-[280px] bg-slate-950 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Cpk 常態機率分佈 (Gaussian PDF)
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
              spcMetrics.cpkAvg >= 1.33 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              Cpk {spcMetrics.cpkAvg.toFixed(2)}
            </span>
          </div>

          <div className="relative w-full h-[180px]">
            <canvas ref={distCanvasRef} className="w-full h-full block" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">製程潛力 Cp</span>
              <span className="font-bold text-white">{spcMetrics.cp.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">綜合指標 Cpk</span>
              <span className="font-bold text-sky-400">{spcMetrics.cpkAvg.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">評級 Rating</span>
              <span className={`font-bold ${spcMetrics.cpkAvg >= 1.67 ? 'text-emerald-400' : spcMetrics.cpkAvg >= 1.33 ? 'text-sky-400' : 'text-amber-400'}`}>
                {spcMetrics.cpkAvg >= 1.67 ? 'A+ 優良' : spcMetrics.cpkAvg >= 1.33 ? 'A 充足' : 'B 尚可'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SPC Footer Summary */}
      <div className="p-4 bg-slate-900 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-white mb-0.5">製程管制標準規範</h5>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              管制界限依據休哈特 (Shewhart) SPC 公式計算，當連續 9 點在中心線同側或單點超出 UCL/LCL 視為失控異常。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-white mb-0.5">當前批次偏差量 (Δ)</h5>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              當前批號 {currentBatch.Batch_ID} 平均厚度為 {currentBatch.Thickness_Mean_um.toFixed(2)}µm，距標稱值 {currentBatch.Nominal_Thickness_um}µm 偏差 {(currentBatch.Thickness_Mean_um - currentBatch.Nominal_Thickness_um).toFixed(2)}µm。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-white mb-0.5">工程師即時處置指令</h5>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {currentBatch.QC_Result === 'PASS'
                ? '製程數據皆落在 ±3σ 管制區間內，維持標準塗佈製程參數作業。'
                : `偵測到異常模式【${currentBatch.Anomaly_Pattern}】，請參考右側製程參數偏差與調機模擬單處置。`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

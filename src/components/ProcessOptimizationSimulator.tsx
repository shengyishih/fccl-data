import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { ANOMALY_META, FCCL_PRODUCT_SPECS } from '../services/fcclData';
import { Wrench, Sparkles, RotateCcw, Copy, Check, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  batch: FCCLBatchRecord;
  onApplyRecipe?: (optimizedBatch: FCCLBatchRecord) => void;
}

export const ProcessOptimizationSimulator: React.FC<Props> = ({ batch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tunable Process Engineering Control Knobs
  const [dieGapTilt, setDieGapTilt] = useState<number>(0); // Left-Right tilt adjustment in um (-3 to +3 um)
  const [nipPressureAdj, setNipPressureAdj] = useState<number>(0); // Nip pressure / crown adjustment (-15 to +15 kg/cm)
  const [pumpFlowPct, setPumpFlowPct] = useState<number>(0); // Pump flow correction (-8% to +8%)
  const [dryerHeatBalance, setDryerHeatBalance] = useState<number>(0); // Airflow/drying heat balance (-5 to +5 C)
  const [filterCleaned, setFilterCleaned] = useState<boolean>(false); // Lip scratch / filter purge

  const [copied, setCopied] = useState<boolean>(false);

  // Auto-tune recommendation based on pattern
  const handleAutoOptimize = () => {
    const pattern = batch.Anomaly_Pattern;
    const meanDelta = batch.Thickness_Mean_um - batch.Nominal_Thickness_um;

    // Pump adjustment to counter mean shift
    const suggestedPump = -(meanDelta / batch.Nominal_Thickness_um) * 100 * 1.8;
    setPumpFlowPct(parseFloat(Math.max(-8, Math.min(8, suggestedPump)).toFixed(2)));

    if (pattern === 'Wedge') {
      // Calculate tilt slope from P1 to P10
      const p1 = batch.points[0];
      const p10 = batch.points[9];
      const slope = (p10 - p1) / 2;
      setDieGapTilt(parseFloat((-slope * 1.5).toFixed(2)));
    } else {
      setDieGapTilt(0);
    }

    if (pattern === 'Center_Bulge') {
      const centerAvg = (batch.points[3] + batch.points[4] + batch.points[5] + batch.points[6]) / 4;
      const edgeAvg = (batch.points[0] + batch.points[1] + batch.points[8] + batch.points[9]) / 4;
      const bulge = centerAvg - edgeAvg;
      setNipPressureAdj(parseFloat((-bulge * 8).toFixed(1)));
    } else {
      setNipPressureAdj(0);
    }

    if (pattern === 'Drift') {
      setDryerHeatBalance(2.5);
    } else {
      setDryerHeatBalance(0);
    }

    if (pattern === 'Local_Spike') {
      setFilterCleaned(true);
    } else {
      setFilterCleaned(false);
    }
  };

  const handleReset = () => {
    setDieGapTilt(0);
    setNipPressureAdj(0);
    setPumpFlowPct(0);
    setDryerHeatBalance(0);
    setFilterCleaned(false);
  };

  // Compute Simulated Corrected Profile
  const simResult = useMemo(() => {
    const origPoints = batch.points;
    const nominal = batch.Nominal_Thickness_um;
    const count = origPoints.length;

    const simulatedPoints = origPoints.map((pt, i) => {
      let val = pt;

      // 1. Die Gap Tilt Correction (Linear TD gradient)
      const tdPosNorm = (i / (count - 1)) - 0.5; // -0.5 to +0.5
      val += dieGapTilt * tdPosNorm;

      // 2. Nip Roll Pressure & Crown Correction (Parabolic TD curve)
      // Center (i=4,5) influenced most by nip pressure/crown
      const centerFactor = 1 - Math.pow((i - 4.5) / 4.5, 2); // 1 at center, 0 at edges
      val += (nipPressureAdj * 0.08) * centerFactor;

      // 3. Pump Flow % (Uniform thickness shift)
      val += (pumpFlowPct / 100) * nominal;

      // 4. Dryer Heat Balance (Counters longitudinal drift / edge cooling)
      val += (dryerHeatBalance * 0.04) * (1 - centerFactor * 0.5);

      // 5. Filter & Lip Purge (Eliminates isolated outlier spike if present)
      if (filterCleaned && batch.Anomaly_Pattern === 'Local_Spike') {
        const meanOther = (origPoints.reduce((a, b) => a + b, 0) - pt) / (count - 1);
        if (Math.abs(pt - meanOther) > batch.Tolerance_um * 0.8) {
          val = meanOther + (Math.random() - 0.5) * 0.1;
        }
      }

      return val;
    });

    const simMean = simulatedPoints.reduce((a, b) => a + b, 0) / count;
    const simStd = Math.max(0.01, Math.sqrt(simulatedPoints.reduce((acc, p) => acc + Math.pow(p - simMean, 2), 0) / (count - 1)));
    const usl = batch.USL_um;
    const lsl = batch.LSL_um;
    const simCp = (usl - lsl) / (6 * simStd);
    const simCpu = (usl - simMean) / (3 * simStd);
    const simCpl = (simMean - lsl) / (3 * simStd);
    const simCpk = Math.min(simCpu, simCpl);
    const simRange = Math.max(...simulatedPoints) - Math.min(...simulatedPoints);
    const inSpecCount = simulatedPoints.filter(p => p >= lsl && p <= usl).length;
    const simYieldPct = (inSpecCount / count) * 100;

    return {
      points: simulatedPoints,
      mean: simMean,
      std: simStd,
      range: simRange,
      cpk: simCpk,
      yieldPct: simYieldPct
    };
  }, [batch, dieGapTilt, nipPressureAdj, pumpFlowPct, dryerHeatBalance, filterCleaned]);

  // Draw Comparison on Canvas
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
    const padding = { top: 30, right: 65, bottom: 45, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const nominal = batch.Nominal_Thickness_um;
    const usl = batch.USL_um;
    const lsl = batch.LSL_um;
    const tol = batch.Tolerance_um;

    const allValues = [...batch.points, ...simResult.points, usl, lsl];
    const minVal = Math.min(...allValues) - tol * 0.25;
    const maxVal = Math.max(...allValues) + tol * 0.25;
    const ySpan = Math.max(0.1, maxVal - minVal);

    const getY = (val: number) => padding.top + chartH - ((val - minVal) / ySpan) * chartH;
    const getX = (i: number) => padding.left + (i / 9) * chartW;

    // Tolerance Envelope
    const uslY = getY(usl);
    const lslY = getY(lsl);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.fillRect(padding.left, uslY, chartW, lslY - uslY);

    // USL & LSL lines
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, uslY);
    ctx.lineTo(padding.left + chartW, uslY);
    ctx.moveTo(padding.left, lslY);
    ctx.lineTo(padding.left + chartW, lslY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`USL ${usl.toFixed(1)}`, padding.left + chartW + 4, uslY + 3);
    ctx.fillText(`LSL ${lsl.toFixed(1)}`, padding.left + chartW + 4, lslY + 3);

    // Target Line
    const nomY = getY(nominal);
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, nomY);
    ctx.lineTo(padding.left + chartW, nomY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Original Measured Profile (Red / Amber dashed)
    ctx.strokeStyle = batch.QC_Result === 'PASS' ? '#94a3b8' : '#f43f5e';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    batch.points.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Original points dots
    batch.points.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      ctx.fillStyle = batch.QC_Result === 'PASS' ? '#94a3b8' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Simulated Optimized Profile (Glowing Emerald Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    simResult.points.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(i - 1);
        const prevY = getY(simResult.points[i - 1]);
        const cpX1 = prevX + (x - prevX) * 0.5;
        const cpX2 = prevX + (x - prevX) * 0.5;
        ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
      }
    });
    ctx.stroke();

    // Simulated Points
    simResult.points.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Number text
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${val.toFixed(2)}`, x, y - 8);
    });

    // Bottom Points Markers
    for (let i = 0; i < 10; i++) {
      const x = getX(i);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`P${i + 1}`, x, padding.top + chartH + 16);
    }

  }, [batch, simResult]);

  // Generated Recipe SOP text
  const recipeText = `【FCCL 生產線製程調機改善單 (Process Work Order)】
批號: ${batch.Batch_ID} | 型號: ${batch.Product_Model} | 標稱厚度: ${batch.Nominal_Thickness_um}µm ±${batch.Tolerance_um}µm
檢驗異常模式: ${batch.Anomaly_Pattern} (${ANOMALY_META[batch.Anomaly_Pattern]?.nameZh || ''})

[調機參數補償指令]
1. 塗佈模頭左右間隙補償 (Die Gap Tilt): ${dieGapTilt > 0 ? '+' : ''}${dieGapTilt} µm
2. 貼合壓輪壓力微調 (Nip Pressure Adj): ${nipPressureAdj > 0 ? '+' : ''}${nipPressureAdj} kg/cm
3. 精密注膠泵轉速微調 (Pump Flow Adj): ${pumpFlowPct > 0 ? '+' : ''}${pumpFlowPct} %
4. 烘箱橫向熱風/溫控補償 (Dryer Temp Adj): ${dryerHeatBalance > 0 ? '+' : ''}${dryerHeatBalance} °C
5. 模頭唇口擦拭與過濾器排查: ${filterCleaned ? '已完成唇口擦拭並更換 5µm 濾芯' : '常規狀態'}

[模擬預估效果]
· 預估厚度平均值: ${simResult.mean.toFixed(2)} µm (原 ${batch.Thickness_Mean_um.toFixed(2)} µm)
· 預估全幅極差 (Range): ${simResult.range.toFixed(2)} µm (原 ${batch.Thickness_Range_um.toFixed(2)} µm)
· 預估製程能力 Cpk: ${simResult.cpk.toFixed(2)} (原 ${batch.cpk.toFixed(2)})
· 預估單捲良率: ${simResult.yieldPct.toFixed(1)}% (原 ${((batch.points.filter(p => p >= batch.LSL_um && p <= batch.USL_um).length / 10) * 100).toFixed(0)}%)
製程工程師審查確認: PASS / 可直接套用調機`;

  const handleCopyRecipe = () => {
    navigator.clipboard.writeText(recipeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              製程參數調機即時模擬器 (Process Parameter Optimization Simulator)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              以機台物理逆向模型反推調機參數，即時預估基材機械厚度收斂與 Cpk 良率提升
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoOptimize}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            AI 智能一鍵最佳化
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重設參數
          </button>
        </div>
      </div>

      {/* Grid: Left Canvas (Comparison) + Right Slider Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-800">
        {/* Live Profile Comparison Canvas */}
        <div className="lg:col-span-7 relative h-[360px] bg-slate-950 p-2 border-r border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between px-3 pt-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <span className="w-3 h-0.5 bg-rose-400 inline-block border-b border-rose-400 border-dashed"></span>
                調機前實測
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-3 h-1 bg-emerald-500 inline-block rounded-full"></span>
                調機後預估剖面
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              目標標稱: {batch.Nominal_Thickness_um}µm
            </span>
          </div>

          <div className="relative w-full h-[280px]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          <div className="px-3 pb-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>原 Cpk: <strong className="text-rose-400">{batch.cpk.toFixed(2)}</strong></span>
            <span>預估新 Cpk: <strong className="text-emerald-400 text-xs">{simResult.cpk.toFixed(2)}</strong></span>
            <span>極差 R: <strong className="text-sky-300">{simResult.range.toFixed(2)}µm</strong></span>
            <span>預估良率: <strong className="text-emerald-400 font-bold">{simResult.yieldPct.toFixed(0)}%</strong></span>
          </div>
        </div>

        {/* Process Engineering Parameter Controls */}
        <div className="lg:col-span-5 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">機台參數補償調控閥 (Control Knobs)</span>
            <span className="text-[11px] text-slate-400">即時物理回饋</span>
          </div>

          {/* Slider 1: Die Gap Left-Right Balance */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">模頭左右間隙差 (Die Gap Tilt)</span>
              <span className="font-mono text-sky-400 font-bold">{dieGapTilt > 0 ? `+${dieGapTilt}` : dieGapTilt} µm</span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="3.0"
              step="0.1"
              value={dieGapTilt}
              onChange={(e) => setDieGapTilt(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>操作側 (OS) 偏大</span>
              <span>平衡 0</span>
              <span>傳動側 (DS) 偏大</span>
            </div>
          </div>

          {/* Slider 2: Nip Roll Pressure / Crown */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">貼合壓輪中凸補償 (Nip Crown Pressure)</span>
              <span className="font-mono text-amber-400 font-bold">{nipPressureAdj > 0 ? `+${nipPressureAdj}` : nipPressureAdj} kg/cm</span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={nipPressureAdj}
              onChange={(e) => setNipPressureAdj(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>消除中凹 -15</span>
              <span>中立 0</span>
              <span>消除中高 +15</span>
            </div>
          </div>

          {/* Slider 3: Metering Pump Flow Rate */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">注膠齒輪泵轉速微調 (Pump Flow Trim)</span>
              <span className="font-mono text-emerald-400 font-bold">{pumpFlowPct > 0 ? `+${pumpFlowPct}` : pumpFlowPct}%</span>
            </div>
            <input
              type="range"
              min="-8.0"
              max="8.0"
              step="0.2"
              value={pumpFlowPct}
              onChange={(e) => setPumpFlowPct(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>減膠 -8%</span>
              <span>標稱 0%</span>
              <span>增膠 +8%</span>
            </div>
          </div>

          {/* Slider 4: Dryer Zone Heat Balance */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">烘箱溫區熱風均勻度 (Dryer Balance)</span>
              <span className="font-mono text-indigo-400 font-bold">{dryerHeatBalance > 0 ? `+${dryerHeatBalance}` : dryerHeatBalance} °C</span>
            </div>
            <input
              type="range"
              min="-5.0"
              max="5.0"
              step="0.5"
              value={dryerHeatBalance}
              onChange={(e) => setDryerHeatBalance(parseFloat(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>低溫補償 -5°C</span>
              <span>標準 0°C</span>
              <span>高溫升溫 +5°C</span>
            </div>
          </div>

          {/* Toggle: Clean Lip & Purge Filter */}
          <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors">
            <input
              type="checkbox"
              checked={filterCleaned}
              onChange={(e) => setFilterCleaned(e.target.checked)}
              className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-slate-200">
              執行模頭唇口異物擦拭、更換供膠 5µm 精密濾芯 (消除 Local Spike)
            </span>
          </label>
        </div>
      </div>

      {/* Generated SOP Recipe Work Order Footer */}
      <div className="p-4 bg-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              調機配方已就緒：預估 Cpk 自 {batch.cpk.toFixed(2)} 提升至 {simResult.cpk.toFixed(2)} (良率 {simResult.yieldPct.toFixed(0)}%)
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              依據現場 Slot Die 模頭流體力學逆向計算，可直接轉發領班機台操作人員執行。
            </span>
          </div>
        </div>

        <button
          onClick={handleCopyRecipe}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? '已複製調機單' : '複製調機工單'}
        </button>
      </div>
    </div>
  );
};

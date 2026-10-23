import React, { useRef, useEffect, useState } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { ANOMALY_META } from '../services/fcclData';
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Cpu, Zap, SlidersHorizontal } from 'lucide-react';

interface Props {
  batch: FCCLBatchRecord;
}

interface ParameterItem {
  key: string;
  nameZh: string;
  unit: string;
  target: number;
  actual: number;
  deviation: number;
  deviationPct: number;
  thresholdPct: number;
  anomalyImpact: string;
}

export const ProcessCorrelationCanvas: React.FC<Props> = ({ batch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedParam, setSelectedParam] = useState<string | null>(null);

  // Compile full parameter list
  const params: ParameterItem[] = [
    {
      key: 'gap',
      nameZh: '塗佈模頭間隙 (Die Gap)',
      unit: 'µm',
      target: batch.gap_target,
      actual: batch.gap_actual,
      deviation: batch.deviations?.gap_deviation ?? (batch.gap_actual - batch.gap_target),
      deviationPct: batch.deviations?.gap_deviation_pct ?? ((batch.gap_actual - batch.gap_target) / batch.gap_target) * 100,
      thresholdPct: 1.5,
      anomalyImpact: '若左右開度失衡，直接導致幅寬兩端呈現楔形 (Wedge) 傾斜厚度差'
    },
    {
      key: 'pump',
      nameZh: '精密齒輪注膠泵浦 (Pump Flow)',
      unit: 'rpm',
      target: batch.pump_target,
      actual: batch.pump_actual,
      deviation: batch.deviations?.pump_deviation ?? (batch.pump_actual - batch.pump_target),
      deviationPct: batch.deviations?.pump_deviation_pct ?? ((batch.pump_actual - batch.pump_target) / batch.pump_target) * 100,
      thresholdPct: 1.5,
      anomalyImpact: '注膠量偏差會引致全幅厚度整體向上或向下位移 (Mean Shift)'
    },
    {
      key: 'pressure',
      nameZh: '貼合壓輪壓力 (Nip Pressure)',
      unit: 'kg/cm',
      target: batch.pressure_target,
      actual: batch.pressure_actual,
      deviation: batch.deviations?.pressure_deviation ?? (batch.pressure_actual - batch.pressure_target),
      deviationPct: batch.deviations?.pressure_deviation_pct ?? ((batch.pressure_actual - batch.pressure_target) / batch.pressure_target) * 100,
      thresholdPct: 2.0,
      anomalyImpact: '壓輪兩端剛性不同或過大壓力造成壓輪微撓曲，引發幅寬中高突起 (Center Bulge)'
    },
    {
      key: 'viscosity',
      nameZh: '樹脂膠水黏度 (Slurry Viscosity)',
      unit: 'mPa·s',
      target: batch.viscosity_target,
      actual: batch.viscosity_actual,
      deviation: batch.deviations?.viscosity_deviation ?? (batch.viscosity_actual - batch.viscosity_target),
      deviationPct: batch.deviations?.viscosity_deviation_pct ?? ((batch.viscosity_actual - batch.viscosity_target) / batch.viscosity_target) * 100,
      thresholdPct: 1.0,
      anomalyImpact: '黏度漂移影響塗膜流變性質 (Rheology)，引起厚度平均值跳移與邊緣厚邊現象'
    },
    {
      key: 'temp',
      nameZh: '乾燥烘箱乾燥溫度 (Oven Temp)',
      unit: '°C',
      target: batch.temp_target ?? 365,
      actual: batch.temp_actual ?? 365,
      deviation: batch.deviations?.temp_deviation ?? 0,
      deviationPct: batch.deviations?.temp_deviation_pct ?? 0,
      thresholdPct: 1.0,
      anomalyImpact: '風刀出風溫度與排風不均影響溶劑揮發速率，造成乾燥應力不均突起與收縮'
    },
    {
      key: 'speed',
      nameZh: '塗佈生產線速 (Line Speed)',
      unit: 'm/min',
      target: batch.speed_target,
      actual: batch.speed_actual,
      deviation: batch.deviations?.speed_deviation ?? (batch.speed_actual - batch.speed_target),
      deviationPct: batch.deviations?.speed_deviation_pct ?? ((batch.speed_actual - batch.speed_target) / batch.speed_target) * 100,
      thresholdPct: 1.0,
      anomalyImpact: '線速變動影響濕膜剪切厚度與塗層面密度穩定度'
    },
    {
      key: 'wet',
      nameZh: '塗佈在線濕膜厚度 (Wet Film)',
      unit: 'µm',
      target: batch.wet_target,
      actual: batch.wet_actual,
      deviation: batch.deviations?.wet_deviation ?? (batch.wet_actual - batch.wet_target),
      deviationPct: batch.deviations?.wet_deviation_pct ?? ((batch.wet_actual - batch.wet_target) / batch.wet_target) * 100,
      thresholdPct: 1.5,
      anomalyImpact: '固化前的即時濕膜量測，直接預示烘乾熟化後基材成品機械厚度'
    },
    {
      key: 'cure',
      nameZh: '熟化硬化溫度 (Curing Temp)',
      unit: '°C',
      target: batch.cure_target,
      actual: batch.cure_actual,
      deviation: batch.deviations?.cure_deviation ?? (batch.cure_actual - batch.cure_target),
      deviationPct: batch.deviations?.cure_deviation_pct ?? ((batch.cure_actual - batch.cure_target) / batch.cure_target) * 100,
      thresholdPct: 1.0,
      anomalyImpact: '聚醯亞胺亞胺化度 (Imidization) 與熱膨脹係數 (CTE) 配合性'
    },
    {
      key: 'unwind',
      nameZh: '放卷張力 (Unwind Tension)',
      unit: 'N',
      target: batch.unwind_target,
      actual: batch.unwind_actual,
      deviation: batch.deviations?.unwind_deviation ?? (batch.unwind_actual - batch.unwind_target),
      deviationPct: batch.deviations?.unwind_deviation_pct ?? ((batch.unwind_actual - batch.unwind_target) / batch.unwind_target) * 100,
      thresholdPct: 1.5,
      anomalyImpact: '基材進料張力不穩造成膜面起皺或拉伸延伸率不均，引起厚度漂移'
    },
    {
      key: 'rewind',
      nameZh: '收卷張力 (Rewind Tension)',
      unit: 'N',
      target: batch.rewind_target,
      actual: batch.rewind_actual,
      deviation: batch.deviations?.rewind_deviation ?? (batch.rewind_actual - batch.rewind_target),
      deviationPct: batch.deviations?.rewind_deviation_pct ?? ((batch.rewind_actual - batch.rewind_target) / batch.rewind_target) * 100,
      thresholdPct: 1.5,
      anomalyImpact: '收卷錐度張力衰減不當容易造成內緊外鬆或捲芯壓陷變形'
    }
  ];

  // Render Horizontal Deviation Bar Waterfall Canvas
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
    const padding = { top: 25, right: 80, bottom: 25, left: 160 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Max percentage scale (symmetric around 0)
    const maxPct = Math.max(3.5, ...params.map(p => Math.abs(p.deviationPct)));
    const centerX = padding.left + chartW / 2;

    const getX = (pct: number) => centerX + (pct / maxPct) * (chartW / 2);

    // Grid lines for ±1%, ±2%, ±3%
    const gridPcts = [-3, -2, -1, 0, 1, 2, 3];
    ctx.lineWidth = 1;
    gridPcts.forEach(p => {
      const x = getX(p);
      if (x >= padding.left && x <= padding.left + chartW) {
        ctx.strokeStyle = p === 0 ? '#334155' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH);
        ctx.stroke();

        ctx.fillStyle = p === 0 ? '#94a3b8' : '#475569';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${p > 0 ? '+' : ''}${p}%`, x, padding.top - 6);
      }
    });

    // Draw Bars
    const rowH = chartH / params.length;
    params.forEach((param, i) => {
      const y = padding.top + i * rowH + rowH * 0.15;
      const barH = rowH * 0.7;
      const barX = getX(Math.min(0, param.deviationPct));
      const barW = Math.abs(getX(param.deviationPct) - centerX);
      const isOver = Math.abs(param.deviationPct) > param.thresholdPct;
      const isSelected = selectedParam === param.key;

      // Row hover / selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(0, padding.top + i * rowH, width, rowH);
      }

      // Bar fill color
      let barColor = '#10b981'; // Green
      if (isOver) {
        barColor = Math.abs(param.deviationPct) > param.thresholdPct * 1.5 ? '#ef4444' : '#f59e0b';
      }
      ctx.fillStyle = barColor;

      // Rounded rect bar
      ctx.beginPath();
      ctx.roundRect(barX, y, Math.max(2, barW), barH, 2);
      ctx.fill();

      // Param Name Label (Left)
      ctx.fillStyle = isSelected ? '#38bdf8' : (isOver ? '#fca5a5' : '#cbd5e1');
      ctx.font = isSelected ? 'bold 11px "Plus Jakarta Sans", sans-serif' : '10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(param.nameZh.split(' ')[0], padding.left - 10, y + barH * 0.7);

      // Percentage & Value Label (Right)
      ctx.fillStyle = isOver ? '#fca5a5' : '#94a3b8';
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      const labelX = padding.left + chartW + 8;
      const sign = param.deviationPct > 0 ? '+' : '';
      ctx.fillText(`${sign}${param.deviationPct.toFixed(2)}%`, labelX, y + barH * 0.7);
    });

  }, [batch, params, selectedParam]);

  const anomaly = ANOMALY_META[batch.Anomaly_Pattern] || ANOMALY_META['Normal'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              製程參數偏差瀑布圖與缺陷成因關聯 (Process Deviation &amp; Root Cause)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              實際生產機台參數與配方標準 (Target vs. Actual) 偏差比對分析
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Canvas Bar Chart + Root Cause Diagnosis Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-800">
        <div className="lg:col-span-8 relative h-[360px] bg-slate-950 p-2 border-r border-slate-800">
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-pointer"
            onClick={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const padding = { top: 25, bottom: 25 };
              const chartH = rect.height - padding.top - padding.bottom;
              const rowH = chartH / params.length;
              const idx = Math.floor((y - padding.top) / rowH);
              if (idx >= 0 && idx < params.length) {
                setSelectedParam(prev => prev === params[idx].key ? null : params[idx].key);
              }
            }}
          />
        </div>

        {/* Diagnostic Panel */}
        <div className="lg:col-span-4 bg-slate-900 p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">製程異常診斷結論</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${anomaly.badgeBg} ${anomaly.badgeText} border border-current/20`}>
                {batch.Anomaly_Pattern}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200 block">推定根因 (Root Cause)</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed block mt-0.5">
                    {anomaly.rootCauseZh}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200 block">建議改善對策 (Engineering Action)</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed block mt-0.5">
                    {anomaly.engineeringAction}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Parameter Details */}
            {selectedParam && (
              <div className="mt-3 p-3 bg-sky-950/30 rounded-lg border border-sky-500/30 text-xs animate-in fade-in duration-150">
                {(() => {
                  const p = params.find(item => item.key === selectedParam);
                  if (!p) return null;
                  return (
                    <div>
                      <div className="font-bold text-sky-300 mb-1 flex items-center justify-between">
                        <span>{p.nameZh}</span>
                        <span className="font-mono">{p.actual.toFixed(1)} / {p.target.toFixed(1)} {p.unit}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {p.anomalyImpact}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>注膠泵浦轉速:</span>
              <span className="font-mono text-white font-bold">{batch.pump_actual.toFixed(1)} rpm ({batch.pump_target} 標稱)</span>
            </div>
            <div className="flex justify-between">
              <span>貼合壓輪壓力:</span>
              <span className="font-mono text-white font-bold">{batch.pressure_actual.toFixed(1)} kg/cm ({batch.pressure_target} 標稱)</span>
            </div>
            <div className="flex justify-between">
              <span>模頭開度間隙:</span>
              <span className="font-mono text-white font-bold">{batch.gap_actual.toFixed(1)} µm ({batch.gap_target} 標稱)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

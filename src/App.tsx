import React, { useEffect, useState, useMemo } from 'react';
import { fetchFCCLData, FCCL_PRODUCT_SPECS, ANOMALY_META } from './services/fcclData';
import { FCCLBatchRecord } from './types/fccl';
import { ThicknessProfilerCanvas } from './components/ThicknessProfilerCanvas';
import { RollTopographyHeatmapCanvas } from './components/RollTopographyHeatmapCanvas';
import { SpcControlChartCanvas } from './components/SpcControlChartCanvas';
import { ProcessCorrelationCanvas } from './components/ProcessCorrelationCanvas';
import { ProcessOptimizationSimulator } from './components/ProcessOptimizationSimulator';
import { QcInspectionMethodGuide } from './components/QcInspectionMethodGuide';
import { BatchExplorerTable } from './components/BatchExplorerTable';
import {
  Layers,
  Activity,
  Gauge,
  SlidersHorizontal,
  Wrench,
  BookOpen,
  Table,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Building2,
  Calendar,
  Layers3,
  ArrowRight,
  Rocket
} from 'lucide-react';
import { StreamlitDeployModal } from './components/StreamlitDeployModal';

export default function App() {
  const [batches, setBatches] = useState<FCCLBatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'profiler' | 'heatmap' | 'spc' | 'correlation' | 'simulator' | 'guide' | 'table'>('profiler');

  // Streamlit Deployment Guide Modal
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  // Currently Selected Batch
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);
  const [compareBatchIndex, setCompareBatchIndex] = useState<number | null>(null);

  // Quick Filter by Line in Header
  const [selectedLine, setSelectedLine] = useState<string>('ALL');

  useEffect(() => {
    fetchFCCLData()
      .then((data) => {
        setBatches(data);
        // Find a representative NG batch (e.g. Center Bulge or Wedge) to highlight interesting engineering anomalies first!
        const interestingIdx = data.findIndex(b => b.QC_Result === 'NG' && b.Anomaly_Pattern === 'Center_Bulge');
        if (interestingIdx !== -1) {
          setSelectedBatchIndex(interestingIdx);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '載入數據失敗');
        setLoading(false);
      });
  }, []);

  // Filtered by Line for batch carousel
  const lineBatches = useMemo(() => {
    if (selectedLine === 'ALL') return batches;
    return batches.filter(b => b.Line === selectedLine);
  }, [batches, selectedLine]);

  const currentBatch: FCCLBatchRecord | undefined = batches[selectedBatchIndex];
  const compareBatch: FCCLBatchRecord | null = compareBatchIndex !== null ? batches[compareBatchIndex] : null;

  // Global KPIs across current dataset
  const overallStats = useMemo(() => {
    if (batches.length === 0) return { totalBatches: 0, passRate: 0, avgCpk: 0, totalAreaKm2: 0, ngCount: 0 };
    const passCount = batches.filter(b => b.QC_Result === 'PASS').length;
    const passRate = (passCount / batches.length) * 100;
    const avgCpk = batches.reduce((acc, b) => acc + b.cpk, 0) / batches.length;
    const totalArea = batches.reduce((acc, b) => acc + (b.Batch_Area_m2 || 0), 0) / 1000000; // in km2 or M m2

    return {
      totalBatches: batches.length,
      passRate: parseFloat(passRate.toFixed(1)),
      avgCpk: parseFloat(avgCpk.toFixed(2)),
      totalAreaKm2: parseFloat(totalArea.toFixed(2)),
      ngCount: batches.length - passCount
    };
  }, [batches]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">載入 FCCL 製程品管厚度資料庫中...</h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">解析 493 批次機械接觸量測與機台偏差特徵數據...</p>
      </div>
    );
  }

  if (error || !currentBatch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">資料庫載入異常</h2>
        <p className="text-sm text-slate-400 mt-2">{error || '無法找到批次記錄'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-sky-600 rounded-lg text-xs font-bold text-white"
        >
          重新載入
        </button>
      </div>
    );
  }

  const spec = FCCL_PRODUCT_SPECS[currentBatch.Product_Model];
  const anomaly = ANOMALY_META[currentBatch.Anomaly_Pattern] || ANOMALY_META['Normal'];

  // Navigate batches
  const handlePrevBatch = () => {
    setSelectedBatchIndex(prev => (prev > 0 ? prev - 1 : batches.length - 1));
  };

  const handleNextBatch = () => {
    setSelectedBatchIndex(prev => (prev < batches.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-sky-500/30">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-900/90">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Engineer Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-900/30">
              <Layers3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  FCCL 製程優化與基材厚度分析系統
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  製程工程師 PE
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>QC/QA 機械厚度檢測</span>
                <span>·</span>
                <span>IPC-TM-650 2.2.18</span>
                <span>·</span>
                <span>10-Point Transverse Web Profiler</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Batch Selector in Nav */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={handlePrevBatch}
                title="上一批次"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">批次:</span>
                <select
                  value={selectedBatchIndex}
                  onChange={(e) => setSelectedBatchIndex(parseInt(e.target.value))}
                  className="bg-transparent text-xs font-bold font-mono text-sky-400 focus:outline-none cursor-pointer max-w-[210px]"
                >
                  {batches.map((b, i) => (
                    <option key={b.Batch_ID} value={i} className="bg-slate-900 text-white">
                      {b.Batch_ID} ({b.Product_Model} - {b.QC_Result})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextBatch}
                title="下一批次"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Streamlit Deploy Button */}
            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="查看 GitHub 上傳與 Streamlit 發佈指南"
            >
              <Rocket className="w-3.5 h-3.5" />
              發佈至 Streamlit
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto border-t border-slate-800/80 scrollbar-none">
          <nav className="flex items-center gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('profiler')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'profiler'
                  ? 'bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              10點跨幅剖面 (TD Profiler)
            </button>

            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              2D 全捲地貌熱圖 (Roll Heatmap)
            </button>

            <button
              onClick={() => setActiveTab('spc')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'spc'
                  ? 'bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              SPC 管制圖與 Cpk (Gaussian)
            </button>

            <button
              onClick={() => setActiveTab('correlation')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'correlation'
                  ? 'bg-orange-500/15 text-orange-300 font-bold border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              機台參數偏差與成因 (Deviation)
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              製程調機模擬器 (Simulator)
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              檢測法 SOP 原理 (QA Protocol)
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              批次全數據庫 (Batch Table)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-[1560px] mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
        {/* Plant Overview & Current Batch Hero Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Metric 1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
            <span className="text-slate-400 text-xs block mb-1">分析生產總批次</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-white">{overallStats.totalBatches}</span>
              <span className="text-xs text-slate-400">Batches</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">2025/10 ~ 2026/09 涵蓋1年</span>
          </div>

          {/* Metric 2 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
            <span className="text-slate-400 text-xs block mb-1">總體合格率 (Yield)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">{overallStats.passRate}%</span>
              <span className="text-[11px] text-rose-400">NG: {overallStats.ngCount}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">機械厚度 10 點嚴格公差</span>
          </div>

          {/* Metric 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
            <span className="text-slate-400 text-xs block mb-1">平均製程能力 Cpk</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-extrabold font-mono ${overallStats.avgCpk >= 1.33 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallStats.avgCpk}
              </span>
              <span className="text-[11px] text-sky-400 font-bold">Class A</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">全型號加權綜合指數</span>
          </div>

          {/* Metric 4 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
            <span className="text-slate-400 text-xs block mb-1">當前檢測產線 (Line)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-sky-400">{currentBatch.Line}</span>
              <span className="text-xs text-slate-300 font-sans">{spec?.structure || 'FCCL'} 結構</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block truncate">
              {spec?.description || currentBatch.Product_Model}
            </span>
          </div>

          {/* Metric 5 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg">
            <span className="text-slate-400 text-xs block mb-1">當前批號 QC 判定</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-extrabold font-mono ${currentBatch.QC_Result === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentBatch.QC_Result}
              </span>
              <span className="text-xs text-slate-300">
                {currentBatch.Thickness_Mean_um.toFixed(1)}µm
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              公差 ±{currentBatch.Tolerance_um}µm ({currentBatch.LSL_um}~{currentBatch.USL_um})
            </span>
          </div>

          {/* Metric 6: Anomaly Alarm Banner */}
          <div className={`border rounded-xl p-3.5 shadow-lg flex flex-col justify-between ${
            currentBatch.QC_Result === 'PASS'
              ? 'bg-slate-900 border-slate-800'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <span className="text-slate-400 text-xs block">截面缺陷特徵</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold truncate ${anomaly.badgeText}`}>
                {anomaly.nameZh.split(' ')[0]}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('simulator')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-1 font-semibold cursor-pointer"
            >
              進入調機模擬 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>

        {/* Tab 1: 10-Point Transverse Thickness Profiler */}
        {activeTab === 'profiler' && (
          <div className="space-y-6">
            <ThicknessProfilerCanvas
              batch={currentBatch}
              compareBatch={compareBatch}
            />

            {/* Side-by-side Topography Roll Heatmap Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RollTopographyHeatmapCanvas batch={currentBatch} />

              {/* Process Parameter Quick Snapshot Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                      <h4 className="text-sm font-bold text-white">生產機台關鍵製程參數快照 (Process Recipe)</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Batch: {currentBatch.Batch_ID}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">塗佈模頭間隙 (Die Gap)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.gap_actual.toFixed(1)} µm</span>
                        <span className="text-[11px] text-slate-500">目標 {currentBatch.gap_target}µm</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">注膠齒輪泵 (Pump Flow)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.pump_actual.toFixed(1)} rpm</span>
                        <span className="text-[11px] text-slate-500">目標 {currentBatch.pump_target}rpm</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">貼合壓輪壓力 (Nip Pressure)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.pressure_actual.toFixed(1)} kg/cm</span>
                        <span className="text-[11px] text-slate-500">目標 {currentBatch.pressure_target}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">樹脂膠水黏度 (Viscosity)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.viscosity_actual.toFixed(0)} cps</span>
                        <span className="text-[11px] text-slate-500">目標 {currentBatch.viscosity_target}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">烘箱主區溫度 (Oven Temp)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.temp_actual?.toFixed(1) || '365.0'} °C</span>
                        <span className="text-[11px] text-slate-500">目標 365°C</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">生產線速 (Line Speed)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-white font-bold">{currentBatch.speed_actual.toFixed(2)} m/min</span>
                        <span className="text-[11px] text-slate-500">目標 {currentBatch.speed_target}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span className="text-slate-300">推定缺陷處置:</span>
                    <span className="text-slate-400 truncate max-w-xs">{anomaly.rootCauseZh}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    參數最佳化
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 2D Roll Topography Heatmap */}
        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            <RollTopographyHeatmapCanvas batch={currentBatch} />
            <ThicknessProfilerCanvas batch={currentBatch} />
          </div>
        )}

        {/* Tab 3: SPC & Cpk Analysis */}
        {activeTab === 'spc' && (
          <div className="space-y-6">
            <SpcControlChartCanvas
              batches={batches}
              currentBatch={currentBatch}
              onSelectBatch={(b) => {
                const idx = batches.findIndex(item => item.Batch_ID === b.Batch_ID);
                if (idx !== -1) setSelectedBatchIndex(idx);
              }}
            />
          </div>
        )}

        {/* Tab 4: Process Parameter Correlation & Root Cause */}
        {activeTab === 'correlation' && (
          <div className="space-y-6">
            <ProcessCorrelationCanvas batch={currentBatch} />
          </div>
        )}

        {/* Tab 5: Process Optimization Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <ProcessOptimizationSimulator batch={currentBatch} />
          </div>
        )}

        {/* Tab 6: QC Inspection Method Guide (IPC-TM-650) */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <QcInspectionMethodGuide />
          </div>
        )}

        {/* Tab 7: Batch Explorer Table */}
        {activeTab === 'table' && (
          <div className="space-y-6">
            <BatchExplorerTable
              batches={batches}
              selectedBatch={currentBatch}
              onSelectBatch={(b) => {
                const idx = batches.findIndex(item => item.Batch_ID === b.Batch_ID);
                if (idx !== -1) {
                  setSelectedBatchIndex(idx);
                  setActiveTab('profiler');
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-[1560px] mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
          <span>FCCL 製程優化與基材厚度分析系統 · 專為製程工程師與品管 QC/QA 設計</span>
          <span>規範標準: IPC-TM-650 2.2.18 / 2.2.4 · 檢測精度 0.001 µm</span>
        </div>
      </footer>

      {/* Streamlit & GitHub Deployment Modal */}
      <StreamlitDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}

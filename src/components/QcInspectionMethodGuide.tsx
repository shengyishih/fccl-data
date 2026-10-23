import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, CheckCircle, Shield, Award, HelpCircle, ArrowRight, Gauge, Layers, Sliders } from 'lucide-react';

export const QcInspectionMethodGuide: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [probePressure, setProbePressure] = useState<number>(26); // kPa (standard 22-30 kPa)
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'cu' | 'pi' | 'adh'>('all');

  // Interactive Mechanical Contact Micrometer Canvas
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

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Center layout
    const midX = width / 2;
    const anvilY = height - 70;

    // 1. Bottom Anvil (下固定測砧 - 鎢鋼鏡面硬質合金)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(midX - 160, anvilY, 320, 45, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('高剛性下固定測砧 (Tungsten Carbide Anvil Ø25mm)', midX, anvilY + 26);

    // 2. FCCL Substrate Multi-layer Cross-Section
    // Copper 1, PI layer, Copper 2
    const totalSubH = 50; // visual height
    const cu1H = 14;
    const piH = 22;
    const cu2H = 14;

    const subW = 280;
    const subLeft = midX - subW / 2;
    const subTop = anvilY - totalSubH;

    // Lower Copper Foil (Cu 2)
    ctx.fillStyle = selectedLayer === 'all' || selectedLayer === 'cu' ? '#d97706' : '#451a03';
    ctx.fillRect(subLeft, anvilY - cu2H, subW, cu2H);
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(subLeft, anvilY - cu2H, subW, cu2H);

    // PI Core (Polyimide Dielectric film)
    ctx.fillStyle = selectedLayer === 'all' || selectedLayer === 'pi' ? '#eab308' : '#713f12';
    ctx.fillRect(subLeft, anvilY - cu2H - piH, subW, piH);
    ctx.strokeStyle = '#fef08a';
    ctx.strokeRect(subLeft, anvilY - cu2H - piH, subW, piH);

    // Upper Copper Foil (Cu 1)
    ctx.fillStyle = selectedLayer === 'all' || selectedLayer === 'cu' ? '#b45309' : '#451a03';
    ctx.fillRect(subLeft, subTop, subW, cu1H);
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(subLeft, subTop, subW, cu1H);

    // Layer annotation labels on the right
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('頂層 壓延銅箔 Cu (18µm)', subLeft + subW + 12, subTop + 10);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('聚醯亞胺 PI 絕緣基膜 (25µm)', subLeft + subW + 12, subTop + cu1H + 14);
    ctx.fillStyle = '#fed7aa';
    ctx.fillText('底層 銅箔層 Cu (18µm)', subLeft + subW + 12, anvilY - 4);

    // Dimension Bracket for Total Thickness
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    const bracketX = subLeft - 16;
    ctx.beginPath();
    ctx.moveTo(bracketX + 4, subTop);
    ctx.lineTo(bracketX, subTop);
    ctx.lineTo(bracketX, anvilY);
    ctx.lineTo(bracketX + 4, anvilY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('總厚度 61.0µm', bracketX - 6, subTop + totalSubH / 2 + 3.5);

    // 3. Upper Movable Micrometer Probe (上接觸測頭 Ø6.35mm 平型壓足)
    const probeW = 90;
    const probeTop = 20;
    const probeBottom = subTop;

    const probeGrad = ctx.createLinearGradient(midX - probeW / 2, 0, midX + probeW / 2, 0);
    probeGrad.addColorStop(0, '#475569');
    probeGrad.addColorStop(0.5, '#94a3b8');
    probeGrad.addColorStop(1, '#334155');

    ctx.fillStyle = probeGrad;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    // Probe spindle shaft
    ctx.fillRect(midX - 16, probeTop, 32, probeBottom - probeTop - 22);
    ctx.strokeRect(midX - 16, probeTop, 32, probeBottom - probeTop - 22);

    // Probe flat contact foot (Ø6.35mm Contact Anvil)
    ctx.beginPath();
    ctx.roundRect(midX - probeW / 2, probeBottom - 22, probeW, 22, [3, 3, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Pressure Force Vector Arrows
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    const arrowY1 = probeTop + 15;
    const arrowY2 = probeTop + 45;
    ctx.beginPath();
    ctx.moveTo(midX, arrowY1);
    ctx.lineTo(midX, arrowY2);
    ctx.lineTo(midX - 4, arrowY2 - 8);
    ctx.moveTo(midX, arrowY2);
    ctx.lineTo(midX + 4, arrowY2 - 8);
    ctx.stroke();

    // Contact Pressure Badge
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = probePressure >= 22 && probePressure <= 30 ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 1;
    ctx.fillRect(midX + 24, probeTop + 12, 110, 24);
    ctx.strokeRect(midX + 24, probeTop + 12, 110, 24);

    ctx.fillStyle = probePressure >= 22 && probePressure <= 30 ? '#34d399' : '#fbbf24';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`接觸壓力: ${probePressure} kPa`, midX + 30, probeTop + 27);

    // Foot Spec Label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('平面接觸測頭壓足 Ø6.35mm', midX, probeBottom - 8);

  }, [probePressure, selectedLayer]);

  return (
    <div className="space-y-6">
      {/* Overview Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                IPC-TM-650 Method 2.2.18 / 2.2.4
              </span>
              <span className="text-xs text-slate-400">國際印刷電路協會標準檢測規範</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              QC/QA 部門「基材機械厚度檢測法」工程技術指南
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
              在軟性銅箔基板 (FCCL) 製造中，機械接觸厚度計為最終品質驗收之標準法規方法。
              透過精密測頭對橫切試樣進行跨幅 10 點接觸式量測，有效避免光學法因銅箔粗化層晶粒散射、高分子膜介電常數或折射率波動引起的量測失真。
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Canvas Schematic & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-bold text-white">精密機械測厚儀微觀接觸示意 (Interactive Canvas)</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedLayer(l => l === 'all' ? 'cu' : l === 'cu' ? 'pi' : 'all')}
                className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                層別切換: {selectedLayer === 'all' ? '全複合層' : selectedLayer === 'cu' ? '銅箔層' : 'PI芯膜'}
              </button>
            </div>
          </div>

          <div className="relative w-full h-[320px] bg-slate-950">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>壓足荷重滑桿模擬:</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="15"
                max="40"
                value={probePressure}
                onChange={(e) => setProbePressure(parseInt(e.target.value))}
                className="w-36 accent-sky-400 cursor-pointer"
              />
              <span className={`font-mono font-bold ${probePressure >= 22 && probePressure <= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {probePressure} kPa {probePressure >= 22 && probePressure <= 30 ? '(標準合格)' : '(偏離標準)'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Core Inspection Pillars */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <span className="font-bold text-xs">01</span>
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">接觸面壓 22 ~ 30 kPa 管制原則</h5>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  聚醯亞胺 (PI) 膜具備微米級彈性模數。若測頭彈簧過緊 (&gt;35 kPa)，壓足將材料局部壓陷彈性形變，造成測得厚度虛假偏薄；若過輕 (&lt;20 kPa) 則無法壓平基材捲曲。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <span className="font-bold text-xs">02</span>
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">橫向跨幅等距 10 點取樣法 (TD Profile)</h5>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  試樣裁切 50mm 寬條，自操作側 (OS，點P1) 等間距取樣至傳動側 (DS，點P10)。P1、P10 監控塗佈模頭邊緣效應 (Edge Beads)，P4~P7 監控貼合壓輪中凸 (Crown)。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <span className="font-bold text-xs">03</span>
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">複合層厚度微觀分解式</h5>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed font-mono">
                  T_total = T_Cu1 + T_PI + T_Cu2 (+ T_Adhesive)
                </p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  可搭配化學微蝕法 (Chemical Etching) 剝離銅箔層，單獨檢驗 PI 基膜實體厚度與黏著劑塗膠均勻度。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <span className="font-bold text-xs">04</span>
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">量具校正與環境恆溫 23±2°C</h5>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  每班以等級 0 (Grade 0) 陶瓷塊規進行零點校正 (Zero Reset)，量測室維持 23±2°C、濕度 50±5% RH，消除金屬測頭熱膨脹誤差。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QC/QA vs Process Engineering Root Cause SOP Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800">
          <h4 className="text-sm font-bold text-white">厚度檢測異常特徵與製程調機對照矩陣 (SOP Reference)</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">異常特徵模式</th>
                <th className="py-3 px-4 font-semibold">10 點幾何特徵</th>
                <th className="py-3 px-4 font-semibold">主要製程機理成因</th>
                <th className="py-3 px-4 font-semibold">製程工程師操作調機 SOP</th>
                <th className="py-3 px-4 font-semibold text-center">關鍵機台參數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-amber-400">Center Bulge (中間突起)</td>
                <td className="py-3 px-4 font-sans text-xs">P4~P7 明顯高於 P1、P10 (&gt;1.5µm)</td>
                <td className="py-3 px-4 font-sans text-xs">貼合壓輪壓力過大導致中央撓度變形，或烘箱中央熱風過度集中</td>
                <td className="py-3 px-4 font-sans text-xs">降低 Nip Roll 壓力 5~10 kg/cm，調校烘箱橫向風刀兩端百葉開度</td>
                <td className="py-3 px-4 text-center text-xs text-sky-400 font-bold">pressure, temp</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-orange-400">Wedge (單側楔形偏差)</td>
                <td className="py-3 px-4 font-sans text-xs">P1 至 P10 呈單調線性傾斜升降 (&gt;2.0µm)</td>
                <td className="py-3 px-4 font-sans text-xs">塗佈模頭左右微調螺栓間隙不對稱 (Die Gap Imbalance)</td>
                <td className="py-3 px-4 font-sans text-xs">量測厚邊與薄邊差距，以千分表微調模頭左右開度差 1~2µm</td>
                <td className="py-3 px-4 text-center text-xs text-sky-400 font-bold">gap (Die Gap)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-rose-400">Local Spike (孤點突峰)</td>
                <td className="py-3 px-4 font-sans text-xs">單一點突發超差 (&gt;3.0µm)，其餘點正常</td>
                <td className="py-3 px-4 font-sans text-xs">模頭唇口局部結膠乾固、刮傷或膠水管路有微米顆粒未過濾</td>
                <td className="py-3 px-4 font-sans text-xs">停機擦拭模頭出膠唇口，檢驗更換注膠迴路 5µm 熔噴式濾芯</td>
                <td className="py-3 px-4 text-center text-xs text-sky-400 font-bold">viscosity, filter</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-purple-400">Drift (長度漸進漂移)</td>
                <td className="py-3 px-4 font-sans text-xs">隨捲長前段、中段至尾段連續上升或下降</td>
                <td className="py-3 px-4 font-sans text-xs">烘箱熱平衡未穩溫升漂移，或放卷張力磁粉離合器熱衰退</td>
                <td className="py-3 px-4 font-sans text-xs">校正烘箱閉迴路 PID 溫控溫差，校驗放卷張力 Load Cell 零位</td>
                <td className="py-3 px-4 text-center text-xs text-sky-400 font-bold">unwind, cure, temp</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-cyan-400">Mean Shift (整體規格偏移)</td>
                <td className="py-3 px-4 font-sans text-xs">10 點均勻平行上移或下移超出公差帶</td>
                <td className="py-3 px-4 font-sans text-xs">注膠精密計量泵浦轉速設定偏差，或溶劑揮發使固成份黏度升高</td>
                <td className="py-3 px-4 font-sans text-xs">校正齒輪泵轉速 (Pump RPM)，檢測膠槽黏度並補充稀釋溶劑</td>
                <td className="py-3 px-4 text-center text-xs text-sky-400 font-bold">pump, viscosity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

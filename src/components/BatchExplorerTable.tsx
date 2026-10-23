import React, { useState, useMemo } from 'react';
import { FCCLBatchRecord } from '../types/fccl';
import { ANOMALY_META } from '../services/fcclData';
import { Search, Download, Filter, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface Props {
  batches: FCCLBatchRecord[];
  selectedBatch: FCCLBatchRecord;
  onSelectBatch: (batch: FCCLBatchRecord) => void;
}

export const BatchExplorerTable: React.FC<Props> = ({ batches, selectedBatch, onSelectBatch }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [qcFilter, setQcFilter] = useState<string>('ALL');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'Date' | 'Cpk' | 'Mean' | 'Range'>('Date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Extract distinct models
  const uniqueModels = useMemo(() => {
    return Array.from(new Set(batches.map(b => b.Product_Model))).sort();
  }, [batches]);

  // Filtering
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (searchTerm && !b.Batch_ID.toLowerCase().includes(searchTerm.toLowerCase()) && !b.Product_Model.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (lineFilter !== 'ALL' && b.Line !== lineFilter) return false;
      if (modelFilter !== 'ALL' && b.Product_Model !== modelFilter) return false;
      if (qcFilter !== 'ALL' && b.QC_Result !== qcFilter) return false;
      if (anomalyFilter !== 'ALL' && b.Anomaly_Pattern !== anomalyFilter) return false;
      return true;
    }).sort((a, b) => {
      let diff = 0;
      if (sortField === 'Date') diff = a.Sample_Date.localeCompare(b.Sample_Date);
      else if (sortField === 'Cpk') diff = a.cpk - b.cpk;
      else if (sortField === 'Mean') diff = a.Thickness_Mean_um - b.Thickness_Mean_um;
      else if (sortField === 'Range') diff = a.Thickness_Range_um - b.Thickness_Range_um;
      return sortAsc ? diff : -diff;
    });
  }, [batches, searchTerm, lineFilter, modelFilter, qcFilter, anomalyFilter, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredBatches.length / pageSize);
  const pagedBatches = filteredBatches.slice((page - 1) * pageSize, page * pageSize);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Batch_ID', 'Sample_Date', 'Line', 'Product_Model', 'Nominal_um', 'Tolerance_um',
      'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10',
      'Mean_um', 'Std_um', 'Range_um', 'Cpk', 'QC_Result', 'Anomaly_Pattern'
    ];

    const rows = filteredBatches.map(b => [
      b.Batch_ID, b.Sample_Date, b.Line, b.Product_Model, b.Nominal_Thickness_um, b.Tolerance_um,
      ...b.points,
      b.Thickness_Mean_um, b.Thickness_Std_um, b.Thickness_Range_um, b.cpk, b.QC_Result, b.Anomaly_Pattern
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FCCL_QC_Thickness_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Table Top Filters Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="搜尋批號 / 型號..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Line filter */}
          <select
            value={lineFilter}
            onChange={(e) => { setLineFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">全產線 (All Lines)</option>
            <option value="1L">1L 單面板線</option>
            <option value="2L">2L 雙面板線</option>
            <option value="3L">3L 三面板線</option>
          </select>

          {/* Model filter */}
          <select
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 max-w-[150px]"
          >
            <option value="ALL">全部產品型號</option>
            {uniqueModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* QC Result */}
          <select
            value={qcFilter}
            onChange={(e) => { setQcFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">判定: 全部</option>
            <option value="PASS">合格 PASS</option>
            <option value="NG">超差 NG</option>
          </select>

          {/* Anomaly Pattern */}
          <select
            value={anomalyFilter}
            onChange={(e) => { setAnomalyFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">缺陷模式: 全部</option>
            <option value="Normal">正常受控 Normal</option>
            <option value="Center_Bulge">中間突起 Center Bulge</option>
            <option value="Wedge">單側楔形 Wedge</option>
            <option value="Local_Spike">局部突峰 Local Spike</option>
            <option value="Drift">長度漂移 Drift</option>
            <option value="Mean_Shift">整體偏移 Mean Shift</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            導出 CSV
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">生產批號 (Batch ID)</th>
              <th className="py-2.5 px-3 font-semibold">
                <button
                  onClick={() => { setSortField('Date'); setSortAsc(v => !v); }}
                  className="flex items-center gap-1 hover:text-white"
                >
                  取樣日期
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold">產線</th>
              <th className="py-2.5 px-3 font-semibold">產品型號</th>
              <th className="py-2.5 px-3 font-semibold text-right">標稱厚度</th>
              <th className="py-2.5 px-3 font-semibold text-right">
                <button
                  onClick={() => { setSortField('Mean'); setSortAsc(v => !v); }}
                  className="flex items-center gap-1 hover:text-white justify-end w-full"
                >
                  實測均值
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">標準差 σ</th>
              <th className="py-2.5 px-3 font-semibold text-right">
                <button
                  onClick={() => { setSortField('Range'); setSortAsc(v => !v); }}
                  className="flex items-center gap-1 hover:text-white justify-end w-full"
                >
                  極差 R
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">
                <button
                  onClick={() => { setSortField('Cpk'); setSortAsc(v => !v); }}
                  className="flex items-center gap-1 hover:text-white justify-end w-full"
                >
                  Cpk
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">QC 判定</th>
              <th className="py-2.5 px-3 font-semibold">剖面特徵模式</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {pagedBatches.map(b => {
              const isSelected = b.Batch_ID === selectedBatch.Batch_ID;
              const meta = ANOMALY_META[b.Anomaly_Pattern] || ANOMALY_META['Normal'];

              return (
                <tr
                  key={b.Batch_ID}
                  onClick={() => onSelectBatch(b)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-sky-500/15 border-l-2 border-sky-400' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                    {b.Batch_ID}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-sans">
                    {b.Sample_Date}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {b.Line}
                  </td>
                  <td className="py-2.5 px-3 text-sky-300 font-sans font-medium whitespace-nowrap">
                    {b.Product_Model}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {b.Nominal_Thickness_um.toFixed(1)}µm
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    {b.Thickness_Mean_um.toFixed(2)}µm
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {b.Thickness_Std_um.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {b.Thickness_Range_um.toFixed(2)}µm
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    <span className={b.cpk >= 1.33 ? 'text-emerald-400' : b.cpk >= 1.0 ? 'text-amber-400' : 'text-rose-400'}>
                      {b.cpk.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      b.QC_Result === 'PASS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {b.QC_Result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                    <span className={`text-[11px] font-medium ${meta.badgeText}`}>
                      {meta.nameZh.split(' ')[0]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          共篩選出 <strong className="text-white font-mono">{filteredBatches.length}</strong> 筆批次資料 (當前顯示第 {page} / {Math.max(1, totalPages)} 頁)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono px-2 text-slate-300">
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

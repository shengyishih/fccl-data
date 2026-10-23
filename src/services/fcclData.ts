import Papa from 'papaparse';
import { FCCLBatchRaw, FCCLDeviationRaw, FCCLBatchRecord, FCCLProductSpec } from '../types/fccl';

export const FCCL_PRODUCT_SPECS: Record<string, FCCLProductSpec> = {
  'FCCL-1L-18/25': {
    model: 'FCCL-1L-18/25',
    line: '1L',
    structure: '1L',
    copperThickness1_um: 18,
    piThickness_um: 37,
    nominalThickness_um: 55.0,
    tolerance_um: 1.5,
    description: '單面無膠基板 (18µm RA銅箔 + 37µm 澆鑄PI膜，標稱 55.0µm ±1.5µm)'
  },
  'FCCL-1L-12/12': {
    model: 'FCCL-1L-12/12',
    line: '1L',
    structure: '1L',
    copperThickness1_um: 12,
    piThickness_um: 12,
    nominalThickness_um: 24.0,
    tolerance_um: 1.0,
    description: '單面極薄基板 (12µm ED超薄銅箔 + 12µm PI層，標稱 24.0µm ±1.0µm)'
  },
  'FCCL-2L-12/20/12': {
    model: 'FCCL-2L-12/20/12',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 12,
    piThickness_um: 20,
    copperThickness2_um: 12,
    nominalThickness_um: 44.0,
    tolerance_um: 1.0,
    description: '雙面無膠板 (12µm Cu + 20µm PI芯層 + 12µm Cu，標稱 44.0µm ±1.0µm)'
  },
  'FCCL-2L-12/25/12': {
    model: 'FCCL-2L-12/25/12',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 12,
    piThickness_um: 25,
    copperThickness2_um: 12,
    nominalThickness_um: 49.0,
    tolerance_um: 1.0,
    description: '雙面無膠高頻板 (12µm Cu + 25µm 絕緣PI + 12µm Cu，標稱 49.0µm ±1.0µm)'
  },
  'FCCL-2L-09/12/09': {
    model: 'FCCL-2L-09/12/09',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 9,
    piThickness_um: 12,
    copperThickness2_um: 9,
    nominalThickness_um: 30.0,
    tolerance_um: 1.0,
    description: '超微細雙面板 (9µm 超薄銅 + 12µm PI + 9µm 銅，標稱 30.0µm ±1.0µm)'
  },
  'FCCL-2L-12/12/12': {
    model: 'FCCL-2L-12/12/12',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 12,
    piThickness_um: 12,
    copperThickness2_um: 12,
    nominalThickness_um: 36.0,
    tolerance_um: 1.0,
    description: '雙面薄型對稱板 (12µm Cu + 12µm PI + 12µm Cu，標稱 36.0µm ±1.0µm)'
  },
  'FCCL-2L-18/25/18': {
    model: 'FCCL-2L-18/25/18',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 18,
    piThickness_um: 25,
    copperThickness2_um: 18,
    nominalThickness_um: 61.0,
    tolerance_um: 1.5,
    description: '雙面通用耐折板 (18µm RA銅 + 25µm PI + 18µm 銅，標稱 61.0µm ±1.5µm)'
  },
  'FCCL-2L-18/50/18': {
    model: 'FCCL-2L-18/50/18',
    line: '2L',
    structure: '2L',
    copperThickness1_um: 18,
    piThickness_um: 50,
    copperThickness2_um: 18,
    nominalThickness_um: 86.0,
    tolerance_um: 1.5,
    description: '雙面高剛性厚型板 (18µm Cu + 50µm 厚PI芯 + 18µm Cu，標稱 86.0µm ±1.5µm)'
  },
  'FCCL-3L-18/12/18': {
    model: 'FCCL-3L-18/12/18',
    line: '3L',
    structure: '3L',
    copperThickness1_um: 18,
    piThickness_um: 12.5,
    copperThickness2_um: 18,
    adhesiveThickness_um: 24,
    nominalThickness_um: 72.5,
    tolerance_um: 1.5,
    description: '三層有膠耐折板 (18µm Cu + 雙面膠 24µm + 12.5µm PI，標稱 72.5µm ±1.5µm)'
  },
  'FCCL-3L-35/20/35': {
    model: 'FCCL-3L-35/20/35',
    line: '3L',
    structure: '3L',
    copperThickness1_um: 35,
    piThickness_um: 20,
    copperThickness2_um: 35,
    adhesiveThickness_um: 70,
    nominalThickness_um: 160.0,
    tolerance_um: 2.5,
    description: '三層高載流厚銅板 (35µm 1oz銅 + 雙面膠 + 20µm PI，標稱 160.0µm ±2.5µm)'
  }
};

export const ANOMALY_META: Record<string, {
  nameZh: string;
  en: string;
  rootCauseZh: string;
  engineeringAction: string;
  badgeBg: string;
  badgeText: string;
  iconName: string;
}> = {
  'Normal': {
    nameZh: '製程正常受控',
    en: 'Normal In-Control',
    rootCauseZh: '製程參數在穩定管制區間內，隨機誤差分佈良好',
    engineeringAction: '維持現行模頭間隙與注膠泵浦轉速設定，標準預防保養',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    iconName: 'CheckCircle'
  },
  'Center_Bulge': {
    nameZh: '幅寬中間突起 (中高/兩側偏薄)',
    en: 'Center Bulge',
    rootCauseZh: '貼合壓輪 (Nip Roll) 中間形變撓曲或乾燥風刀中央風壓熱風不均',
    engineeringAction: '調整壓輪中央冠狀補償 (Crown compensation)、校正烘箱橫向風刀出風風速均勻度',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    iconName: 'TrendingUp'
  },
  'Wedge': {
    nameZh: '楔形偏差 (單側偏厚/傾斜)',
    en: 'Transverse Wedge Tilt',
    rootCauseZh: '塗佈模頭左右螺栓間隙不對稱 (Slot Die Gap Imbalance)',
    engineeringAction: '調校模頭傳動側 (DS) 與操作側 (OS) 差速微調螺栓，補償模頭水平平行度',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
    iconName: 'Sliders'
  },
  'Local_Spike': {
    nameZh: '局部孤點突起/刮痕突峰',
    en: 'Local Outlier Spike',
    rootCauseZh: '塗佈模唇口結膠/局部微粒污染 (Lip Scratch / Particle contamination)',
    engineeringAction: '停機擦拭模頭出膠唇口，更換供膠管路精密過濾濾芯 (5µm filter)',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    iconName: 'AlertTriangle'
  },
  'Drift': {
    nameZh: '隨長度漸進式漂移 (升厚/降厚)',
    en: 'Continuous Process Drift',
    rootCauseZh: '烘箱乾燥溫度逐漸溫升膨脹，或收放卷張力感測器熱漂移',
    engineeringAction: '校正烘箱各溫區閉迴路 PID 溫控器，檢查放卷磁粉/伺服張力張力計校零',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
    iconName: 'Activity'
  },
  'Mean_Shift': {
    nameZh: '全幅整體厚度偏移',
    en: 'Mean Specification Shift',
    rootCauseZh: '供料齒輪泵轉速 (Pump Flow) 設定偏差或樹脂膠水固成份/黏度配比漂移',
    engineeringAction: '校正精密計量齒輪泵流量，檢測膠槽黏度計並即時調整溶劑稀釋配比',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    iconName: 'Compass'
  }
};

export async function fetchFCCLData(): Promise<FCCLBatchRecord[]> {
  try {
    const [cleanedRes, deviationRes] = await Promise.all([
      fetch('/assets/aistudio/fccl_cleaned_56064c85.csv'),
      fetch('/assets/aistudio/fccl_process_deviation_features_7dc7b208.csv')
    ]);

    if (!cleanedRes.ok || !deviationRes.ok) {
      throw new Error(`Failed to load CSVs: ${cleanedRes.status} / ${deviationRes.status}`);
    }

    const [cleanedText, deviationText] = await Promise.all([
      cleanedRes.text(),
      deviationRes.text()
    ]);

    const cleanedParsed = Papa.parse<FCCLBatchRaw>(cleanedText.trim(), {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    const deviationParsed = Papa.parse<FCCLDeviationRaw>(deviationText.trim(), {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    const deviationMap = new Map<string, FCCLDeviationRaw>();
    for (const dev of deviationParsed.data) {
      if (dev.Batch_ID) {
        deviationMap.set(dev.Batch_ID, dev);
      }
    }

    const records: FCCLBatchRecord[] = cleanedParsed.data.map(raw => {
      const points = [
        raw.Point_1_um,
        raw.Point_2_um,
        raw.Point_3_um,
        raw.Point_4_um,
        raw.Point_5_um,
        raw.Point_6_um,
        raw.Point_7_um,
        raw.Point_8_um,
        raw.Point_9_um,
        raw.Point_10_um
      ].filter(p => typeof p === 'number' && !isNaN(p));

      const mean = raw.Thickness_Mean_um || (points.reduce((a, b) => a + b, 0) / points.length);
      const std = raw.Thickness_Std_um || Math.sqrt(points.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / Math.max(1, points.length - 1));
      
      const usl = raw.USL_um;
      const lsl = raw.LSL_um;
      const nominal = raw.Nominal_Thickness_um;
      
      const safeStd = Math.max(0.001, std);
      const cp = (usl - lsl) / (6 * safeStd);
      const cpu = (usl - mean) / (3 * safeStd);
      const cpl = (mean - lsl) / (3 * safeStd);
      const cpk = Math.min(cpu, cpl);
      const halfTol = (usl - lsl) / 2;
      const ca = halfTol > 0 ? (mean - nominal) / halfTol : 0;

      const withinSpecCount = points.filter(p => p >= lsl && p <= usl).length;
      const withinSpecRatio = points.length > 0 ? withinSpecCount / points.length : 1;

      return {
        ...raw,
        points,
        deviations: deviationMap.get(raw.Batch_ID),
        cp: parseFloat(cp.toFixed(3)),
        cpk: parseFloat(cpk.toFixed(3)),
        ca: parseFloat(ca.toFixed(3)),
        withinSpecRatio
      };
    });

    return records;
  } catch (err) {
    console.error('Error fetching FCCL data:', err);
    throw err;
  }
}

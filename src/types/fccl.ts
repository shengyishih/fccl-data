export interface FCCLBatchRaw {
  Month: string;
  Line: string;
  Product_Model: string;
  Batch_ID: string;
  Batch_Area_m2: number;
  Batch_Length_m: number;
  Model_Batch_Sequence: number;
  Sample_Date: string;
  Measurement_Method: string;
  Nominal_Thickness_um: number;
  Tolerance_um: number;
  LSL_um: number;
  USL_um: number;
  Injected_Anomaly: number;
  Anomaly_Pattern: 'Normal' | 'Center_Bulge' | 'Wedge' | 'Local_Spike' | 'Drift' | 'Mean_Shift';
  Potential_Root_Cause_Synthetic: string;
  Point_1_um: number;
  Point_2_um: number;
  Point_3_um: number;
  Point_4_um: number;
  Point_5_um: number;
  Point_6_um: number;
  Point_7_um: number;
  Point_8_um: number;
  Point_9_um: number;
  Point_10_um: number;
  Thickness_Mean_um: number;
  Thickness_Std_um: number;
  Thickness_Range_um: number;
  QC_Result: 'PASS' | 'NG';
  speed_target: number;
  speed_actual: number;
  unwind_target: number;
  unwind_actual: number;
  viscosity_target: number;
  viscosity_actual: number;
  gap_target: number;
  gap_actual: number;
  pump_target: number;
  pump_actual: number;
  wet_target: number;
  wet_actual: number;
  temp_target?: number;
  temp_actual?: number;
  pressure_target: number;
  pressure_actual: number;
  cure_target: number;
  cure_actual: number;
  rewind_target: number;
  rewind_actual: number;
}

export interface FCCLDeviationRaw {
  Batch_ID: string;
  Sample_Date: string;
  Month: string;
  Line: string;
  Product_Model: string;
  Injected_Anomaly: number;
  QC_Result: string;
  speed_deviation: number;
  speed_deviation_pct: number;
  unwind_deviation: number;
  unwind_deviation_pct: number;
  viscosity_deviation: number;
  viscosity_deviation_pct: number;
  gap_deviation: number;
  gap_deviation_pct: number;
  pump_deviation: number;
  pump_deviation_pct: number;
  wet_deviation: number;
  wet_deviation_pct: number;
  temp_deviation?: number;
  temp_deviation_pct?: number;
  pressure_deviation: number;
  pressure_deviation_pct: number;
  cure_deviation: number;
  cure_deviation_pct: number;
  rewind_deviation: number;
  rewind_deviation_pct: number;
}

export interface FCCLBatchRecord extends FCCLBatchRaw {
  points: number[];
  deviations?: FCCLDeviationRaw;
  cp: number;
  cpk: number;
  ca: number;
  withinSpecRatio: number;
}

export interface FCCLProductSpec {
  model: string;
  line: string;
  copperThickness1_um: number;
  piThickness_um: number;
  copperThickness2_um?: number;
  adhesiveThickness_um?: number;
  structure: '1L' | '2L' | '3L';
  description: string;
  nominalThickness_um: number;
  tolerance_um: number;
}

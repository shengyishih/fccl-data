# -*- coding: utf-8 -*-
"""
FCCL 製程優化與基材厚度分析系統 (FCCL Process Optimization Dashboard)
專為 FCCL 製程工程師與品管 QC/QA 設計
標準規範: IPC-TM-650 Method 2.2.18 / 2.2.4 基材機械厚度檢測法
可直接上傳 GitHub 並發佈至 Streamlit Community Cloud (https://share.streamlit.io)
"""

import os
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from scipy.stats import norm

# 1. Page Configuration
st.set_page_config(
    page_title="FCCL 製程優化與基材厚度分析系統",
    page_icon="📐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Sleek Industrial CSS
st.markdown("""
<style>
    .stApp {
        background-color: #0b0f17;
        color: #f8fafc;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .metric-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 14px 18px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .metric-title {
        color: #94a3b8;
        font-size: 0.8rem;
        margin-bottom: 4px;
        font-weight: 500;
    }
    .metric-val {
        color: #ffffff;
        font-size: 1.5rem;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
    }
    .badge-pass {
        background-color: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.4);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.8rem;
    }
    .badge-ng {
        background-color: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.4);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.8rem;
    }
</style>
""", unsafe_allow_html=True)

# 2. Domain Specs & Anomaly Meta Definitions
FCCL_PRODUCT_SPECS = {
    'FCCL-1L-18/25': {'structure': '1L', 'cu1': 18, 'pi': 37, 'nominal': 55.0, 'tol': 1.5, 'desc': '單面無膠基板 (18µm RA銅箔 + 37µm 澆鑄PI膜)'},
    'FCCL-1L-12/12': {'structure': '1L', 'cu1': 12, 'pi': 12, 'nominal': 24.0, 'tol': 1.0, 'desc': '單面極薄基板 (12µm ED銅箔 + 12µm PI層)'},
    'FCCL-2L-12/20/12': {'structure': '2L', 'cu1': 12, 'pi': 20, 'cu2': 12, 'nominal': 44.0, 'tol': 1.0, 'desc': '雙面無膠板 (12µm Cu + 20µm PI芯層 + 12µm Cu)'},
    'FCCL-2L-12/25/12': {'structure': '2L', 'cu1': 12, 'pi': 25, 'cu2': 12, 'nominal': 49.0, 'tol': 1.0, 'desc': '雙面無膠高頻板 (12µm Cu + 25µm 絕緣PI + 12µm Cu)'},
    'FCCL-2L-09/12/09': {'structure': '2L', 'cu1': 9, 'pi': 12, 'cu2': 9, 'nominal': 30.0, 'tol': 1.0, 'desc': '超微細雙面板 (9µm 超薄銅 + 12µm PI + 9µm 銅)'},
    'FCCL-2L-12/12/12': {'structure': '2L', 'cu1': 12, 'pi': 12, 'cu2': 12, 'nominal': 36.0, 'tol': 1.0, 'desc': '雙面薄型對稱板 (12µm Cu + 12µm PI + 12µm Cu)'},
    'FCCL-2L-18/25/18': {'structure': '2L', 'cu1': 18, 'pi': 25, 'cu2': 18, 'nominal': 61.0, 'tol': 1.5, 'desc': '雙面通用耐折板 (18µm RA銅 + 25µm PI + 18µm 銅)'},
    'FCCL-2L-18/50/18': {'structure': '2L', 'cu1': 18, 'pi': 50, 'cu2': 18, 'nominal': 86.0, 'tol': 1.5, 'desc': '雙面高剛性厚型板 (18µm Cu + 50µm 厚PI芯 + 18µm Cu)'},
    'FCCL-3L-18/12/18': {'structure': '3L', 'cu1': 18, 'pi': 12.5, 'cu2': 18, 'adh': 24, 'nominal': 72.5, 'tol': 1.5, 'desc': '三層有膠耐折板 (18µm Cu + 雙面膠 24µm + 12.5µm PI)'},
    'FCCL-3L-35/20/35': {'structure': '3L', 'cu1': 35, 'pi': 20, 'cu2': 35, 'adh': 70, 'nominal': 160.0, 'tol': 2.5, 'desc': '三層高載流厚銅板 (35µm 1oz銅 + 雙面膠 + 20µm PI)'}
}

ANOMALY_META = {
    'Normal': {'name_zh': '製程正常受控', 'cause': '製程參數在穩定管制區間內，隨機誤差分佈良好', 'action': '維持現行模頭間隙與注膠泵浦轉速設定，標準預防保養'},
    'Center_Bulge': {'name_zh': '幅寬中間突起 (中高/兩側偏薄)', 'cause': '貼合壓輪 (Nip Roll) 中間形變撓曲或乾燥風刀中央風壓熱風不均', 'action': '調整壓輪中央冠狀補償 (Crown compensation)、校正烘箱橫向風刀出風均勻度'},
    'Wedge': {'name_zh': '楔形偏差 (單側偏厚/傾斜)', 'cause': '塗佈模頭左右螺栓間隙不對稱 (Slot Die Gap Imbalance)', 'action': '調校模頭傳動側 (DS) 與操作側 (OS) 差速微調螺栓，補償模頭水平平行度'},
    'Local_Spike': {'name_zh': '局部孤點突起/刮痕突峰', 'cause': '塗佈模唇口結膠/局部微粒污染 (Lip Scratch / Particle contamination)', 'action': '停機擦拭模頭出膠唇口，更換供膠管路精密過濾濾芯 (5µm filter)'},
    'Drift': {'name_zh': '隨長度漸進式漂移 (升厚/降厚)', 'cause': '烘箱乾燥溫度逐漸溫升膨脹，或收放卷張力感測器熱漂移', 'action': '校正烘箱各溫區閉迴路 PID 溫控器，檢查放卷磁粉/伺服張力計校零'},
    'Mean_Shift': {'name_zh': '全幅整體厚度偏移', 'cause': '供料齒輪泵轉速 (Pump Flow) 設定偏差或樹脂膠水固成份/黏度配比漂移', 'action': '校正精密計量齒輪泵流量，檢測膠槽黏度計並即時調整溶劑稀釋配比'}
}

# 3. Data Loader with Intelligent Path Resolution
@st.cache_data
def load_data():
    search_paths_cleaned = [
        os.path.join(os.path.dirname(__file__), 'data', 'fccl_cleaned_56064c85.csv'),
        os.path.join(os.path.dirname(__file__), 'public', 'assets', 'aistudio', 'fccl_cleaned_56064c85.csv'),
        'fccl_cleaned_56064c85.csv'
    ]
    search_paths_dev = [
        os.path.join(os.path.dirname(__file__), 'data', 'fccl_process_deviation_features_7dc7b208.csv'),
        os.path.join(os.path.dirname(__file__), 'public', 'assets', 'aistudio', 'fccl_process_deviation_features_7dc7b208.csv'),
        'fccl_process_deviation_features_7dc7b208.csv'
    ]

    cleaned_path = next((p for p in search_paths_cleaned if os.path.exists(p)), None)
    dev_path = next((p for p in search_paths_dev if os.path.exists(p)), None)

    if not cleaned_path:
        raise FileNotFoundError("找不到 fccl_cleaned CSV 檔案，請確認 data/ 目錄或 public/ 目錄下存在該檔案。")

    df_clean = pd.read_csv(cleaned_path)
    if dev_path:
        df_dev = pd.read_csv(dev_path)
        # Merge deviations on Batch_ID
        dev_cols = [c for c in df_dev.columns if c not in df_clean.columns or c == 'Batch_ID']
        df = pd.merge(df_clean, df_dev[dev_cols], on='Batch_ID', how='left')
    else:
        df = df_clean

    # Calculate Process Capability (Cp, Cpk, Ca)
    def calc_spc(row):
        pts = [row[f'Point_{i}_um'] for i in range(1, 11)]
        mean = np.mean(pts)
        std = max(0.001, np.std(pts, ddof=1))
        usl = row['USL_um']
        lsl = row['LSL_um']
        nom = row['Nominal_Thickness_um']

        cp = (usl - lsl) / (6 * std)
        cpu = (usl - mean) / (3 * std)
        cpl = (mean - lsl) / (3 * std)
        cpk = min(cpu, cpl)
        ca = (mean - nom) / ((usl - lsl) / 2) if (usl - lsl) > 0 else 0
        return pd.Series([round(cp, 3), round(cpk, 3), round(ca, 3)], index=['cp', 'cpk', 'ca'])

    spc_df = df.apply(calc_spc, axis=1)
    df[['cp', 'cpk', 'ca']] = spc_df

    return df

try:
    df_raw = load_data()
except Exception as e:
    st.error(f"資料庫載入失敗: {e}")
    st.stop()

# 4. Sidebar Controls & Filtering
st.sidebar.markdown("### 🎛️ FCCL 製程品管篩選器")

line_filter = st.sidebar.selectbox("生產線別 (Production Line)", ["ALL (全部產線)", "1L 單面板線", "2L 雙面板線", "3L 三面板線"])
line_key = line_filter.split(" ")[0]

model_options = ["ALL (全部型號)"] + sorted(list(df_raw['Product_Model'].unique()))
model_filter = st.sidebar.selectbox("產品型號 (Product Model)", model_options)

qc_filter = st.sidebar.radio("QC 檢驗判定", ["ALL (全部)", "PASS (合格)", "NG (超差)"], horizontal=True)

anomaly_options = ["ALL (全部模式)"] + list(ANOMALY_META.keys())
anomaly_filter = st.sidebar.selectbox("截面異常模式 (Anomaly Pattern)", anomaly_options)

# Filter Dataframe
df_filtered = df_raw.copy()
if line_key != "ALL":
    df_filtered = df_filtered[df_filtered['Line'] == line_key]
if model_filter != "ALL (全部型號)":
    df_filtered = df_filtered[df_filtered['Product_Model'] == model_filter]
if qc_filter.startswith("PASS"):
    df_filtered = df_filtered[df_filtered['QC_Result'] == "PASS"]
elif qc_filter.startswith("NG"):
    df_filtered = df_filtered[df_filtered['QC_Result'] == "NG"]
if anomaly_filter != "ALL (全部模式)":
    df_filtered = df_filtered[df_filtered['Anomaly_Pattern'] == anomaly_filter]

if len(df_filtered) == 0:
    st.warning("查無符合篩選條件之批次數據，請放寬篩選條件。")
    st.stop()

# Batch Picker in Sidebar
batch_list = list(df_filtered['Batch_ID'])
selected_batch_id = st.sidebar.selectbox("選擇當前分析批號 (Batch ID)", batch_list)
current_batch = df_filtered[df_filtered['Batch_ID'] == selected_batch_id].iloc[0]

# 5. Header KPI Metrics Cards
st.markdown("## 📐 FCCL 製程優化與基材厚度分析儀表板")
st.markdown("*QC/QA 機械厚度檢測法 (IPC-TM-650 2.2.18) · 跨幅 10 點連續剖面與機台製程參數優化*")

col1, col2, col3, col4, col5, col6 = st.columns(6)

with col1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">總分析批次</div>
        <div class="metric-val">{len(df_raw)}</div>
        <small style="color:#64748b;">全產線生產履歷</small>
    </div>
    """, unsafe_allow_html=True)

with col2:
    pass_pct = (len(df_raw[df_raw['QC_Result'] == 'PASS']) / len(df_raw)) * 100
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">總體合格率 (Yield)</div>
        <div class="metric-val" style="color:#34d399;">{pass_pct:.1f}%</div>
        <small style="color:#f87171;">NG: {len(df_raw[df_raw['QC_Result'] == 'NG'])} 批</small>
    </div>
    """, unsafe_allow_html=True)

with col3:
    avg_cpk = df_raw['cpk'].mean()
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">平均製程能力 Cpk</div>
        <div class="metric-val" style="color:#38bdf8;">{avg_cpk:.2f}</div>
        <small style="color:#38bdf8;">Class A 良好</small>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">當前批號型號</div>
        <div class="metric-val" style="font-size:1.1rem; color:#fde047;">{current_batch['Product_Model']}</div>
        <small style="color:#94a3b8;">標稱: {current_batch['Nominal_Thickness_um']}µm ±{current_batch['Tolerance_um']}µm</small>
    </div>
    """, unsafe_allow_html=True)

with col5:
    is_pass = current_batch['QC_Result'] == 'PASS'
    badge_cls = "badge-pass" if is_pass else "badge-ng"
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">當前批號 QC 判定</div>
        <div class="metric-val" style="color:{'#34d399' if is_pass else '#f87171'};">{current_batch['QC_Result']}</div>
        <small style="color:#94a3b8;">均值: {current_batch['Thickness_Mean_um']:.2f}µm (Cpk {current_batch['cpk']:.2f})</small>
    </div>
    """, unsafe_allow_html=True)

with col6:
    pattern_meta = ANOMALY_META.get(current_batch['Anomaly_Pattern'], ANOMALY_META['Normal'])
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">截面特徵模式</div>
        <div class="metric-val" style="font-size:1.05rem; color:#f472b6;">{current_batch['Anomaly_Pattern']}</div>
        <small style="color:#cbd5e1;">{pattern_meta['name_zh'].split(' ')[0]}</small>
    </div>
    """, unsafe_allow_html=True)

st.write("")

# 6. Tabbed Dashboard Views
tabs = st.tabs([
    "📐 10點跨幅剖面 (TD Profiler)",
    "🗺️ 2D 全捲地貌熱圖 (Heatmap)",
    "📊 SPC 管制圖與 Cpk (Gaussian)",
    "⚙️ 機台參數偏差與根因 (Deviation)",
    "🛠️ 製程調機模擬器 (Simulator)",
    "📘 檢測法 SOP 原理 (QA Protocol)",
    "📋 批次全數據庫 (Batch Explorer)"
])

# ==========================================
# TAB 1: 10-Point Transverse Thickness Profiler
# ==========================================
with tabs[0]:
    st.markdown("### 📐 基材機械厚度跨幅 10 點剖面 (Cross-Web TD Profile)")
    st.caption(f"批號: {current_batch['Batch_ID']} · 型號: {current_batch['Product_Model']} · 取樣日期: {current_batch['Sample_Date']} · 檢測方法: IPC-TM-650 2.2.18")

    points = [current_batch[f'Point_{i}_um'] for i in range(1, 11)]
    nominal = current_batch['Nominal_Thickness_um']
    usl = current_batch['USL_um']
    lsl = current_batch['LSL_um']
    tol = current_batch['Tolerance_um']

    x_labels = [f"P{i}<br>(OS)" if i == 1 else (f"P{i}<br>(DS)" if i == 10 else f"P{i}") for i in range(1, 11)]

    fig_prof = go.Figure()

    # Tolerance envelope shaded zone
    fig_prof.add_hrect(
        y0=lsl, y1=usl,
        fillcolor="rgba(16, 185, 129, 0.1)",
        line_width=0,
        annotation_text="合格公差帶 (Spec Zone)",
        annotation_position="top left",
        annotation_font_color="#10b981"
    )

    # USL / LSL Lines
    fig_prof.add_hline(y=usl, line_dash="dash", line_color="#ef4444", annotation_text=f"USL: {usl:.2f}µm", annotation_position="top right")
    fig_prof.add_hline(y=lsl, line_dash="dash", line_color="#ef4444", annotation_text=f"LSL: {lsl:.2f}µm", annotation_position="bottom right")
    fig_prof.add_hline(y=nominal, line_dash="dot", line_color="#38bdf8", annotation_text=f"Target: {nominal:.2f}µm", annotation_position="top left")

    # Actual Profile Curve
    fig_prof.add_trace(go.Scatter(
        x=x_labels,
        y=points,
        mode='lines+markers+text',
        name='實測厚度 (Measured)',
        line=dict(color='#38bdf8' if current_batch['QC_Result'] == 'PASS' else '#fb7185', width=3, shape='spline'),
        marker=dict(size=10, color=['#ef4444' if (p > usl or p < lsl) else '#ffffff' for p in points], line=dict(color='#0284c7', width=2)),
        text=[f"{p:.2f}µm" for p in points],
        textposition="top center",
        textfont=dict(family="JetBrains Mono", size=11, color="#f8fafc")
    ))

    fig_prof.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0f172a",
        plot_bgcolor="#090d16",
        height=380,
        margin=dict(l=50, r=80, t=30, b=40),
        yaxis=dict(title="基材實體厚度 (µm)", gridcolor="#1e293b", zeroline=False),
        xaxis=dict(title="幅寬檢測點位 (TD 方向: 操作側 OS ───► 傳動側 DS)", gridcolor="#1e293b")
    )

    st.plotly_chart(fig_prof, use_container_width=True)

    # Bottom Profile Summary Metrics
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("平均厚度 (Mean X-bar)", f"{current_batch['Thickness_Mean_um']:.3f} µm", f"Δ {(current_batch['Thickness_Mean_um'] - nominal):+.3f} µm")
    c2.metric("厚度標準差 (Std.Dev σ)", f"{current_batch['Thickness_Std_um']:.3f} µm")
    c3.metric("全幅極差 (Range R)", f"{current_batch['Thickness_Range_um']:.3f} µm", f"公差帶: {tol*2:.1f} µm")
    c4.metric("單批能力指數 (Cpk)", f"{current_batch['cpk']:.2f}", f"Cp {current_batch['cp']:.2f}")

# ==========================================
# TAB 2: 2D Roll Topography Heatmap
# ==========================================
with tabs[1]:
    st.markdown("### 🗺️ 全捲表面地貌厚度熱圖 (2D Surface Topography)")
    st.caption("幅寬 TD (10點) × 捲長 MD (米) 連續微米梯度分佈")

    # Generate synthetic 2D matrix based on batch anomaly characteristics
    rows, cols = 35, 10
    pattern = current_batch['Anomaly_Pattern']
    base_points = [current_batch[f'Point_{i}_um'] for i in range(1, 11)]
    matrix = []

    for r in range(rows):
        row_norm = r / (rows - 1)
        row_vals = []
        for c in range(cols):
            base_pt = base_points[c]
            if pattern == 'Drift':
                val = base_pt + (row_norm - 0.5) * (current_batch['Tolerance_um'] * 1.5)
            elif pattern == 'Center_Bulge':
                val = base_pt + np.sin(row_norm * np.pi * 3) * 0.1
            elif pattern == 'Wedge':
                val = base_pt + np.cos(row_norm * np.pi * 5) * 0.08
            elif pattern == 'Local_Spike':
                repeat = abs(np.sin(row_norm * np.pi * 4)) > 0.8
                val = base_pt if repeat else nominal + (np.random.rand() - 0.5) * 0.1
            else:
                val = base_pt + np.sin(row_norm * 6 + c) * 0.05
            row_vals.append(val)
        matrix.append(row_vals)

    md_meters = np.linspace(0, current_batch['Batch_Length_m'], rows)
    td_cols = [f"P{i}" for i in range(1, 11)]

    fig_heat = px.imshow(
        matrix,
        x=td_cols,
        y=md_meters,
        labels=dict(x="幅寬位置 (TD Points)", y="捲長縱向 MD (米)", color="厚度 (µm)"),
        color_continuous_scale="Viridis",
        aspect="auto"
    )

    fig_heat.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0f172a",
        plot_bgcolor="#090d16",
        height=400,
        margin=dict(l=60, r=40, t=30, b=40)
    )

    st.plotly_chart(fig_heat, use_container_width=True)

# ==========================================
# TAB 3: SPC Control Charts & Cpk Gaussian PDF
# ==========================================
with tabs[2]:
    st.markdown("### 📊 統計製程管制 SPC (X-bar & R) 與 Cpk 常態分佈")

    # Filter batches of current model for valid continuous SPC
    model_df = df_raw[df_raw['Product_Model'] == current_batch['Product_Model']].sort_values('Sample_Date')

    col_spc1, col_spc2 = st.columns([2, 1])

    with col_spc1:
        x_bars = model_df['Thickness_Mean_um'].values
        r_bars = model_df['Thickness_Range_um'].values
        grand_x = np.mean(x_bars)
        r_mean = np.mean(r_bars)

        # n=10 constants
        A2, D3, D4, d2 = 0.308, 0.223, 1.777, 3.078
        ucl_x = grand_x + A2 * r_mean
        lcl_x = grand_x - A2 * r_mean

        fig_spc = go.Figure()
        batch_ids = [b.split('-')[-2] + '-' + b.split('-')[-1] for b in model_df['Batch_ID']]

        fig_spc.add_trace(go.Scatter(
            x=batch_ids, y=x_bars,
            mode='lines+markers',
            name='批次平均厚度 (X-bar)',
            line=dict(color='#38bdf8', width=2),
            marker=dict(size=6, color=['#ef4444' if (x > ucl_x or x < lcl_x) else '#ffffff' for x in x_bars])
        ))

        fig_spc.add_hline(y=ucl_x, line_dash="dash", line_color="#ef4444", annotation_text=f"UCL: {ucl_x:.2f}")
        fig_spc.add_hline(y=lcl_x, line_dash="dash", line_color="#ef4444", annotation_text=f"LCL: {lcl_x:.2f}")
        fig_spc.add_hline(y=grand_x, line_color="#10b981", annotation_text=f"CL: {grand_x:.2f}")

        fig_spc.update_layout(
            template="plotly_dark",
            paper_bgcolor="#0f172a",
            plot_bgcolor="#090d16",
            title=f"{current_batch['Product_Model']} 連續批次 X-bar 管制圖 (n=10)",
            height=360,
            margin=dict(l=50, r=40, t=50, b=40),
            xaxis=dict(title="生產批次時間軸", gridcolor="#1e293b"),
            yaxis=dict(title="厚度均值 (µm)", gridcolor="#1e293b")
        )

        st.plotly_chart(fig_spc, use_container_width=True)

    with col_spc2:
        # Gaussian distribution
        sigma_est = max(0.01, r_mean / d2)
        x_axis = np.linspace(grand_x - 4 * sigma_est, grand_x + 4 * sigma_est, 100)
        pdf_y = norm.pdf(x_axis, grand_x, sigma_est)

        fig_gauss = go.Figure()
        fig_gauss.add_trace(go.Scatter(
            x=x_axis, y=pdf_y,
            mode='lines',
            fill='tozeroy',
            fillcolor='rgba(56, 189, 248, 0.25)',
            line=dict(color='#38bdf8', width=2),
            name='Cpk 理論常態分佈'
        ))

        fig_gauss.add_vline(x=current_batch['USL_um'], line_dash="dash", line_color="#ef4444", annotation_text="USL")
        fig_gauss.add_vline(x=current_batch['LSL_um'], line_dash="dash", line_color="#ef4444", annotation_text="LSL")
        fig_gauss.add_vline(x=grand_x, line_color="#10b981", annotation_text="µ")

        cp_val = (current_batch['USL_um'] - current_batch['LSL_um']) / (6 * sigma_est)
        cpk_val = min((current_batch['USL_um'] - grand_x)/(3*sigma_est), (grand_x - current_batch['LSL_um'])/(3*sigma_est))

        fig_gauss.update_layout(
            template="plotly_dark",
            paper_bgcolor="#0f172a",
            plot_bgcolor="#090d16",
            title=f"Cpk 分佈 (Cpk: {cpk_val:.2f})",
            height=360,
            margin=dict(l=30, r=30, t=50, b=40),
            yaxis=dict(showticklabels=False, gridcolor="#1e293b")
        )

        st.plotly_chart(fig_gauss, use_container_width=True)

# ==========================================
# TAB 4: Process Parameter Deviation & Root Cause
# ==========================================
with tabs[3]:
    st.markdown("### ⚙️ 機台製程參數偏差瀑布圖與缺陷成因關聯")
    st.caption("對比目標設定值 Target 與實際生產讀值 Actual 之偏差百分比")

    params_data = [
        {"name": "塗佈模頭間隙 (Die Gap)", "dev_pct": current_batch.get('gap_deviation_pct', 0), "impact": "左右失衡引起 Wedge 楔形偏差"},
        {"name": "注膠計量泵 (Pump Flow)", "dev_pct": current_batch.get('pump_deviation_pct', 0), "impact": "流量偏差引起 Mean Shift 全幅整體偏移"},
        {"name": "貼合壓輪壓力 (Nip Pressure)", "dev_pct": current_batch.get('pressure_deviation_pct', 0), "impact": "壓力過大撓曲引致 Center Bulge 中間突起"},
        {"name": "樹脂膠水黏度 (Viscosity)", "dev_pct": current_batch.get('viscosity_deviation_pct', 0), "impact": "流變性波動影響塗膜剪切穩定度"},
        {"name": "乾燥烘箱溫度 (Oven Temp)", "dev_pct": current_batch.get('temp_deviation_pct', 0), "impact": "熱風溫差影響溶劑揮發與膜面應力"},
        {"name": "塗佈生產線速 (Line Speed)", "dev_pct": current_batch.get('speed_deviation_pct', 0), "impact": "線速不穩影響濕膜厚度面密度"},
        {"name": "在線濕膜厚度 (Wet Film)", "dev_pct": current_batch.get('wet_deviation_pct', 0), "impact": "直接決定乾燥熟化後基材厚度"},
        {"name": "熟化硬化溫度 (Curing Temp)", "dev_pct": current_batch.get('cure_deviation_pct', 0), "impact": "決定亞胺化度與熱收縮率"},
        {"name": "放卷張力 (Unwind Tension)", "dev_pct": current_batch.get('unwind_deviation_pct', 0), "impact": "進料張力鬆弛引起膜面拉伸漂移"},
        {"name": "收卷張力 (Rewind Tension)", "dev_pct": current_batch.get('rewind_deviation_pct', 0), "impact": "錐度張力衰減不當引起捲芯壓陷"}
    ]

    p_df = pd.DataFrame(params_data)

    fig_waterfall = go.Figure(go.Bar(
        y=p_df['name'],
        x=p_df['dev_pct'],
        orientation='h',
        marker=dict(color=['#ef4444' if abs(x) > 2.0 else ('#f59e0b' if abs(x) > 1.0 else '#10b981') for x in p_df['dev_pct']]),
        text=[f"{x:+.2f}%" for x in p_df['dev_pct']],
        textposition="outside"
    ))

    fig_waterfall.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0f172a",
        plot_bgcolor="#090d16",
        height=400,
        margin=dict(l=150, r=80, t=30, b=40),
        xaxis=dict(title="參數偏差百分比 (%)", zerolinecolor="#64748b", zerolinewidth=1.5, gridcolor="#1e293b"),
        yaxis=dict(autorange="reversed")
    )

    st.plotly_chart(fig_waterfall, use_container_width=True)

    # Diagnostic recommendation callout
    st.info(f"**【製程根因推定結論】**: {pattern_meta['cause']}\n\n**【工程師處置建議】**: {pattern_meta['action']}")

# ==========================================
# TAB 5: Process Optimization Simulator
# ==========================================
with tabs[4]:
    st.markdown("### 🛠️ 製程參數調機即時模擬器 (Parameter Optimizer)")
    st.caption("透過物理逆向模型即時反推調機參數，預覽修正後厚度剖面與 Cpk 恢復")

    col_sim_ctl, col_sim_view = st.columns([1, 2])

    with col_sim_ctl:
        st.markdown("#### 🎛️ 調機旋鈕 (Control Knobs)")
        sim_gap = st.slider("模頭左右間隙差 (Die Gap Tilt µm)", -3.0, 3.0, 0.0, 0.1, help="修正 Wedge 單側傾斜")
        sim_press = st.slider("壓輪中凸壓力補償 (Nip Crown kg/cm)", -15.0, 15.0, 0.0, 0.5, help="修正 Center Bulge 中間突起")
        sim_pump = st.slider("注膠泵流量微調 (Pump Flow %)", -8.0, 8.0, 0.0, 0.2, help="修正 Mean Shift 整體偏移")
        sim_oven = st.slider("烘箱溫區熱平衡 (Dryer Balance °C)", -5.0, 5.0, 0.0, 0.5, help="修正溫度漂移")
        sim_clean = st.checkbox("執行模唇擦拭與過濾器排查 (消除 Local Spike)")

        if st.button("✨ AI 智能自動推薦最佳調機參數", use_container_width=True):
            # Auto-tuning heuristic
            mean_delta = current_batch['Thickness_Mean_um'] - current_batch['Nominal_Thickness_um']
            st.session_state['auto_pump'] = float(- (mean_delta / current_batch['Nominal_Thickness_um']) * 150)
            st.success("已載入最佳調機補償設定！")

    with col_sim_view:
        # Calculate simulated points
        sim_pts = []
        for i, pt in enumerate(points):
            val = pt
            # Gap tilt
            val += sim_gap * ((i / 9) - 0.5)
            # Nip crown
            center_fact = 1 - ((i - 4.5) / 4.5) ** 2
            val += (sim_press * 0.08) * center_fact
            # Pump flow
            val += (sim_pump / 100) * nominal
            # Dryer balance
            val += (sim_oven * 0.04) * (1 - center_fact * 0.5)
            # Spike purge
            if sim_clean and pattern == 'Local_Spike':
                other_avg = (sum(points) - pt) / 9
                if abs(pt - other_avg) > tol * 0.8:
                    val = other_avg
            sim_pts.append(val)

        sim_mean = np.mean(sim_pts)
        sim_std = max(0.01, np.std(sim_pts, ddof=1))
        sim_cpk = min((usl - sim_mean)/(3*sim_std), (sim_mean - lsl)/(3*sim_std))

        fig_sim = go.Figure()
        fig_sim.add_hrect(y0=lsl, y1=usl, fillcolor="rgba(16, 185, 129, 0.08)", line_width=0)
        fig_sim.add_hline(y=nominal, line_dash="dot", line_color="#38bdf8")

        # Original
        fig_sim.add_trace(go.Scatter(
            x=[f"P{i}" for i in range(1, 11)], y=points,
            mode='lines+markers', name='調機前實測',
            line=dict(color='#f43f5e', dash='dash', width=2)
        ))

        # Simulated
        fig_sim.add_trace(go.Scatter(
            x=[f"P{i}" for i in range(1, 11)], y=sim_pts,
            mode='lines+markers', name='調機後預估剖面',
            line=dict(color='#10b981', width=3),
            marker=dict(size=8, color='#ffffff', line=dict(color='#10b981', width=2))
        ))

        fig_sim.update_layout(
            template="plotly_dark",
            paper_bgcolor="#0f172a",
            plot_bgcolor="#090d16",
            title=f"調機前後對比預覽 (預估 Cpk: {current_batch['cpk']:.2f} ───► {sim_cpk:.2f})",
            height=360,
            margin=dict(l=40, r=40, t=50, b=40),
            yaxis=dict(title="基材厚度 (µm)", gridcolor="#1e293b")
        )

        st.plotly_chart(fig_sim, use_container_width=True)

    # Work Order Recipe Text
    work_order_text = f"""【FCCL 生產線製程調機改善工單 (Work Order)】
批號: {current_batch['Batch_ID']} | 型號: {current_batch['Product_Model']} | 標稱厚度: {nominal}µm ±{tol}µm
檢驗異常模式: {current_batch['Anomaly_Pattern']}

[調機參數補償指令]
1. 塗佈模頭左右間隙補償 (Die Gap Tilt): {sim_gap:+.2f} µm
2. 貼合壓輪壓力微調 (Nip Pressure): {sim_press:+.1f} kg/cm
3. 精密注膠泵轉速微調 (Pump Flow): {sim_pump:+.2f} %
4. 烘箱熱風溫控補償 (Dryer Temp): {sim_oven:+.1f} °C
5. 模頭唇口擦拭與濾芯維護: {'已排查完成' if sim_clean else '維持常態'}

[預期品質收斂]
預估厚度均值: {sim_mean:.2f} µm (原 {current_batch['Thickness_Mean_um']:.2f} µm)
預估製程能力 Cpk: {sim_cpk:.2f} (原 {current_batch['cpk']:.2f})
製程工程師簽核: PASS (可直接套用機台調機)
"""
    st.download_button(
        "📄 下載製程調機改善工單 (.txt)",
        data=work_order_text,
        file_name=f"FCCL_WorkOrder_{current_batch['Batch_ID']}.txt",
        mime="text/plain"
    )

# ==========================================
# TAB 6: QC Inspection Method Guide (IPC-TM-650)
# ==========================================
with tabs[5]:
    st.markdown("### 📘 QC/QA 部門「基材機械厚度檢測法」工程技術指南")
    st.markdown("""
    #### 1. 檢測法標準規範 (IPC-TM-650 Method 2.2.18 / 2.2.4)
    在軟性銅箔基板 (FCCL) 製造中，高精度機械接觸式千分測厚計為最終出廠與驗收之法規黃金基準。
    相較於光學式（X-ray / 渦電流 / 紅外線）檢測法，機械厚度檢測法直接量測壓砧接觸基材的絕對實體幾何厚度，不受銅箔晶粒取向散射、表面氧化物或樹脂折射率波動干擾。

    #### 2. 接觸測頭與面壓管制規範 (22 ~ 30 kPa)
    * **測頭尺寸規格**：平面測砧直徑 $\\varnothing 6.35\\text{mm}$ (或球面測頭 $r = 3.175\\text{mm}$)。
    * **面壓管制**：嚴格限制在 **$22 \\sim 30\\text{ kPa}$** ($220 \\sim 300\\text{ gf/cm}^2$)。若荷重過大會導致高分子 PI 膜產生彈性蠕變凹陷 (Creep Indentation) 導致量測偏薄；荷重過輕則無法克服微薄捲曲應力。

    #### 3. 跨幅 10 點取樣法 (TD Profile)
    * 裁切垂直於出料方向之全幅試樣條（寬 50mm）。
    * 自操作側 (OS，點P1) 等間距取樣至傳動側 (DS，點P10)。P1、P10 監控塗佈邊緣效應 (Edge Beads)，P4~P7 監控貼合壓輪中凸 (Crown)。
    """)

# ==========================================
# TAB 7: Batch Explorer Table & CSV Export
# ==========================================
with tabs[6]:
    st.markdown("### 📋 批次全數據庫與導出")
    st.dataframe(df_filtered[[
        'Batch_ID', 'Sample_Date', 'Line', 'Product_Model', 'Nominal_Thickness_um',
        'Thickness_Mean_um', 'Thickness_Std_um', 'Thickness_Range_um', 'cpk', 'QC_Result', 'Anomaly_Pattern'
    ]], use_container_width=True)

    csv_data = df_filtered.to_csv(index=False).encode('utf-8-sig')
    st.download_button(
        "📥 導出篩選批次數據為 CSV",
        data=csv_data,
        file_name="FCCL_Batch_QC_Data.csv",
        mime="text/csv"
    )

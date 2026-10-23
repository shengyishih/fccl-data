# FCCL 製程優化與基材厚度分析系統 (FCCL Process Optimization Dashboard)

專為 **FCCL 製程工程師 (Process Engineer)** 與 **品管 QC/QA** 設計的智慧製造與厚度分析系統。整合 **IPC-TM-650 Method 2.2.18 / 2.2.4 基材機械厚度檢測法**、跨幅 10 點剖面動態熱圖、SPC 統計製程管制 ($C_p / C_{pk}$ 常態分佈) 與機台製程參數偏差根因診斷與調機模擬。

---

## 🚀 快速發佈至 Streamlit Community Cloud

本專案已完全配置完畢，包含 `app.py`、`requirements.txt`、`.streamlit/config.toml` 以及內建完整 493 批次檢測數據庫，可 **100% 直接推送到 GitHub 並一鍵免費發佈至 Streamlit Cloud**！

### 步驟 1：上傳專案到 GitHub

在本地終端機（Terminal）或命令提示字元中執行：

```bash
# 1. 初始化 Git 倉庫
git init

# 2. 加入所有檔案
git add .

# 3. 提交變更
git commit -m "feat: FCCL process optimization dashboard for Streamlit"

# 4. 關聯到您的 GitHub 儲存庫 (請替換為您的倉庫網址)
git branch -M main
git remote add origin https://github.com/您的用戶名/您的儲存庫名稱.git

# 5. 推送到 GitHub
git push -u origin main
```

---

### 步驟 2：在 Streamlit Community Cloud 上發佈 (1 分鐘快速部署)

1. 前往 [Streamlit Community Cloud](https://share.streamlit.io/) 並使用您的 GitHub 帳號登入。
2. 點擊右上角 **「New app」**（建立新應用）。
3. 填寫部署設定：
   * **Repository**: 選擇剛才推送的 GitHub 儲存庫（例如 `yourname/fccl-process-optimization`）
   * **Branch**: `main`
   * **Main file path**: 輸入 `app.py`
4. 點擊 **「Deploy!」** 按鈕。
5. 系統會自動依據 `requirements.txt` 安裝相依套件，數十秒內即可獲得專屬公開網址（如 `https://fccl-process-optimization.streamlit.app`）！

---

## 💻 本地端運行 (Local Streamlit Execution)

如果您想在本地電腦使用 Python 運行：

```bash
# 1. 建立並啟動 Python 虛擬環境 (推薦)
python3 -m venv venv
source venv/bin/activate  # Windows 請執行: venv\Scripts\activate

# 2. 安裝相依套件
pip install -r requirements.txt

# 3. 啟動 Streamlit 應用程式
streamlit run app.py
```
瀏覽器將自動開啟 `http://localhost:8501`。

---

## 🌐 亦支援前端 React + Vite 雙架構

如果您同時需要以現代前端 React + Tailwind + HTML5 Canvas 獨立運行：

```bash
# 安裝前端相依套件
npm install

# 啟動開發伺服器
npm run dev
```

---

## 📁 專案檔案結構

```text
├── app.py                            # Streamlit 主程式 (包含 Plotly 互動視覺化與調機模擬器)
├── requirements.txt                  # Python 相依套件清單 (streamlit, pandas, plotly, scipy 等)
├── .streamlit/
│   └── config.toml                   # Streamlit 工業暗色主題與伺服器配置
├── data/                             # 完整 FCCL 生產批次數據集
│   ├── fccl_cleaned_56064c85.csv     # 493 批次機械厚度 10 點量測與機台實際讀值
│   └── fccl_process_deviation_features_7dc7b208.csv # 機台參數偏差特徵集
├── src/                              # React + TypeScript + Canvas 前端源碼
├── public/                           # 靜態資源目錄
└── README.md                         # 專案部署與技術手冊
```

---

## ⚙️ 核心工程功能特色

1. **跨幅 10 點機械厚度剖面 (TD Profiler)**：
   * 標稱 Target、USL/LSL 公差包絡帶、各點偏差 $\Delta \mu m$ 與實體基材層別結構圖解。
2. **2D 全捲地貌熱圖 (2D Surface Topography)**：
   * 橫向 TD (10點) × 縱向 MD (捲長米數) 雙線性曲面熱成梯度與雷射掃描動畫。
3. **統計製程管制 SPC & $C_{pk}$ 常態分佈**：
   * $\bar{X} - R$ 管制圖 ($\pm 3\sigma$ 休哈特管制界限) 與高斯機率密度 PDF 曲線疊合。
4. **機台製程參數偏差瀑布圖 (Process Deviation Waterfall)**：
   * 模頭間隙 (Die Gap)、注膠計量泵 (Pump)、壓輪壓力 (Nip Pressure)、黏度 (Viscosity)、烘箱溫度 (Oven Temp) 偏差關聯根因分析。
5. **製程調機即時模擬器 (Optimizer Simulator)**：
   * 物理逆向調機旋鈕，即時預估 $C_{pk}$ 提升與自動產出「FCCL 製程操作調機單」。
6. **QC/QA 基材機械厚度檢測法 SOP**：
   * IPC-TM-650 2.2.18 / 2.2.4 規範說明、接觸測頭 $\varnothing 6.35\text{mm}$、面壓 $22 \sim 30\text{ kPa}$ 防止高分子 PI 膜壓陷形變原理。

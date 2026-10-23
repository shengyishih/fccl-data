import React, { useState } from 'react';
import { Github, Rocket, Check, Copy, Terminal, ExternalLink, FileCode, CheckCircle2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StreamlitDeployModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'app' | 'req' | 'cfg'>('app');

  if (!isOpen) return null;

  const gitCommands = `# 1. 初始化 Git 倉庫
git init

# 2. 加入所有檔案 (包含 app.py, requirements.txt, data/)
git add .

# 3. 提交版本
git commit -m "feat: FCCL process optimization dashboard for Streamlit"

# 4. 關聯到您的 GitHub 儲存庫 (請替換為您的倉庫網址)
git branch -M main
git remote add origin https://github.com/您的帳號/您的倉庫名稱.git

# 5. 推送到 GitHub
git push -u origin main`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-950/40">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                GitHub 上傳與 Streamlit Cloud 發佈指南
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready to Deploy
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                專案已生成 <code>app.py</code>、<code>requirements.txt</code> 與 <code>data/</code> 數據庫，可直接推送到 GitHub 並於 Streamlit Cloud 免費發佈！
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-sm text-slate-300">
          {/* Step 1: Git Push */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <h4 className="font-bold text-white text-base">步驟一：上傳專案至 GitHub</h4>
              </div>

              <button
                onClick={handleCopyCmd}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd ? '已複製指令' : '複製 Git 指令'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              請在您的本機電腦終端機（Terminal / PowerShell）進入專案根目錄，執行以下指令：
            </p>

            <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 border border-slate-800 overflow-x-auto">
              {gitCommands}
            </pre>
          </div>

          {/* Step 2: Streamlit Community Cloud */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-red-400" />
                <h4 className="font-bold text-white text-base">步驟二：在 Streamlit Community Cloud 上 1 鍵發佈</h4>
              </div>

              <a
                href="https://share.streamlit.io/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                前往 Streamlit Cloud <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
              <li>以 GitHub 帳號登入 <strong className="text-white">share.streamlit.io</strong>。</li>
              <li>點擊右上角 <strong className="text-white">「New app」</strong> 按鈕。</li>
              <li>
                選擇您的 GitHub Repository，填寫部署資訊：
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-slate-400 font-mono">
                  <li>Branch: <span className="text-sky-300">main</span></li>
                  <li>Main file path: <span className="text-emerald-300">app.py</span></li>
                </ul>
              </li>
              <li>點擊 <strong className="text-white">「Deploy!」</strong>。系統將自動讀取 <code>requirements.txt</code> 安裝相依套件並上線！</li>
            </ol>
          </div>

          {/* Step 3: Local Python Run */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">本地電腦以 Python 啟動 Streamlit 測試：</h4>
            </div>
            <pre className="p-2.5 bg-slate-900 rounded-lg text-xs font-mono text-emerald-300 border border-slate-800">
pip install -r requirements.txt
streamlit run app.py
            </pre>
            <p className="text-[11px] text-slate-400">
              執行後瀏覽器將自動開啟 <code>http://localhost:8501</code>，顯示與本儀表板完全相同的 Plotly 互動剖面、熱圖、SPC 管制圖與調機模擬器。
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            關閉指南
          </button>
        </div>
      </div>
    </div>
  );
};

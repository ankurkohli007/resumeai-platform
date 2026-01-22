import { useState, useEffect, useRef } from "react";
import constant, { buildPresenceChecklist, METRIC_CONFIG } from "../constant.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const RollingScore = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const timer = setInterval(() => {
      start += 1;
      if (start > end) { setCount(end); clearInterval(timer); }
      else { setCount(start); }
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}</span>;
};

function App() {
  const [stage, setStage] = useState("jobDescription"); // "jobDescription" | "upload" | "analysis"
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescError, setJobDescError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [presenceChecklist, setPresenceChecklist] = useState([]);
  const fileInputRef = useRef(null);

  const to100 = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return num <= 10 ? Math.round(num * 10) : Math.round(num);
  };

  const handleJobDescriptionSubmit = () => {
    if (!jobDescription.trim()) {
      setJobDescError("Please paste the job description");
      return;
    }
    if (jobDescription.trim().length < 50) {
      setJobDescError("Job description seems too short. Please provide more details.");
      return;
    }
    setJobDescError("");
    setStage("upload");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { alert("PDF Documents Only."); return; }
    setUploadedFile(file);
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const texts = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
          pdf.getPage(i + 1).then(p => p.getTextContent().then(tc => tc.items.map(it => it.str).join(" ")))
        )
      );
      const text = texts.join("\n").trim();
      setPresenceChecklist(buildPresenceChecklist(text));

      const response = await window.puter.ai.chat(
        [
          { role: "system", content: "Expert AI. Output valid JSON." }, 
          { 
            role: "user", 
            content: constant.ANALYZE_RESUME_PROMPT
              .replace("{{DOCUMENT_TEXT}}", text)
              .replace("{{JOB_DESCRIPTION}}", jobDescription)
          }
        ],
        { model: "gpt-4o" }
      );

      const match = (typeof response === 'string' ? response : response?.message?.content || "").match(/\{[\s\S]*\}/);
      setAnalysis(match ? JSON.parse(match[0]) : {});
      setStage("analysis");
    } catch (err) { 
      alert("Analysis timed out."); 
      setUploadedFile(null); 
    }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden selection:bg-cyan-500/30">
      {stage === "jobDescription" && !isLoading ? (
        /* --- JOB DESCRIPTION STAGE --- */
        <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
          <div className="max-w-4xl w-full space-y-12">
            <header className="text-center space-y-6">
              <p className="text-[10px] font-bold tracking-tesla text-cyan-500 uppercase opacity-80">Next-Gen Career Intelligence Platform</p>
              <h1 className="text-8xl md:text-[120px] font-bold tracking-tighter text-white text-glow-white leading-none">
                Resume<span className="text-white/20">AI</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 font-normal max-w-lg mx-auto leading-relaxed">Precision-engineered scoring for the <span className="text-white">next generation</span> of talent.</p>
            </header>

            <div className="space-y-8">
              <div className="glass-panel rounded-[2.5rem] p-10 md:p-14 border border-white/[0.08]">
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Step 1: Share Job Description</h2>
                  <p className="text-slate-400 text-base">Paste the job description to analyze your resume against specific requirements</p>
                </div>
                
                <div className="space-y-6">
                  <div className="relative">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => {
                        setJobDescription(e.target.value);
                        if (e.target.value.length > 50) setJobDescError("");
                      }}
                      placeholder="Paste the complete job description here... Include title, responsibilities, required skills, experience level, and qualifications."
                      className="w-full h-64 bg-[#080808]/60 border border-white/[0.1] rounded-2xl p-6 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none font-medium"
                    />
                    <div className="absolute right-4 bottom-4 text-xs text-slate-500">
                      {jobDescription.length} characters
                    </div>
                  </div>

                  {jobDescError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
                      <span className="text-rose-400 text-xl mt-0.5">⚠️</span>
                      <p className="text-rose-300 text-sm font-medium">{jobDescError}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleJobDescriptionSubmit}
                      className="flex-1 px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-base font-bold tracking-wide hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
                    >
                      Continue to Resume Upload
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    💡 Pro tip: Copy the entire job posting from LinkedIn, Indeed, or your target company's website
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : stage === "upload" && !isLoading ? (
        /* --- LANDING / UPLOAD STAGE --- */
        <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
          <div className="max-w-6xl w-full text-center space-y-16">
            <header className="space-y-6">
              <div className="inline-block px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-4">
                <p className="text-[10px] font-bold tracking-tesla text-cyan-500 uppercase">Step 2 of 2</p>
              </div>
              <h2 className="text-6xl md:text-7xl font-bold tracking-tighter text-white leading-none">
                Upload Your Resume
              </h2>
              <p className="text-lg md:text-xl text-slate-400 font-normal max-w-lg mx-auto leading-relaxed">We'll analyze it against the job description you provided</p>
            </header>

            <div onClick={() => fileInputRef.current?.click()} className="group relative cursor-pointer mx-auto w-full max-w-2xl">
              <div className="relative h-72 bg-[#080808]/40 backdrop-blur-3xl border border-white/[0.05] rounded-[40px] flex flex-col items-center justify-center gap-8 hover:border-white/20 transition-all duration-700">
                <div className="w-16 h-16 rounded-full border border-white/[0.08] flex items-center justify-center group-hover:bg-white/5 transition-all group-hover:scale-110">
                  <svg className="w-6 h-6 text-white/40 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" /></svg>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-medium text-slate-300">Drop Resume <span className="text-slate-600 font-light">or</span> Browse</p>
                  <p className="text-[9px] text-slate-600 tracking-[0.4em] uppercase font-bold pt-4">PDF Standards Only</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setStage("jobDescription");
                setJobDescription("");
                setUploadedFile(null);
                setAnalysis(null);
              }}
              className="px-8 py-3 rounded-full border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition-all"
            >
              ← Back to Job Description
            </button>

            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>
      ) : isLoading ? (
        /* --- BI-DIRECTIONAL NEURAL SCANNING --- */
        <div className="min-h-screen flex flex-col items-center justify-center space-y-12">
          <div className="relative w-72 h-[1px] bg-white/10 rounded-full overflow-hidden">
            <div className="absolute top-0 h-full bg-cyan-500 shadow-[0_0_25px_#06b6d4] animate-scan-bi" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-[10px] tracking-[0.8em] uppercase text-cyan-500 font-bold ml-[0.8em]">Neural Scanning</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest animate-pulse">Analyzing Resume Against Job Requirements</p>
          </div>
        </div>
      ) : (
        /* --- DASHBOARD --- */
        <div id="printable-report" className="min-h-screen p-6 md:p-12 lg:p-20 max-w-[1500px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 no-print">
            <div className="space-y-2">
              <p className="text-cyan-500 text-[9px] font-bold tracking-tesla uppercase">Analysis Complete</p>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Diagnostic Report</h2>
            </div>
            <div className="flex gap-4">
              <button onClick={() => window.print()} className="px-8 py-3.5 rounded-full border border-white/10 text-white text-[10px] font-bold tracking-widest hover:bg-white hover:text-black transition-all">
                DOWNLOAD REPORT
              </button>
              <button onClick={() => { setStage("jobDescription"); setJobDescription(""); setUploadedFile(null); setAnalysis(null); }} className="px-8 py-3.5 rounded-full bg-cyan-500 text-black text-[10px] font-bold tracking-widest hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
                NEW ANALYSIS
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Score Card */}
            <section className="md:col-span-4 glass-panel rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-bold text-cyan-300 uppercase tracking-wide mb-6">Integrity Score</h3>
              <div className="relative flex items-center justify-center mb-4">
                <div className="text-[120px] font-extrabold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent tracking-tighter leading-none">
                  <RollingScore value={to100(analysis.overallScore)} />
                </div>
                <span className="text-5xl font-bold text-cyan-300 ml-2">%</span>
              </div>
              <p className="text-sm text-slate-400 font-medium">Resume-Job Match Quality</p>
            </section>

            {/* Summary */}
            <section className="md:col-span-8 glass-panel rounded-[2.5rem] p-12 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-blue-300 uppercase tracking-wide mb-8 flex items-center gap-3">
                <span className="text-2xl">📋</span>Executive Summary
              </h3>
              <p className="text-lg md:text-2xl font-medium text-slate-100 leading-relaxed tracking-normal text-justify">
                <span className="text-blue-400 text-2xl mr-2">"</span>
                {analysis.summary}
                <span className="text-blue-400 text-2xl ml-2">"</span>
              </p>
            </section>

            {/* Performance Metrics with Staggered Scale-X Animation */}
            <section className="md:col-span-12">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">PERFORMANCE METRICS</h2>
                <div className="h-1 w-16 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto mt-3 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {METRIC_CONFIG.map((cfg, i) => {
                  const val = to100(analysis.performanceMetrics?.[cfg.key] || 0);
                  return (
                    <div key={i} className="glass-panel rounded-[2rem] p-7 group hover:border-cyan-500/30 transition-all">
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-2xl">{cfg.icon}</span>
                        <span className="text-2xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent tabular-nums">{val}%</span>
                      </div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-5">{cfg.label}</p>
                      <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${val}%`, animationDelay: `${i * 0.1}s` }}
                          className="metric-fill-animated rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Strengths & Improvements */}
            <section className="md:col-span-6 glass-panel rounded-[2.5rem] p-10">
              <h3 className="text-lg font-bold text-cyan-300 uppercase tracking-wide mb-8 flex items-center gap-3">
                <span className="text-2xl">⚡</span>Neural Strengths
              </h3>
              <ul className="space-y-4">
                {analysis.strengths?.map((s, i) => (
                  <li key={i} className="flex gap-4 text-sm text-slate-200 leading-relaxed font-medium">
                    <span className="text-cyan-400 font-bold">→</span> {s}
                  </li>
                ))}
              </ul>
            </section>

            <section className="md:col-span-6 glass-panel rounded-[2.5rem] p-10">
              <h3 className="text-lg font-bold text-rose-300 uppercase tracking-wide mb-8 flex items-center gap-3">
                <span className="text-2xl">🔧</span>Structural Improvements
              </h3>
              <ul className="space-y-4">
                {analysis.improvements?.map((imp, i) => (
                  <li key={i} className="flex gap-4 text-sm text-slate-200 leading-relaxed font-medium">
                    <span className="text-rose-400 font-bold">→</span> {imp}
                  </li>
                ))}
              </ul>
            </section>

            {/* ATS Checklist */}
            <section className="md:col-span-7 glass-panel rounded-[2.5rem] p-10">
              <h3 className="text-lg font-bold text-violet-300 uppercase tracking-wide mb-10 flex items-center gap-3">
                <span className="text-2xl">✓</span>ATS Compatibility Matrix
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                {presenceChecklist.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/[0.05] pb-4 hover:border-violet-500/20 transition-colors">
                    <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                    <span className={`text-xs font-extrabold tracking-wider px-3 py-1 rounded-lg ${item.present ? 'text-cyan-300 bg-cyan-500/10' : 'text-rose-300 bg-rose-500/10'}`}>
                      {item.present ? "✓ FOUND" : "✗ MISSING"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Keywords */}
            <section className="md:col-span-5 glass-panel rounded-[2.5rem] p-10">
              <h3 className="text-lg font-bold text-amber-300 uppercase tracking-wide mb-10 flex items-center gap-3">
                <span className="text-2xl">🔑</span>Neural Keywords
              </h3>
              <div className="flex flex-wrap gap-3">
                {analysis.keywords?.map((k, i) => (
                  <span key={i} className="px-4 py-2.5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-400/30 rounded-full text-xs font-semibold text-amber-200 hover:border-amber-400/60 hover:text-amber-100 transition-all">
                    {k}
                  </span>
                ))}
              </div>
            </section>

            {/* Action Items */}
            <section className="md:col-span-6 glass-panel rounded-[2.5rem] p-10 border-orange-500/10">
              <h3 className="text-lg font-bold text-orange-300 uppercase tracking-wide mb-8 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>Urgent Action Items
              </h3>
              <ul className="space-y-5">
                {analysis.actionItems?.map((item, i) => (
                  <li key={i} className="flex gap-4 text-sm text-slate-200 font-medium">
                    <span className="text-orange-400 font-bold text-lg min-w-fit">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-slate-100">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Pro Tips */}
            <section className="md:col-span-6 glass-panel rounded-[2.5rem] p-10 border-emerald-500/10">
              <h3 className="text-lg font-bold text-emerald-300 uppercase tracking-wide mb-8 flex items-center gap-3">
                <span className="text-2xl">💡</span>Strategic Pro Tips
              </h3>
              <ul className="space-y-5">
                {analysis.proTips?.map((tip, i) => (
                  <li key={i} className="flex gap-4 text-sm text-slate-200 font-medium leading-relaxed">
                    <span className="text-emerald-400 font-bold text-lg min-w-fit">✨</span>
                    <span className="text-slate-100">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
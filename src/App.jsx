import { useState, useEffect, useRef } from "react";
import constant, { buildPresenceChecklist, METRIC_CONFIG } from "../constant.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [aiReady, setAiReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [presenceChecklist, setPresenceChecklist] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const waitForPuter = async () => {
      try {
        let attempts = 0;
        while (!window.puter && attempts < 100) {
          await new Promise(resolve => setTimeout(resolve, 300));
          attempts++;
        }
        if (!window.puter) return;
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (window.puter?.ai?.chat) {
          setAiReady(true);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (window.puter?.ai?.chat) setAiReady(true);
        }
      } catch (error) {
        console.error("Puter loading error:", error);
      }
    };
    waitForPuter();
  }, []);

  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((page) =>
          page.getTextContent().then((tc) => tc.items.map((it) => it.str).join(" "))
        )
      )
    );
    return texts.join("\n").trim();
  };

  const parseJSONResponse = (reply) => {
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      if (!parsed.overallScore && !parsed.error) throw new Error("Invalid AI response");
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  };

  const analyzeResume = async (text) => {
    const prompt = constant.ANALYZE_RESUME_PROMPT.replace("{{DOCUMENT_TEXT}}", text);
    if (!window.puter?.ai?.chat) throw new Error("Puter AI is not available.");
    const response = await window.puter.ai.chat(
      [
        { role: "system", content: "You are an expert resume reviewer....." },
        { role: "user", content: prompt },
      ],
      { model: "gpt-4o" }
    );
    const result = parseJSONResponse(typeof response === "string" ? response : response?.message?.content || "");
    if (result.error) throw new Error(result.error);
    return result;
  };

  const reset = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.puter?.ai?.chat) {
      alert("Puter AI is still loading. Please wait a moment and try again.");
      return;
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert("Only PDF file is acceptable");
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    setAnalysis(null);
    setPresenceChecklist([]);
    setResumeText("");

    try {
      const text = await extractPDFText(file);
      setResumeText(text);
      setPresenceChecklist(buildPresenceChecklist(text));

      if (!window.puter?.ai?.chat) {
        setAnalysis({
          overallScore: "0",
          summary: "AI is not ready. PDF text was extracted successfully.",
          strengths: [],
          improvements: [],
          actionItems: [],
          proTips: [],
          keywords: [],
          performanceMetrics: {},
        });
        return;
      }

      const aiResult = await analyzeResume(text);
      setAnalysis({
        overallScore: aiResult.overallScore ?? "0",
        summary: aiResult.summary ?? "",
        strengths: aiResult.strengths ?? [],
        improvements: aiResult.improvements ?? [],
        actionItems: aiResult.actionItems ?? [],
        proTips: aiResult.proTips ?? [],
        keywords: aiResult.keywords ?? [],
        performanceMetrics: aiResult.performanceMetrics ?? {},
      });
    } catch (err) {
      alert(`Error: ${err.message}`);
      reset();
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const scoreColor = (score) => {
    const s = parseInt(score);
    if (s >= 8) return { bg: "from-green-500 to-emerald-600", text: "text-green-400" };
    if (s >= 6) return { bg: "from-blue-500 to-cyan-600", text: "text-blue-400" };
    return { bg: "from-orange-500 to-red-600", text: "text-orange-400" };
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-black opacity-90"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {!uploadedFile && !isLoading ? (
        // Upload Screen
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full space-y-8">
            {/* Hero Section */}
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-7xl md:text-8xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    ResumeAI
                  </span>
                </h1>
                <p className="text-xl text-slate-400 font-light">
                  Your ATS Score in seconds
                </p>
              </div>
              <p className="text-sm text-slate-500 uppercase tracking-widest">AI-Powered Resume Analysis</p>
            </div>

            {/* Upload Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              
              <div className="relative bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 transition-all duration-500 group-hover:border-cyan-500/30 group-hover:from-slate-800/60 group-hover:to-slate-900/60">
                <div className="flex flex-col items-center justify-center space-y-6">
                  {/* Upload Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                    <svg
                      className="relative w-24 h-24 text-cyan-400 group-hover:scale-110 group-hover:text-cyan-300 transition-all duration-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>

                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold">Upload Your Resume</h2>
                    <p className="text-slate-400">Drag and drop or click to select your PDF</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
                    <span>PDF files only • Max 10MB</span>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {!aiReady && (
              <p className="text-center text-sm text-amber-500 animate-pulse">⏳ Initializing AI...</p>
            )}
          </div>
        </div>
      ) : isLoading ? (
        // Loading Screen
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-20 animate-spin"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-10"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Analyzing Your Resume</h2>
              <p className="text-slate-400 text-sm">Using advanced AI to evaluate your qualifications...</p>
            </div>
          </div>
        </div>
      ) : analysis && uploadedFile ? (
        // Results Screen
        <div className="min-h-screen py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header with Reset */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold">Analysis Results</h1>
                <p className="text-slate-400 text-sm">{uploadedFile.name}</p>
              </div>
              <button
                onClick={reset}
                className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all duration-300 text-sm font-medium"
              >
                Analyze Another
              </button>
            </div>

            {/* Score Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">Your ATS Score</p>
                    <div className={`text-8xl font-black bg-gradient-to-r ${scoreColor(analysis.overallScore).bg} bg-clip-text text-transparent`}>
                      {analysis.overallScore}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {parseInt(analysis.overallScore) >= 8 ? "Excellent • Ready to apply" : parseInt(analysis.overallScore) >= 6 ? "Good • Consider improvements" : "Needs work • Follow recommendations"}
                    </p>
                  </div>

                  {/* Progress Ring */}
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="2" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#grad)"
                        strokeWidth="2"
                        strokeDasharray={`${(parseInt(analysis.overallScore) / 10) * 283} 283`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease-out' }}
                      />
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#0EA5E9" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-cyan-400">
                      {analysis.overallScore}/10
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-green-500/30 rounded-2xl p-8 transition-all duration-500 space-y-4">
                  <h3 className="text-lg font-bold text-green-400">Strengths</h3>
                  <div className="space-y-3">
                    {(analysis?.strengths || []).slice(0, 3).map((strength, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <p className="text-slate-300 text-sm">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Improvements */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-amber-500/30 rounded-2xl p-8 transition-all duration-500 space-y-4">
                  <h3 className="text-lg font-bold text-amber-400">Areas to Improve</h3>
                  <div className="space-y-3">
                    {(analysis?.improvements || []).slice(0, 3).map((imp, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-amber-400 mt-0.5">→</span>
                        <p className="text-slate-300 text-sm">{imp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-purple-500/30 rounded-2xl p-8 transition-all duration-500 space-y-4">
                <h3 className="text-lg font-bold">Summary</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {METRIC_CONFIG.map((cfg, i) => {
                const value = analysis?.performanceMetrics?.[cfg.key] ?? cfg.defaultValue;
                return (
                  <div key={i} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className="text-2xl font-bold text-cyan-400">{value}</span>
                      </div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{cfg.label}</p>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out"
                          style={{ width: `${(value / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ATS Checklist */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-violet-500/30 rounded-2xl p-8 transition-all duration-500 space-y-4">
                <h3 className="text-lg font-bold">ATS Compatibility</h3>
                <div className="space-y-2">
                  {(presenceChecklist || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={item.present ? "text-green-400" : "text-red-400"}>
                        {item.present ? "✓" : "✗"}
                      </span>
                      <span className="text-slate-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Keywords */}
            {(analysis?.keywords || []).length > 0 && (
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-blue-500/30 rounded-2xl p-8 transition-all duration-500 space-y-4">
                  <h3 className="text-lg font-bold">Recommended Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis?.keywords || []).map((k, i) => (
                      <span key={i} className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 transition-all duration-300">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
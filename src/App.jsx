import { useState, useEffect, useRef } from "react";
import "./App.css";
import constant, {
  buildPresenceChecklist,
  METRIC_CONFIG,
} from "../constant.js";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

console.log("PDF Worker URL:", pdfjsWorker);

function App() {
  // to keep track of AI is ready or not
  const [aiReady, setAiReady] = useState(false);
  // to use loading spinner on UI when app is loading something
  const [isLoading, setIsLoading] = useState(false);
  // to handle uploading of a pdf file
  const [uploadedFile, setUploadedFile] = useState(null);
  // to handle Analysis done by AI
  const [analysis, setAnalysis] = useState(null);
  // to handle extracted text from the pdf
  const [resumeText, setResumeText] = useState("");
  // to handle the checklist of the section and help the AI to create the score for the resume
  const [presenceChecklist, setPresenceChecklist] = useState([]);
  // NEW: to track Puter initialization status
  const [puterInitialized, setPuterInitialized] = useState(false);

  // to check AI and Puter is loaded into the page
  useEffect(() => {
    const waitForPuter = async () => {
      try {
        // Wait for Puter SDK to be available globally
        let attempts = 0;
        const maxAttempts = 100; // ~30 seconds

        while (!window.puter && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300));
          attempts++;
        }

        if (!window.puter) {
          console.error("Puter SDK failed to load after waiting");
          return;
        }

        console.log("✅ Puter SDK loaded successfully");
        setPuterInitialized(true);

        // Wait a bit more for AI to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if AI is available
        if (window.puter?.ai?.chat) {
          console.log("✅ AI chat is available");
          setAiReady(true);
        } else {
          console.warn("⚠️ AI chat not yet available, retrying in 2 seconds...");
          // Retry checking for AI after a delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (window.puter?.ai?.chat) {
            console.log("✅ AI chat is now available");
            setAiReady(true);
          } else {
            console.error("❌ AI chat unavailable even after retry");
          }
        }
      } catch (error) {
        console.error("❌ Puter loading error:", error);
      }
    };

    waitForPuter();
  }, []);

  const fileInputRef = useRef(null);

  // function to extract the text from pdf using pdfjs-dist
  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((page) =>
          page
            .getTextContent()
            .then((tc) => tc.items.map((it) => it.str).join(" "))
        )
      )
    );

    return texts.join("\n").trim();
  };

  // helper function to parse JSON response from AI
  const parseJSONResponse = (reply) => {
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};

      if (!parsed.overallScore && !parsed.error) {
        throw new Error("Invalid AI response");
      }
      return parsed;
    } catch (err) {
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  };

  // analyze resume
  const analyzeResume = async (text) => {
    const prompt = constant.ANALYZE_RESUME_PROMPT.replace(
      "{{DOCUMENT_TEXT}}",
      text
    );

    // SAFETY: if puter not loaded, throw a clear error
    if (!window.puter?.ai?.chat) {
      throw new Error("Puter AI is not available. Please refresh the page and try again.");
    }

    const response = await window.puter.ai.chat(
      [
        { role: "system", content: "You are an expert resume reviewer....." },
        { role: "user", content: prompt },
      ],
      {
        model: "gpt-4o",
      }
    );

    const result = parseJSONResponse(
      typeof response === "string" ? response : response?.message?.content || ""
    );

    if (result.error) throw new Error(result.error);
    return result;
  };

  // reset()
  const reset = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
    setIsLoading(false);
  };

  // handling uploaded file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if Puter is available
    if (!window.puter?.ai?.chat) {
      alert("Puter AI is still loading. Please wait a moment and try again.");
      return;
    }

    // SAFER PDF CHECK (file.type can be empty sometimes)
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      alert("Only PDF file is acceptable");
      return;
    }

    // reset states for new run
    setUploadedFile(file);
    setIsLoading(true);
    setAnalysis(null);
    setPresenceChecklist([]);
    setResumeText("");

    try {
      // 1) extract text always (independent of AI)
      const text = await extractPDFText(file);
      setResumeText(text);

      // 2) build checklist based on extracted text
      setPresenceChecklist(buildPresenceChecklist(text));

      // 3) only run AI if ready
      if (!window.puter?.ai?.chat) {
        alert(
          "AI is not ready (Puter SDK not loaded). PDF was loaded, but analysis cannot run."
        );

        // OPTIONAL: set a placeholder analysis so UI can still render
        setAnalysis({
          overallScore: "0",
          summary:
            "AI is not ready. PDF text was extracted successfully, but analysis is unavailable.",
          strengths: [],
          improvements: [],
          actionItems: [],
          proTips: [],
          keywords: [],
          performanceMetrics: {},
        });

        return;
      }

      // AI analysis of resume
      const aiResult = await analyzeResume(text);

      // Ensure arrays exist so UI never crashes
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
      // allow re-uploading the same file (important UX detail)
      e.target.value = "";
    }
  };

  // UI

  return (
    <div className="min-h-screen bg-main-gradient p-6 lg:p-12 flex items-center justify-center selection:bg-cyan-500/30">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent mb-4">
            ResumeAI
          </h1>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-400/50"></span>
            <p className="text-cyan-400 uppercase tracking-[0.5em] text-[10px] sm:text-xs font-bold">
              Neural Analysis
            </p>
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-cyan-400/50"></span>
          </div>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed px-4">
            Get an <span className="text-white font-medium">instant ATS score</span>{" "}
            using our advanced intelligence engine.
          </p>
          {/* NEW: Show status */}
          {!aiReady && (
            <p className="text-orange-400 text-sm mt-4">⏳ Loading AI... Please wait (checking if AI is ready...)</p>
          )}
          {aiReady && (
            <p className="text-green-400 text-sm mt-4">✅ AI is ready! You can upload your resume</p>
          )}
        </div>

        {/* Upload Section */}
        {!uploadedFile && (
          <div className="relative group p-[1px] rounded-[2.5rem] bg-gradient-to-b from-slate-700/50 to-transparent hover:from-cyan-500/50 transition-all duration-700 overflow-hidden shadow-2xl">
            <div className="bg-[#030712]/90 backdrop-blur-3xl rounded-[2.4rem] relative z-10">
              <div className="flex flex-col items-center justify-center cursor-pointer py-24 px-6 overflow-hidden">
                {/* Icon - Now Clickable */}
                <div 
                  className="relative mb-14 cursor-pointer transition-transform duration-300 hover:scale-110"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Icon clicked for upload");
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <div className="absolute inset-[-35px] pointer-events-none rounded-full border border-white/5 group-hover:border-cyan-500/20 group-hover:scale-110 transition-all duration-700"></div>

                  <svg
                    width="120"
                    height="120"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative transition-all duration-700 group-hover:scale-105"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      stroke="white"
                      strokeOpacity="0.1"
                      strokeWidth="0.5"
                    />

                    <path
                      d="M35 65V68C35 69.1046 35.8954 70 37 70H63C64.1046 70 65 69.1046 65 68V65"
                      stroke="white"
                      strokeOpacity="0.4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />

                    <g className="group-hover:-translate-y-3 transition-transform duration-500 ease-out">
                      <path
                        d="M50 60V30M50 30L42 38M50 30L58 38"
                        stroke="#22D3EE"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_12px_rgba(34,211,238,1)]"
                      />
                    </g>
                  </svg>
                </div>

                <h2 className="text-4xl sm:text-5xl font-extralight tracking-tight text-white mb-10 transition-all duration-500 group-hover:tracking-normal">
                  Upload <span className="text-cyan-400 font-medium">Resume</span>
                </h2>

                <div className="px-10 py-5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md group-hover:border-cyan-500/30 group-hover:bg-cyan-500/[0.02] transition-all duration-700">
                  <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap flex items-center gap-5">
                    <span className="group-hover:text-slate-200 transition-colors">
                      PDF files only
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
                    <span className="group-hover:text-cyan-300 transition-colors duration-500">
                      Get Instant Analysis of your resume
                    </span>
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Upload button clicked, fileInputRef:", fileInputRef.current);
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={!aiReady}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      !aiReady 
                        ? "opacity-50 cursor-not-allowed bg-slate-600 text-slate-400" 
                        : "bg-cyan-500 text-white hover:bg-cyan-600 cursor-pointer"
                    }`}
                  >
                    Choose PDF File from Device
                  </button>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="p-6 sm:p-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="loading-spinner"></div>
              <h3 className="text-lg sm:text-xl text-slate-200 mb-2">
                Analyzing Your Resume
              </h3>
              <p className="text-slate-400 text-sm sm:text-base">
                Please wait while AI reviews your resume.....
              </p>
            </div>
          </div>
        )}

        {/* Analysis Screen */}
        {analysis && uploadedFile && (
          <div className="space-y-6 p-4 sm:px-8 lg:px-16">
            <div className="file-info-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="icon-container-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                    <span className="text-3xl"> 📄 </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-green-500 mb-1">
                      Analysis Complete
                    </h3>
                    <p className="text-slate-300 text-sm break-all">
                      {uploadedFile.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={reset} className="btn-secondary">
                    New Analysis 🔍
                  </button>
                </div>
              </div>
            </div>

            {/* Score Card */}
            <div className="score-card">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl"> 🏆 </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Overall ATS Score
                  </h2>
                </div>

                <div className="relative">
                  <p className="text-6xl sm:text-8xl font-extrabold text-cyan-400 drop-shadow-lg">
                    {analysis.overallScore || "0"}
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${parseInt(analysis.overallScore) >= 8
                    ? "score-status-excellent"
                    : parseInt(analysis.overallScore) >= 6
                      ? "score-status-good"
                      : "score-status-needs-improvement"
                    }`}
                >
                  <span className="text-lg">
                    {parseInt(analysis.overallScore) >= 8
                      ? "💎"
                      : parseInt(analysis.overallScore) >= 6
                        ? "🔷"
                        : "🔹"}
                  </span>
                  <span className="font-semibold text-lg">
                    {parseInt(analysis.overallScore) >= 8
                      ? "Excellent"
                      : parseInt(analysis.overallScore) >= 6
                        ? "Good"
                        : "Needs Improvement"}
                  </span>
                </div>
              </div>

              <div className="progress-bar">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${parseInt(analysis.overallScore) >= 8
                    ? "progress-execellent"
                    : parseInt(analysis.overallScore) >= 6
                      ? "progress-good"
                      : "progress-needs-improvement"
                    }`}
                  style={{
                    width: `${(parseInt(analysis.overallScore || "0") / 10) * 100}%`,
                  }}
                ></div>
              </div>

              <p className="text-slate-400 text-sm mt-3 text-center font-medium">
                Score based on content quality, formatting, and keyword usage
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="feature-card-green group">
                <div className="bg-green-500/20 icon-container-lg mx-auto mb-3 group-hover:bg-green-400/30 transition-colors">
                  <span className="text-green-300 text-xl"> ✔️ </span>
                </div>
                <h4 className="text-green-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Top Strength
                </h4>
                <div className="space-y-2 text-left">
                  {(analysis?.strengths || []).slice(0, 3).map((strength, index) => (
                    <div key={index} className="list-item-green">
                      <span className="text-green-400 text-sm mt-0.5">●</span>
                      <span className="text-slate-200 font-medium text-sm leading-relaxed">
                        {strength}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="feature-card-orange group">
                <div className="bg-orange-500/20 icon-container-lg mx-auto mb-3 group-hover:bg-green-400/30 transition-colors">
                  <span className="text-orange-300 text-xl"> ⚡ </span>
                </div>
                <h4 className="text-orange-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Improvements
                </h4>
                <div className="space-y-2 text-left">
                  {(analysis?.improvements || []).slice(0, 3).map((imp, index) => (
                    <div key={index} className="list-item-orange">
                      <span className="text-orange-400 text-sm mt-0.5">●</span>
                      <span className="text-slate-200 font-medium text-sm leading-relaxed">
                        {imp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-4">
                <div className="icon-container bg-purple-500/20">
                  <span className="text-purple-300 text-lg"> 📋 </span>
                </div>
                <h4 className="text-xl font-bold text-white">Executive Summary</h4>
              </div>
              <div className="summary-box">
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-cyan-500/20">
                  <span className="text-cyan-300 text-lg"> 📊 </span>
                </div>
                <h4 className="text-xl font-bold text-white">Perfomance Metrics</h4>
              </div>

              <div className="space-y-4">
                {METRIC_CONFIG.map((cfg, i) => {
                  const value =
                    analysis?.performanceMetrics?.[cfg.key] ?? cfg.defaultValue;

                  return (
                    <div key={i} className="group/item">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cfg.icon}</span>
                          <p className="text-slate-200 font-medium">{cfg.label}</p>
                        </div>
                        <span className="text-slate-300 font-bold">{value}/10</span>
                      </div>

                      <div className="progress-bar-small">
                        <div
                          className={`h-full bg-gradient-to-r ${cfg.colorClass} rounded-full transition-all duration-1000 ease-out group-hover/item:shadow-lg ${cfg.shadowClass}`}
                          style={{ width: `${(value / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ATS Optimization */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-violet-500/20">
                  <span className="text-lg"> 🤖 </span>
                </div>
                <h2 className="text-violet-300 font-bold text-xl">ATS Optimization</h2>
              </div>

              <div className="info-box-violet mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div>
                    <h3 className="text-violet-300 font-semibold mb-2">
                      What is ATS?
                    </h3>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      ATS, or Applicant Tracking System, is software used by companies to
                      manage the hiring process by collecting, sorting, and filtering
                      resumes automatically. It scans applications for keywords, ranks
                      candidates, and tracks their progress.
                    </p>
                  </div>
                </div>
              </div>

              <div className="info-box-violet">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-violet-300 text-lg"> 🤖 </span>
                  <h3 className="text-violet-300 font-semibold text-lg">
                    ATS Compatibilty Checklist
                  </h3>
                </div>

                <div className="space-y-2">
                  {(presenceChecklist || []).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-slate-200"
                    >
                      <span
                        className={item.present ? "text-emerald-400" : "text-red-400"}
                      >
                        {item.present ? "✅️" : "❌"}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Keywords */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-blue-500/20">
                  <span className="text-lg"> 🔑 </span>
                </div>

                <h2 className="text-blue-400 font-bold text-xl">
                  Recommended Keywords
                </h2>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                {(analysis?.keywords || []).map((k, i) => (
                  <span key={i} className="keyword-tag group/item">
                    {k}
                  </span>
                ))}
              </div>

              <div className="info-box-blue">
                <p className="text-slate-300 text-sm leading-relaxed items-start gap-2">
                  <span className="text-lg mt-0.5"> 💡 </span>
                  Consider incorporating these keywords naturally into your resume to
                  improve ATS compatibility and increase your chances of getting noticed by
                  recruiters.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
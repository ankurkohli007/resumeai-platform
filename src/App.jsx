import { useState, useEffect } from 'react'
import './App.css'
import constant, {
  // checklist pass to AI and visualize score
  buildPresenceChecklist,
  // to create visual analysize and pass this checklist to AI using the buildPresenceChecklist
  METRIC_CONFIG,
} from "../constant.js";
import * as pdfjsLib from "pdfjs-dist";
// because extracting text from pdf is a heavy job and it makes app heavy and slower
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;


// FUNCTIONALITY OF WEBSITE


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


  // to check AI is loaded into the page
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setAiReady(true);
        clearInterval(interval);
      }
    }, 300);
    // after the above check cleanup the effect by using clearInterval
    return () => clearInterval(interval);
  }, [])

  // function to extract the text from pdf using pdfjs-dist
  // async function ebacuse we don't know how much it will take to extract the etxt from the pdf
  const extractPDFText = async (file) => {
    // first convert pdf into a format which is readable for pdfjs
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data:
        arrayBuffer
    }).promise // pdfjs to take the file as a arrayBuffer and use promise because don't know the time taken to read the pdf file

    const texts = await Promise.all(
      // extract every single text from the uploaded pdf; use Promise.all to avoid the slow functionality of the app for this create an array of the length of uploaded pdf; than calculate no of pages and extract the text content and map it into a string and join all the extracted text
      Array.from({ length: pdf.numPages }, (_, i) => pdf.
        getPage(i + 1)).then(
          (page) =>
            page
              .getTextontent()
              .then((tc) => tc.items.map((i) => i.str).join(" "))
        )
    );
    // finally join all pages together after extracting texts from it
    return texts.join("\n").trim();
  };

  // helper function which will pass the JSON response, which will going handle the reply received from the AI
  const parseJSONResponse = (reply) => {
    try {
      // /\[\s\S]*\}/ => {JSON format in this braces} [check for string]; basically to check the JSON like object
      const match = reply.match(/\[\s\S]*\}/);
      // if there is match convert JSON object
      const parsed = match ? JSON.parse(match[0]) : {};
      // to check correct information in the response
      if (!parsed.overallScore && !parsed.error) {
        throw new Error("Invalid AI response");
      }
      return parsed;
    } catch (error) {
      throw new Error(`Falied to parse AI response: ${err.message}`);
    }
  };

  // analyze resume
  const analyzeResume = async (text) => {
    // prompt from the contant.js
    const prompt = constant.ANALYZE_RESUME_PROMPT.replace(
      // information from the uploaded file 
      "{{DOCUMENT_TEXT}}",
      // text of resume
      text
    );
    // response send to AI
    const response = await window.puter.ai.chat(
      // create chat structure
      [
        { role: "system", content: "You are an expert resume reviewer....." },
        { role: "user", content: prompt },
      ],
      {
        // define the model to be use
        model: "gpt-4o",
      }
    );

    // check result
    const result = parseJSONResponse(
      typeof response === "string" ? response : response.
        message?.content || ""
    );
    if (result.error) throw new Error(result.error);
    return result;
  };

  // handling uploaded file
  const handleFileUpload = async (e) => {
    // get the file uploaded by user
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      return alert("Only PDF file is acceptable");
    }

    // below resetting some state varaibles

    // passes to the state variable
    setUploadedFile(file);
    // text extraction process in the loading state
    setIsLoading(true);
    // reset analysis if analysis left from the porevious one
    setAnalysis(null);
    // check the check list
    setPresenceChecklist([]);

    try {
      // extract text from pdf
      const text = await extractPDFText(file);
      // store the extracted text inside resumeText
      setResumeText(text);
      // use checkList from the pdf file uploaded
      setPresenceChecklist(buildPresenceChecklist(text));
      // analysis of Resume
      setAnalysis(await analyzeResume(text));
    } catch (err) {
      alert(`Error ${err.message}`);
      reset();
    } finally {
      // when it's done setting loading to false
      setIsLoading(false);
    }
  };

  // reset()
  const reset = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
  }


  // UI


  return (
    <div className="min-h-screen bg-main-gradient p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className='max-w-5xl mx-auto w-full'>

        {/* Header Section */}
        <div className='text-center mb-6'>
          <h1 className='text-5xl sm:text-6xl lg:text-7xl font-light bg-gradient-to-r from-cyan-300 via-teal-200 to-sky-300 bg-clip-text text-transpoarent mb-2'>ResumeAI — Resume Intelligence</h1>
          <p className='text-slate-300 text-sm sm:text-base'>Upload your resume in pdf format and get an instant ATS score</p>
        </div>

        {/* Upload Section - Note the 'group' class is added here manually */}
        {!uploadedFile && (
          <div className="upload-area group">
            <div className='upload-zone'>
              <div className='group flex items-center gap-4 text-4xl sm:text-5xl lg:text-6xl mb-4 cursor-pointer'>
                {/* Elegant Refined SVG */}
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-300 group-hover:-translate-y-1"
                >
                  {/* Soft File Background */}
                  <path
                    d="M18 8H38L50 20V52C50 54.2091 48.2091 56 46 56H18C15.7909 56 14 54.2091 14 52V12C14 9.79086 15.7909 8 18 8Z"
                    fill="#F8FAFC"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                  />
                  {/* Folded Corner Detail */}
                  <path
                    d="M38 8V20H50"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Animated Upload Arrow */}
                  <path
                    d="M32 40V24M32 24L26 30M32 24L38 30"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300 group-hover:stroke-indigo-700"
                  />
                  {/* Clean JSX Badge */}
                  <rect x="22" y="44" width="20" height="8" rx="2" fill="#4F46E5" />
                  <text x="32" y="50" fontSize="5" fontWeight="bold" textAnchor="middle" fill="white" style={{ fontFamily: 'sans-serif' }}>JSX</text>
                </svg>

                <span className="font-semibold tracking-tight text-gray-800 transition-colors group-hover:text-indigo-600">
                  Upload File
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=210&text=ResumiAI&fontAlign=50&fontAlignY=35&desc=Next-Gen%20Career%20Intelligence%20Platform&descAlign=50&descAlignY=58" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=16&pause=1200&center=true&vCenter=true&width=720&lines=AI-assisted+Resume+Analyzer;Semantic+Resume+%E2%86%94+Job+Description+Matching;ATS-focused+feedback+%7C+Skill+gap+analysis+%7C+GenAI+insights;Built+with+React+%2B+Tailwind+%2B+Puter.js" />

<br/>

<img src="https://img.shields.io/badge/React-Vite-0b1320?logo=react" />
<img src="https://img.shields.io/badge/TailwindCSS-0b1320?logo=tailwindcss" />
<img src="https://img.shields.io/badge/Puter.js-0b1320?logo=icloud" />
<img src="https://img.shields.io/badge/Deployment-GitHub%20Pages-0b1320?logo=github" />

<br/><br/>

<b>ResumiAI</b> is a cost-efficient, AI-assisted resume analysis platform designed to generate ATS-style insights without relying on expensive NLP pipelines or enterprise-only infrastructure.

</div>

---

## 🚀 Overview

Everyone talks about ATS optimization, but very few talk about how **expensive, opaque, and inaccessible** most ATS tools actually are.

**ResumiAI** was built as a practical alternative — combining a modern frontend stack with GenAI-powered analysis to help candidates and small teams understand how resumes are evaluated *before* they are filtered out.

---

## ✨ Key Features

- Resume upload and parsing (PDF)
- Job description input and analysis
- Semantic resume ↔ job description matching
- ATS-focused feedback and keyword coverage
- Skill gap identification
- GenAI driven improvement suggestions
- Cost efficient architecture (no heavy NLP pipelines)
- Clean, responsive UI built for clarity

---

## 🚀 Live Demo of SkyScope WeatherApp
Check out the live version of this weather app: [Click here for resume analysis](https://ankurkohli007.github.io/resumeai-platform/)
---

## 🛠 Tech Stack

### Frontend
- **React.js (Vite)** – UI development and state management  
- **Tailwind CSS** – Responsive, utility-first styling  

### Cloud & Integration
- **Puter.js** – Cloud storage, file handling, and GenAI integration layer  

### AI & Analysis
- Semantic text comparison (resume vs job description)
- GenAI-based feedback and improvement suggestions

### Utilities
- PDF text extraction using modern browser-friendly libraries

---

## 🧠 How It Works

```text
User uploads resume + job description
            |
            v
React UI handles input & visualization
            |
            v
Puter.js manages file storage & AI calls
            |
            v
Resume text extraction + semantic analysis
            |
            v
GenAI generates insights & suggestions
            |
            v
ATS-style scores and feedback shown in UI
```

### 📁 Project Structure

```text
resumeai-platform/
│
├── public/
├── src/
│   ├── components/
│   ├── constants/
│   ├── App.jsx
│   └── main.jsx
│
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

### ▶️ Getting Started

**1. Clone the repository**
```
git clone https://github.com/ankurkohli007/resumeai-platform.git
cd resumeai-platform
```

**2. Install dependencies**
```
npm install
```

**3. Run the application**
```
npm run dev
```

**Note:** Open the local URL shown in the terminal (usually http://localhost:5173).

### 🌐 Deployment

The project is configured for deployment using **GitHub Pages**.

```
npm run build
```

The production build is generated inside the ```dist/``` folder and deployed via the ```gh-pages``` branch.

### 🎯 Design Philosophy

- Focus on explainability, not black-box scoring
- Prefer cost-efficient AI integration over heavy infrastructure
- Build tools usable by individuals and small teams, not only enterprises
- Treat resume rejection as a problem statement, not just an outcome

### 🛣 Roadmap

- DOCX resume support
- Role based skill weighting
- Downloadable analysis reports
- Resume version comparison
- Multi job profile analysis

### 👤 Author
Ankur Kohli
Software Engineer | AI-Integrated Systems


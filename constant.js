const constants = {
    ANALYZE_RESUME_PROMPT: `You are an expert resume and job description analyst.
First, verify that the document provided is actually a resume:
- Look for professional experience, work history, or employment information
- Check for education background, degrees, or academic information  
- Verify skills, qualifications, or professional competencies
- Confirm contact information and personal details

If this is NOT a resume, respond with:
{
  "error": "This document does not appear to be a resume. Please upload a proper resume containing professional experience, education, and skills sections."
}

If this IS a resume, analyze it thoroughly against the provided job description/requirements and provide comprehensive feedback in this JSON format:
{
  "overallScore": "X/10",
  "strengths": [
    "strength 1", 
    "strength 2", 
    "strength 3"
  ],
  "improvements": [
    "improvement 1", 
    "improvement 2", 
    "improvement 3"
  ],
  "keywords": [
    "keyword 1", 
    "keyword 2", 
    "keyword 3"
  ],
  "summary": "Brief overall assessment comparing resume to job requirements",
  "performanceMetrics": {
    "formatting": X,
    "contentQuality": X,
    "keywordUsage": X,
    "atsCompatibility": X,
    "quantifiableAchievements": X
  },
  "actionItems": [
    "specific actionable item 1",
    "specific actionable item 2", 
    "specific actionable item 3"
  ],
  "proTips": [
    "professional tip 1",
    "professional tip 2",
    "professional tip 3"
  ]
}

IMPORTANT - RATING GUIDELINES:

Rate performanceMetrics 1-10 based on how well the resume matches the job requirements:

- formatting (1-10): Layout clarity, structure, visual appeal, consistency. Is the resume well-organized and easy to read? Does it have clear sections? Professional appearance?

- contentQuality (1-10): How well does resume experience align with job requirements? Do achievements and responsibilities match what the job asks for? Is content relevant and complete?

- keywordUsage (1-10): Extract ALL technical skills and keywords from the job description, then check if they appear in the resume. Look for:
  * Programming languages mentioned (React, Vue.js, JavaScript, TypeScript, etc.)
  * Frameworks and tools (Jest, React Testing Library, Cypress, Playwright, Git, etc.)
  * Methodologies (Agile, Scrum, WCAG accessibility, responsive design, etc.)
  * Give higher score if more keywords are present, lower if many are missing

- atsCompatibility (1-10): Is resume optimized for ATS parsing? Check for:
  * Standard section headers (Experience, Education, Skills, Summary)
  * Clean formatting without graphics/tables
  * Presence of job keywords naturally integrated
  * Action verbs at start of bullet points
  * Contact info clearly visible
  * Avoid complex layouts that confuse ATS

- quantifiableAchievements (1-10): Does resume include metrics and numbers? Look for:
  * Percentages, dollar amounts, team sizes
  * Performance improvements shown with numbers
  * Project scopes with measurable results
  * "Increased by X%", "Led team of X", "Reduced time by X%" etc.
  * Higher score if multiple quantified achievements, lower if none or very few

For summary, explicitly mention:
- Overall fit for this job (good/moderate/poor match)
- Key strengths relative to job requirements
- Critical missing skills from job description
- Whether resume highlights required experience

For actionItems, provide specific changes to improve resume for THIS job:
- "Add X skill to skills section (mentioned in job posting)"
- "Highlight X project that uses Y technology from job requirements"
- "Reword experience to emphasize X responsibility mentioned in job"
- "Add quantified metrics to show impact in Y area"
- "Incorporate X framework/tool mentioned in job posting"

For proTips, give targeted advice:
- How to better position experience for this role
- Industry-specific terminology to incorporate
- How to structure resume for this type of position
- What hiring managers look for in this role

RESUME TEXT:
{{DOCUMENT_TEXT}}

JOB DESCRIPTION/REQUIREMENTS:
{{JOB_DESCRIPTION}}`,
};

export const METRIC_CONFIG = [
    {
        key: "formatting",
        label: "Formatting",
        defaultValue: 7,
        colorClass: "from-emerald-400 to-emerald-500",
        shadowClass: "group-hover/item:shadow-emerald-500/30",
        icon: "🎨",
    },
    {
        key: "contentQuality",
        label: "Content Quality",
        defaultValue: 6,
        colorClass: "from-blue-400 to-blue-500",
        shadowClass: "group-hover/item:shadow-blue-500/30",
        icon: "📝",
    },
    {
        key: "atsCompatibility",
        label: "ATS Compatibility",
        defaultValue: 6,
        colorClass: "from-violet-400 to-violet-500",
        shadowClass: "group-hover/item:shadow-violet-500/30",
        icon: "🤖",
    },
    {
        key: "keywordUsage",
        label: "Keyword Usage",
        defaultValue: 5,
        colorClass: "from-purple-400 to-purple-500",
        shadowClass: "group-hover/item:shadow-purple-500/30",
        icon: "🔍",
    },
    {
        key: "quantifiableAchievements",
        label: "Quantified Results",
        defaultValue: 4,
        colorClass: "from-orange-400 to-orange-500",
        shadowClass: "group-hover/item:shadow-orange-500/30",
        icon: "📊",
    },
];

export const buildPresenceChecklist = (text) => {
    const hay = (text || "").toLowerCase();
    return [
        {
            label: "Standard Section Headings",
            present:
                /experience|education|skills|summary|objective|work history|professional experience|employment/.test(
                    hay
                ),
        },
        {
            label: "Contact Information",
            present: /email|phone|linkedin|github|portfolio|@|\.com|\.net|\.org/.test(
                hay
            ),
        },
        {
            label: "Keywords & Skills",
            present:
                /skills|technologies|tech skills|competencies|programming|software|tools|javascript|python|java|react|node|sql|html|css|aws|docker|kubernetes|agile|scrum|git|api|database|framework|library|language|technology|stack/.test(
                    hay
                ),
        },
        {
            label: "Quantified Achievements",
            present:
                /\d+%|\d+ percent|\d+ people|\d+ team|\d+ project|\d+ year|\d+ month|\d+ dollar|\$\d+|\d+ users|\d+ customers|\d+ revenue|\d+ growth|\d+ improvement|\d+ reduction|\d+ increase|\d+ decrease/.test(
                    hay
                ),
        },
        {
            label: "Action Verbs",
            present:
                /developed|created|implemented|managed|led|designed|built|improved|increased|decreased|achieved|delivered|launched|optimized|streamlined|enhanced|established|coordinated|facilitated|orchestrated|spearheaded|pioneered|architected|engineered|deployed|maintained|supported|troubleshot|resolved|analyzed|researched|evaluated|assessed|planned|organized|executed|completed|finished|accomplished|generated|produced|created|developed|built|constructed|assembled|fabricated|manufactured|produced|yielded|resulted|caused|brought|about|led|to|contributed|to|helped|assisted|aided|supported|enabled|empowered|facilitated|promoted|encouraged|fostered|nurtured|cultivated|developed|grew|expanded|scaled|increased|boosted|enhanced|improved|upgraded|refined|polished|perfected|optimized|streamlined|simplified|clarified|organized|structured|arranged|systematized|standardized|formalized|institutionalized|established|founded|created|initiated|started|began|commenced|launched|introduced|unveiled|revealed|disclosed|announced|declared|proclaimed|stated|expressed|communicated|conveyed|transmitted|delivered|presented|demonstrated|exhibited|displayed|showcased|highlighted|emphasized|stressed|underscored|accentuated|featured|spotlighted|focused|centered|concentrated|targeted|aimed|directed|guided|steered|navigated|piloted|drove|propelled|pushed|advanced|progressed|moved|forward|accelerated|expedited|hastened|rushed|hurried|sped|up|quickened|fastened|accelerated|boosted|enhanced|amplified|magnified|multiplied|doubled|tripled|quadrupled|quintupled|sextupled|septupled|octupled|nonupled|decupled/.test(
                    hay
                ),
        },
        {
            label: "Professional Experience",
            present:
                /experience|employment|work history|professional experience|job|position|role|career|occupation|employment|work|job|position|role|title|responsibilities|duties|tasks|projects|initiatives|achievements|accomplishments|contributions|impact|results|outcomes|deliverables|outputs|work|employment|job|position|role|title|company|organization|employer|client|customer|stakeholder|team|department|division|unit|group|section|branch|office|location|site|facility|premises|workplace|workstation|desk|office|cubicle|workspace|environment|setting|context|situation|circumstance|condition|state|status|level|grade|rank|tier|category|class|type|kind|sort|variety|form|style|manner|way|method|approach|technique|strategy|tactic|procedure|process|system|framework|model|paradigm|theory|concept|idea|notion|thought|belief|opinion|view|perspective|standpoint|position|stance|attitude|mindset|outlook|approach|methodology|philosophy|principle|value|standard|criterion|benchmark|measure|metric|indicator|signal|sign|mark|token|symbol|emblem|badge|insignia|logo|brand|label|tag|stamp|seal|signature|autograph|mark|trace|track|trail|path|route|way|road|street|avenue|boulevard|highway|freeway|expressway|turnpike|parkway|drive|lane|alley|path|trail|track|route|way|road|street|avenue|boulevard|highway|freeway|expressway|turnpike|parkway|drive|lane|alley/.test(
                    hay
                ),
        },
        {
            label: "Education Section",
            present:
                /education|bachelor|master|phd|university|degree|college|school|academic|academy|institute|institution|faculty|department|program|course|curriculum|syllabus|textbook|lecture|seminar|workshop|tutorial|training|certification|certificate|diploma|transcript|gpa|grade|score|mark|result|outcome|achievement|accomplishment|success|performance|progress|development|growth|improvement|enhancement|advancement|promotion|elevation|upgrade|boost|lift|raise|increase|improvement|enhancement|betterment|refinement|polishing|perfection|optimization|streamlining|simplification|clarification|organization|structuring|arrangement|systematization|standardization|formalization|institutionalization|establishment|foundation|creation|initiation|start|beginning|commencement|launch|introduction|unveiling|revelation|disclosure|announcement|declaration|proclamation|statement|expression|communication|conveyance|transmission|delivery|presentation|demonstration|exhibition|display|showcase|highlighting|emphasis|stress|underscoring|accentuation|featuring|spotlighting|focusing|centering|concentration|targeting|aiming|directing|guiding|steering|navigating|piloting|driving|propelling|pushing|advancing|progressing|moving|forward|accelerating|expediting|hastening|rushing|hurrying|speeding|up|quickening|fastening|accelerating|boosting|enhancing|amplifying|magnifying|multiplying|doubling|tripling|quadrupling|quintupling|sextupling|septupling|octupling|nonupling|decupling/.test(
                    hay
                ),
        },
    ];
};

export default constants;
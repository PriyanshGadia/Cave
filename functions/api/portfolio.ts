interface Env {
  WORKSHOP_DB: D1Database;
}

export interface PortfolioItem {
  id: string;
  kind: 'skill' | 'certification' | 'achievement' | 'project' | 'education' | 'experience' | 'marksheet';
  title: string;
  summary: string;
  proof_url: string;
  proof_type: 'link' | 'document' | 'repo' | 'transcript' | 'video' | 'credential';
  issuer?: string;
  date_from?: string;
  date_to?: string;
  tags: string[];
  weight: number;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  layout_spec: {
    sections: string[];
    columns: number;
    accent: string;
  };
}

export const DEFAULT_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'quant-research',
    name: 'QUANT / ML RESEARCH',
    layout_spec: {
      sections: ['education', 'projects', 'skills', 'certifications', 'experience'],
      columns: 1,
      accent: '#39d6ff',
    },
  },
  {
    id: 'fullstack-ai',
    name: 'FULL-STACK AI / PROD',
    layout_spec: {
      sections: ['experience', 'projects', 'skills', 'certifications', 'education'],
      columns: 1,
      accent: '#4dff8a',
    },
  },
  {
    id: 'robotics-mech',
    name: 'ROBOTICS & MECH-ENG',
    layout_spec: {
      sections: ['education', 'projects', 'skills', 'certifications', 'experience'],
      columns: 1,
      accent: '#ffb15c',
    },
  },
  {
    id: 'exec-clean',
    name: 'EXECUTIVE / CLEAN',
    layout_spec: {
      sections: ['experience', 'projects', 'education', 'certifications', 'skills'],
      columns: 1,
      accent: '#c084fc',
    },
  },
];

export const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  // Education
  {
    id: 'edu:iitg',
    kind: 'education',
    title: 'Indian Institute of Technology Guwahati',
    summary: 'B.Sc. (Hons) in Data Science and Artificial Intelligence · CPI: 9.25/10.0 (Upto Trimester VIII, peak 9.77 in Tri V) · Currently enrolled in 10th Trimester · Coursework: Machine Learning, Statistical Inference, Linear Algebra, Optimization, DSA, Probability & Stochastic Processes.',
    proof_url: 'https://iitg.ac.in/acad/admission/online/Bsc_DSAI_Curriculum.pdf',
    proof_type: 'transcript',
    issuer: 'IIT Guwahati',
    date_from: '2023-10',
    date_to: '2027-08',
    tags: ['Data Science', 'Artificial Intelligence', 'Machine Learning', 'Optimization', 'IIT'],
    weight: 100,
  },
  {
    id: 'edu:djsce',
    kind: 'education',
    title: 'Dwarkadas J. Sanghvi College of Engineering',
    summary: 'B.Tech (Hons) in Mechanical Engineering and Robotics · CGPA: 8.23/10.0 (Upto Semester VI) · Currently enrolled in 7th Semester · Grade O in AI/ML, CAD/CAM & FEA Labs; Grade A+ in AI & ML · Coursework: Applied Thermodynamics, Fluid Mechanics, CAD/CAM, CNC, FEA, Advanced Robotics.',
    proof_url: 'https://www.djsce.ac.in',
    proof_type: 'transcript',
    issuer: 'DJSCE',
    date_from: '2023-08',
    date_to: '2027-08',
    tags: ['Mechanical Engineering', 'Robotics', 'CAD/CAM', 'Thermodynamics', 'CNC'],
    weight: 95,
  },
  {
    id: 'edu:kc-college',
    kind: 'education',
    title: 'Kishinchand Chellaram (K.C.) College — HSC Class 12',
    summary: 'Higher Secondary Certificate (HSC) Class 12 (2023) · Marks: 452 / 600 · Percentage: 75.33% · Science & Electronics Stream (PCMEEm).',
    proof_url: 'https://kccollege.edu.in',
    proof_type: 'transcript',
    issuer: 'K.C. College',
    date_from: '2021',
    date_to: '2023',
    tags: ['HSC', 'Class 12', 'Academics', 'High School', 'Mathematics'],
    weight: 80,
  },
  {
    id: 'edu:activity-school',
    kind: 'education',
    title: 'Activity High School — ICSE Class 10',
    summary: 'Indian Certificate of Secondary Education (ICSE) Class 10 (2021) · Marks: 448 / 500 · Percentage: 89.60%.',
    proof_url: 'https://activityhighschool.com',
    proof_type: 'transcript',
    issuer: 'Activity High School',
    date_from: '2019',
    date_to: '2021',
    tags: ['ICSE', 'Class 10', 'Academics', 'School'],
    weight: 75,
  },

  // Experience
  {
    id: 'exp:the-key',
    kind: 'experience',
    title: 'Marketing Operations Intern — The Key',
    summary: 'Collection and uploading of data by managing multiple retail store owners/staff, while liaising with tech-team for app development (Aug 2022 – Sep 2022, Mumbai, India).',
    proof_url: 'https://linkedin.com/in/priyansh-gadia-b7645320b',
    proof_type: 'link',
    issuer: 'The Key',
    date_from: '2022-08',
    date_to: '2022-09',
    tags: ['Marketing Operations', 'App Development', 'Retail Data', 'Coordination'],
    weight: 70,
  },
  {
    id: 'exp:rotaract-photo',
    kind: 'experience',
    title: 'Official & Event Photographer — Rotaract Club of KC College',
    summary: 'Official Photographer appointed for Rotaract Club of KC College AGM 2022. Event Photographer for R.E.D. 2022 (Rotaract Mumbai district youth fest hosted at SPIT Andheri). Over 4 years of active field practice across events, portraits, sports, and media.',
    proof_url: 'https://kccollege.edu.in',
    proof_type: 'link',
    issuer: 'Rotaract Club of KC College / Rotaract Mumbai',
    date_from: '2022-07',
    date_to: '2022-12',
    tags: ['Photography', 'Event Photography', 'Rotaract', 'Creative Media'],
    weight: 72,
  },

  // Certifications & Specialized Qualifications
  {
    id: 'cert:oci-ds',
    kind: 'certification',
    title: 'Oracle Cloud Infrastructure 2025 Certified Data Science Professional',
    summary: 'Certified OCI Data Science Professional (October 2025). Advanced competencies in distributed ML training, MLOps model deployment, data pipelines, and enterprise OCI services.',
    proof_url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=045EC65FDEB4B83DAFF5596C9995FB467E12374A19E8627EA37A14267A0E737B',
    proof_type: 'credential',
    issuer: 'Oracle University',
    date_from: '2025-10',
    date_to: '2025-10',
    tags: ['Oracle Cloud', 'Data Science', 'MLOps', 'Pipelines', 'Infrastructure'],
    weight: 98,
  },
  {
    id: 'cert:citi-program',
    kind: 'certification',
    title: 'Collaborative Institutional Training Initiative (CITI Program)',
    summary: 'Human Research & Data or Specimens Only Research (Jul 2025). Massachusetts Institute of Technology Affiliate. Clinical trial data handling, HIPAA, and ethics protocols.',
    proof_url: 'https://www.citiprogram.org/verify/?k56a0e057-078f-4fcb-931c-35d6abd67ca3-70963231',
    proof_type: 'credential',
    issuer: 'MIT Affiliate / CITI',
    date_from: '2025-07',
    date_to: '2025-07',
    tags: ['CITI Program', 'Human Subjects', 'MIT Affiliate', 'Clinical Ethics', 'MIMIC-IV'],
    weight: 90,
  },
  {
    id: 'cert:michiganx-py4e',
    kind: 'certification',
    title: 'University of Michigan — Programming for Everybody (Python)',
    summary: 'Verified Certificate in Python programming foundations, data structures, conditional execution, and algorithm design from Univ. of Michigan / edX (Charles Severance). Verification ID: cb80bebc7b7044fe85f6a17f2282e12e.',
    proof_url: 'https://courses.edx.org/certificates/cb80bebc7b7044fe85f6a17f2282e12e',
    proof_type: 'credential',
    issuer: 'University of Michigan / edX',
    date_from: '2021',
    date_to: '2021',
    tags: ['Python', 'Programming', 'University of Michigan', 'edX', 'Computer Science'],
    weight: 88,
  },
  {
    id: 'cert:glasgow-cdss',
    kind: 'certification',
    title: 'Data Mining of Clinical Databases - 1 (CDSS)',
    summary: 'Clinical Decision Support Systems (CDSS) & large-scale ICU EHR data mining certification.',
    proof_url: 'https://www.gla.ac.uk',
    proof_type: 'credential',
    issuer: 'University of Glasgow',
    date_from: '2025-07',
    date_to: '2025-07',
    tags: ['Clinical AI', 'EHR', 'CDSS', 'Healthcare', 'Data Mining', 'Glasgow'],
    weight: 85,
  },
  {
    id: 'cert:glasgow-dl-ehr',
    kind: 'certification',
    title: 'Deep Learning in Electronic Health Record',
    summary: 'Advanced deep learning models for longitudinal electronic health records, temporal sequence modeling, and clinical risk prediction.',
    proof_url: 'https://www.gla.ac.uk',
    proof_type: 'credential',
    issuer: 'University of Glasgow',
    date_from: '2026',
    date_to: '2026',
    tags: ['Deep Learning', 'EHR', 'Clinical ML', 'Glasgow', 'Bioinformatics'],
    weight: 84,
  },

  // Projects
  {
    id: 'proj:cryptograph',
    kind: 'project',
    title: 'CryptoGraph Analytics — Ensemble Forecasting & Real-Time Analytics',
    summary: 'Full-stack platform ingesting Binance WebSocket data, computing indicators (RSI, MACD, volatility) for 100+ crypto assets. Ensemble ML pipeline combining Spatio-Temporal GCN for asset correlation, LSTM for sequential patterns, and NeuralProphet for temporal decomposition. Mixture-of-Agents trading swarm with SHAP attribution and Groq LLaMA 3.3.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Self-Directed',
    date_from: '2024',
    date_to: 'Present',
    tags: ['Graph Neural Networks', 'PyTorch', 'FastAPI', 'Next.js 14', 'WebSockets', 'ST-GCN'],
    weight: 100,
  },
  {
    id: 'proj:rso',
    kind: 'project',
    title: 'Respiratory Support Optimization — Biomedical ML Research',
    summary: 'Interdisciplinary research developing a machine learning-based approach to detect clinically invisible pressure transients during ICU ventilation. Processed 200 Hz waveforms across 50,920 MIMIC-IV patient records with esophageal pressure ground truth under leave-one-patient-out cross-validation.',
    proof_url: 'https://github.com/PriyanshGadia/Respiratory-Support-Optimization',
    proof_type: 'repo',
    issuer: 'Biomedical ML Research',
    date_from: '2025-12',
    date_to: 'Present',
    tags: ['Biomedical ML', 'Physiological Waveforms', 'MIMIC-IV', 'SciPy', 'ICU Ventilator'],
    weight: 98,
  },
  {
    id: 'proj:idp',
    kind: 'project',
    title: 'Intelligent Document Processing & Insight Engine',
    summary: 'Document intelligence platform with content-aware routing: TF-IDF/XGBoost classification, LayoutLMv3 table extraction, DistilBERT sentiment, and LLM streaming. Lazy model loading with LRU caching (~150 MB cold start) and content-hash prediction caching for O(1) repeated inference.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Enterprise AI',
    date_from: '2025',
    date_to: '2026',
    tags: ['LayoutLMv3', 'FastAPI', 'XGBoost', 'DistilBERT', 'Document AI', 'Ollama'],
    weight: 92,
  },
  {
    id: 'proj:tesla-prophet',
    kind: 'project',
    title: 'Tesla Stock Price Prediction using Facebook Prophet',
    summary: 'Created a Facebook Prophet Model forecasting the stock price of Tesla 30 days into the future and evaluated using Google Finance automation in Google Sheets.',
    proof_url: 'https://coursera.org/verify/U1T7WE8IW6BT',
    proof_type: 'credential',
    issuer: 'Coursera Project',
    date_from: '2025-04',
    date_to: '2025-04',
    tags: ['Facebook Prophet', 'Time-Series', 'Google Finance', 'Tesla', 'Forecasting'],
    weight: 88,
  },
  {
    id: 'proj:forms-bulk',
    kind: 'project',
    title: 'Google Forms Bulk Responder',
    summary: 'Automatically extracts the structure of a Google Form and submits high-concurrency randomized responses for load testing, fuzzing, and synthetic test-data generation.',
    proof_url: 'https://github.com/PriyanshGadia/Google-Forms-Bulk-Responder',
    proof_type: 'repo',
    issuer: 'Automation Tool',
    date_from: '2026-01',
    date_to: 'Present',
    tags: ['Automation', 'Reverse Engineering', 'Load Testing', 'Python', 'Testing'],
    weight: 85,
  },
  {
    id: 'proj:argus',
    kind: 'project',
    title: 'Argus — Institutional Quantitative & RegTech OS',
    summary: '11-package monorepo for quant asset management: feature store (path signatures, rough vol), alpha models (Mamba-3 + GAT), and strict anti-overfitting protocol (DSR/PBO, CSCV).',
    proof_url: 'https://github.com/PriyanshGadia/Argus',
    proof_type: 'repo',
    issuer: 'Quant Research',
    date_from: '2025',
    date_to: 'Present',
    tags: ['Quantitative Finance', 'PyTorch', 'Mamba', 'GAT', 'Risk Budgeting', 'RegTech'],
    weight: 98,
  },
  {
    id: 'proj:physionet',
    kind: 'project',
    title: 'PhysioNet Challenge 2026 — Cognitive Impairment Prediction',
    summary: 'Predicting cognitive impairment across 6,600 PSG records (3 hospital sites); extracted 120+ sleep/EEG/HRV features with dual-layer age residualization (fage_z + post-hoc gamma) in Dockerized pipeline.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'PhysioNet / CinC',
    date_from: '2026',
    date_to: 'Present',
    tags: ['PhysioNet', 'LightGBM', 'XGBoost', 'Docker', 'Biomedical ML', 'Sleep EEG'],
    weight: 96,
  },
  {
    id: 'proj:gpt2',
    kind: 'project',
    title: 'GPT-2 From Scratch — Autoregressive Transformer in PyTorch',
    summary: 'Autoregressive transformer architecture (multi-head causal self-attention, learned positional embeddings, layer normalization, causal masking) implemented end-to-end in pure PyTorch.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Deep Learning Research',
    date_from: '2024',
    date_to: '2024',
    tags: ['PyTorch', 'Transformers', 'GPT-2', 'Attention', 'Deep Learning'],
    weight: 90,
  },
  {
    id: 'proj:cave',
    kind: 'project',
    title: 'Cave — VAULT-01 Procedural 3D WebGL Engine',
    summary: 'Real-time procedural WebGL engine built without raster assets. Custom GLSL PBR shader stack, raymarched volumetric fog, and interactive tabletop cyberdeck terminals.',
    proof_url: 'https://github.com/PriyanshGadia/Cave',
    proof_type: 'repo',
    issuer: 'Computer Graphics',
    date_from: '2026',
    date_to: 'Present',
    tags: ['WebGL', 'Three.js', 'GLSL', 'PBR', 'Procedural Geometry'],
    weight: 86,
  },

  // Skills & Technical Domains
  {
    id: 'skill:languages',
    kind: 'skill',
    title: 'Languages: Python, SQL, C, C++, Java, R, MATLAB, TypeScript, JavaScript',
    summary: 'Production expertise across Python, SQL (PostgreSQL, SQLite), C, C++, Java, R, MATLAB, TypeScript, and modern JavaScript.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Core Languages',
    date_from: '2021',
    date_to: 'Present',
    tags: ['Python', 'SQL', 'C++', 'Java', 'R', 'MATLAB', 'TypeScript'],
    weight: 100,
  },
  {
    id: 'skill:ml-analytics',
    kind: 'skill',
    title: 'ML & Analytics: PyTorch, scikit-learn, XGBoost, LSTM, ST-GCN, Prophet, SHAP',
    summary: 'Deep learning architectures (ST-GCN, LSTM, NeuralProphet), model explainability (SHAP), time-series forecasting, pandas, NumPy, SciPy.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Machine Learning',
    date_from: '2022',
    date_to: 'Present',
    tags: ['PyTorch', 'scikit-learn', 'XGBoost', 'LSTM', 'ST-GCN', 'SHAP', 'SciPy'],
    weight: 98,
  },
  {
    id: 'skill:frameworks-systems',
    kind: 'skill',
    title: 'Frameworks & Systems: FastAPI, Next.js 14, Docker, Redis, WebSockets',
    summary: 'Full-stack production web architectures, async APIs (FastAPI), real-time WebSockets, Redis caching, SQLAlchemy, Prometheus, Sentry observability.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Systems & Cloud',
    date_from: '2023',
    date_to: 'Present',
    tags: ['FastAPI', 'Next.js 14', 'Docker', 'Redis', 'WebSockets', 'Observability'],
    weight: 92,
  },
  {
    id: 'skill:cad-robotics',
    kind: 'skill',
    title: 'Machine Design & CAD/CAM: Autodesk (Inventor, Fusion 360), KeyShot, CNC',
    summary: 'Parametric mechanical design, Autodesk Inventor, Fusion 360, KeyShot rendering, CNC machining (milling & lathe), Applied Thermodynamics & Fluid Mechanics.',
    proof_url: 'https://www.djsce.ac.in',
    proof_type: 'link',
    issuer: 'Mechanical & Robotics',
    date_from: '2023',
    date_to: 'Present',
    tags: ['CAD/CAM', 'Autodesk', 'Fusion 360', 'KeyShot', 'CNC', 'Robotics'],
    weight: 90,
  },
  {
    id: 'skill:finance-quant',
    kind: 'skill',
    title: 'Financial Valuation, Portfolio Analysis & Economical Management',
    summary: 'Quantitative risk budgeting, portfolio valuation, econometric modeling, automated financial forecasting pipelines, and market microstructure analysis.',
    proof_url: 'https://github.com/PriyanshGadia',
    proof_type: 'repo',
    issuer: 'Quantitative Finance',
    date_from: '2023',
    date_to: 'Present',
    tags: ['Financial Valuation', 'Portfolio Analysis', 'Econometrics', 'Risk Management'],
    weight: 88,
  },
  {
    id: 'skill:photography',
    kind: 'skill',
    title: 'Photography & Visual Media (Sam Bagli Mentorship, Adobe Suite)',
    summary: '2 years formal photography study under mentor Sam Bagli + 2 years advanced practice & active hobby. Portrait, event, product, nature, sports. Tools: Adobe Lightroom, Photoshop, Canva, Filmora.',
    proof_url: 'https://kccollege.edu.in',
    proof_type: 'link',
    issuer: 'Sam Bagli Mentorship',
    date_from: '2020',
    date_to: 'Present',
    tags: ['Photography', 'Adobe Lightroom', 'Photoshop', 'Canva', 'Filmora', 'Visual Media'],
    weight: 86,
  },
  {
    id: 'skill:creative-arts',
    kind: 'skill',
    title: 'Visual Arts & Creative Expression: Sketching, Singing, Dancing',
    summary: 'Fine arts & illustration with dedicated Instagram sketch portfolio. Qualified UCEED 2023 (National Design Entrance Examination). Passionate performer across freehand drawing, vocal singing, and dance.',
    proof_url: 'https://instagram.com',
    proof_type: 'link',
    issuer: 'Creative Arts / UCEED',
    date_from: '2020',
    date_to: 'Present',
    tags: ['Visual Arts', 'Sketching', 'Illustration', 'UCEED', 'Creative Arts'],
    weight: 84,
  },
];


export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const db = env?.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify({ items: DEFAULT_PORTFOLIO_ITEMS, templates: DEFAULT_TEMPLATES }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
        },
      });
    }

    const { results: rawItems } = await db
      .prepare(
        `SELECT id, kind, title, summary, proof_url, proof_type, issuer, date_from, date_to, tags, weight
         FROM portfolio_items WHERE visible = 1 AND verified_at IS NOT NULL ORDER BY weight DESC, created_at DESC`
      )
      .all();

    const { results: rawTemplates } = await db
      .prepare(`SELECT id, name, layout_spec FROM resume_templates ORDER BY created_at ASC`)
      .all();

    const items: PortfolioItem[] = (rawItems && rawItems.length > 0)
      ? rawItems.map((r: any) => ({
          ...r,
          tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags,
        }))
      : DEFAULT_PORTFOLIO_ITEMS;

    const templates: ResumeTemplate[] = (rawTemplates && rawTemplates.length > 0)
      ? rawTemplates.map((t: any) => ({
          ...t,
          layout_spec: typeof t.layout_spec === 'string' ? JSON.parse(t.layout_spec || '{}') : t.layout_spec,
        }))
      : DEFAULT_TEMPLATES;

    return new Response(JSON.stringify({ items, templates }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=600',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ items: DEFAULT_PORTFOLIO_ITEMS, templates: DEFAULT_TEMPLATES }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

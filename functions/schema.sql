-- D1 Database Schema for The Workshop
-- Version 2.0 (Hardened Legal Consent & Biometrics)

-- 1. Visitors and Access Tiers
CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    tier INTEGER NOT NULL DEFAULT 0, -- 0: Anonymous, 1: Recognized (Magic link), 2: Verified (Biometric/Phone)
    email TEXT UNIQUE,
    full_name TEXT,
    fingerprint_hash TEXT,
    encrypted_embedding TEXT, -- AES-GCM encrypted mathematical vector base64
    encryption_iv TEXT,       -- IV for AES-GCM
    jurisdiction_code TEXT,   -- Country/Region code (e.g. US-IL, GB, DE)
    is_biometric_gated INTEGER NOT NULL DEFAULT 0, -- 1 if jurisdiction restricts biometrics
    auth_method TEXT NOT NULL DEFAULT 'anonymous', -- 'anonymous' | 'magic_link' | 'biometric' | 'phone_otp'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login_at INTEGER NOT NULL DEFAULT (unixepoch()),
    status TEXT NOT NULL DEFAULT 'active' -- 'active' | 'deleted' | 'flagged'
);

-- 2. Legal Digital Release & Consent Audit Records (Stored separately for compliance defense)
CREATE TABLE IF NOT EXISTS consent_releases (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    disclosure_hash TEXT NOT NULL, -- SHA-256 hash of the exact legal disclosure text shown
    ip_hash TEXT NOT NULL,         -- SHA-256 salted hash of IP address
    user_agent TEXT,
    fingerprint_hash TEXT,
    email_recipient TEXT,
    email_dispatched_at INTEGER,
    consent_given_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
);

-- 3. Live Collaborative Guestbook (Sector LS2)
CREATE TABLE IF NOT EXISTS guestbook_entries (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL DEFAULT 'ANONYMOUS',
    visitor_tier INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    ink_strokes_json TEXT,                    -- Optional freehand pen vector strokes (JSON serialized)
    color_theme TEXT NOT NULL DEFAULT 'cyan', -- 'cyan' | 'amber' | 'green' | 'white'
    paper_theme TEXT NOT NULL DEFAULT 'yellow', -- 'yellow' | 'pink' | 'cyan' | 'green'
    pos_x REAL NOT NULL DEFAULT 0,            -- Subtle organic visual layout X jitter (-0.05..+0.05)
    pos_y REAL NOT NULL DEFAULT 0,            -- Subtle organic visual layout Y jitter (-0.05..+0.05)
    ip_hash TEXT NOT NULL,
    token_hash TEXT,                          -- SHA-256(client_token) for write & delete authorization
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    is_hidden INTEGER NOT NULL DEFAULT 0      -- Owner moderation flag
);

-- 4. Rate Limiting and Abuse Prevention
CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash TEXT PRIMARY KEY, -- Hash of (IP + Action) or (Fingerprint + Action)
    request_count INTEGER NOT NULL DEFAULT 1,
    window_expires_at INTEGER NOT NULL
);

-- 5. Generic Sector Interaction State (Persistent across visitors)
CREATE TABLE IF NOT EXISTS interaction_state (
    namespace TEXT NOT NULL,       -- e.g. 'rs1', 'rs2', 'ls2'
    element_id TEXT NOT NULL,      -- e.g. 'sheet:gh:owner/repo' or 'field:projects'
    data TEXT NOT NULL,            -- JSON serialized blob
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (namespace, element_id)
);

-- 6. Project Blueprints (Sector RS1 - Curated GitHub & Manual Projects)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,           -- e.g. 'gh:owner/repo' or 'manual:uuid'
    source TEXT NOT NULL,          -- 'github' | 'manual'
    repo_full TEXT,                -- 'owner/repo', null for manual
    title TEXT NOT NULL,
    tagline TEXT,
    tags TEXT DEFAULT '[]',        -- JSON string array
    stats TEXT,                    -- JSON: { stars, forks, lang, lastCommitAt, commits30d }
    readme_excerpt TEXT,
    diagram_spec TEXT,             -- JSON declarative schematic override
    visible INTEGER NOT NULL DEFAULT 0,          -- 0 = false, 1 = true (curation gate)
    review_state TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'hidden'
    sort_order INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON visitors(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(window_expires_at);
CREATE INDEX IF NOT EXISTS idx_interaction_state_ns ON interaction_state(namespace);
CREATE INDEX IF NOT EXISTS idx_projects_visible ON projects(visible, review_state, sort_order);

-- Seed Approved Projects (Sector RS1 Blueprints - PriyanshGadia public repositories, excluding FSO)
INSERT OR IGNORE INTO projects (id, source, repo_full, title, tagline, tags, stats, readme_excerpt, diagram_spec, visible, review_state, sort_order) VALUES
('gh:PriyanshGadia/Cave', 'github', 'PriyanshGadia/Cave', 'Cave', 'VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer.', '["WebGL","Three.js","TypeScript","Procedural","PBR"]', '{"stars":0,"forks":0,"lang":"TypeScript"}', 'Interactive 3D cavern and research facility simulation.', '{"shapes":[{"type":"rect","x":15,"y":25,"w":60,"h":50,"label":"CAVERN"},{"type":"rect","x":105,"y":25,"w":60,"h":50,"label":"VAULT"},{"type":"line","from":[75,50],"to":[105,50]},{"type":"circle","x":90,"y":50,"r":8,"label":"DOOR"},{"type":"circle","x":135,"y":50,"r":14,"label":"PEDESTAL"},{"type":"dim","from":[15,105],"to":[165,105],"text":"TUNNEL 25m"},{"type":"line","from":[15,100],"to":[15,110]},{"type":"line","from":[165,100],"to":[165,110]},{"type":"rect","x":25,"y":130,"w":130,"h":45,"label":"PBR SHADER STACK"}]}', 1, 'approved', 1),
('gh:PriyanshGadia/Argus', 'github', 'PriyanshGadia/Argus', 'Argus', 'Autonomous telemetry & visual anomaly surveillance engine.', '["Python","Computer Vision","Telemetry","Surveillance"]', '{"stars":0,"forks":0,"lang":"Python"}', 'Visual telemetry and anomaly monitoring pipeline.', '{"shapes":[{"type":"circle","x":50,"y":50,"r":24,"label":"OPTIC SENSOR"},{"type":"circle","x":50,"y":50,"r":8},{"type":"line","from":[74,50],"to":[110,50]},{"type":"rect","x":110,"y":28,"w":55,"h":44,"label":"CNN FILTER"},{"type":"line","from":[137,72],"to":[137,115]},{"type":"rect","x":95,"y":115,"w":75,"h":45,"label":"ALERT BUS"},{"type":"dim","from":[20,180],"to":[165,180],"text":"<15ms LATENCY"}]}', 1, 'approved', 2),
('gh:PriyanshGadia/physionet2026-unchartered-iitian', 'github', 'PriyanshGadia/physionet2026-unchartered-iitian', 'PhysioNet 2026', 'Physiological multi-lead ECG time-series classification & cardiac outcome prediction.', '["Python","ECG","Bioinformatics","Time-Series","PyTorch"]', '{"stars":0,"forks":0,"lang":"Python"}', 'PhysioNet Challenge 2026 submission model.', '{"shapes":[{"type":"rect","x":15,"y":25,"w":50,"h":60,"label":"ECG 12-LEAD"},{"type":"line","from":[65,55],"to":[95,55]},{"type":"rect","x":95,"y":25,"w":70,"h":60,"label":"WAVELET DECOMP"},{"type":"line","from":[130,85],"to":[130,115]},{"type":"circle","x":130,"y":140,"r":22,"label":"ATTENTION"},{"type":"dim","from":[15,185],"to":[165,185],"text":"500Hz SAMPLING"}]}', 1, 'approved', 3),
('gh:PriyanshGadia/CryptoGraph_Analytics', 'github', 'PriyanshGadia/CryptoGraph_Analytics', 'CryptoGraph', 'On-chain network topology analysis and transaction graph clustering.', '["Python","Graph Theory","Blockchain","NetworkX"]', '{"stars":0,"forks":0,"lang":"Python"}', 'Network analytics on blockchain transaction graphs.', '{"shapes":[{"type":"circle","x":40,"y":45,"r":14,"label":"NODE-A"},{"type":"circle","x":135,"y":45,"r":14,"label":"NODE-B"},{"type":"circle","x":88,"y":115,"r":18,"label":"HUB"},{"type":"line","from":[50,55],"to":[78,102]},{"type":"line","from":[125,55],"to":[98,102]},{"type":"line","from":[54,45],"to":[121,45]},{"type":"dim","from":[20,165],"to":[165,165],"text":"FLOW MATRIX"}]}', 1, 'approved', 4),
('gh:PriyanshGadia/Respiratory-Support-Optimization', 'github', 'PriyanshGadia/Respiratory-Support-Optimization', 'Ventilator AI', 'Closed-loop ventilator control & adaptive respiratory support optimization.', '["Python","Medical AI","Control Systems","Optimization"]', '{"stars":0,"forks":0,"lang":"Python"}', 'Adaptive closed-loop optimization for respiratory parameters.', '{"shapes":[{"type":"rect","x":15,"y":25,"w":55,"h":50,"label":"FLOW SENSOR"},{"type":"line","from":[70,50],"to":[105,50]},{"type":"rect","x":105,"y":25,"w":60,"h":50,"label":"PID CONTROLLER"},{"type":"line","from":[135,75],"to":[135,110]},{"type":"circle","x":135,"y":130,"r":18,"label":"VALVE"},{"type":"line","from":[117,130],"to":[42,130]},{"type":"line","from":[42,130],"to":[42,75]},{"type":"dim","from":[15,175],"to":[165,175],"text":"PEEP REGULATION"}]}', 1, 'approved', 5),
('gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine', 'github', 'PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine', 'Insight Engine', 'Multimodal document extraction, layout parsing & semantic vector synthesis.', '["Python","NLP","OCR","Document AI","Embeddings"]', '{"stars":0,"forks":0,"lang":"Python"}', 'Intelligent document processing and knowledge extraction.', '{"shapes":[{"type":"rect","x":15,"y":25,"w":45,"h":65,"label":"DOC INGEST"},{"type":"line","from":[60,55],"to":[90,55]},{"type":"rect","x":90,"y":25,"w":75,"h":65,"label":"LAYOUT PARSER"},{"type":"line","from":[127,90],"to":[127,120]},{"type":"circle","x":127,"y":142,"r":20,"label":"EMBEDDINGS"},{"type":"dim","from":[15,185],"to":[165,185],"text":"VECTOR RAG"}]}', 1, 'approved', 6),
('gh:PriyanshGadia/Google-Forms-Bulk-Responder', 'github', 'PriyanshGadia/Google-Forms-Bulk-Responder', 'Form Dispatcher', 'Form schema reverse engineering & high-throughput concurrency load tester.', '["Python","Automation","Reverse Engineering","Load Testing"]', '{"stars":0,"forks":0,"lang":"Python"}', 'Automated Google Form structure extraction and bulk load generation.', '{"shapes":[{"type":"rect","x":15,"y":25,"w":60,"h":45,"label":"SCHEMA PROBE"},{"type":"line","from":[75,47],"to":[105,47]},{"type":"rect","x":105,"y":25,"w":60,"h":45,"label":"RANDOM SEED"},{"type":"line","from":[135,70],"to":[135,105]},{"type":"rect","x":80,"y":105,"w":85,"h":45,"label":"ASYNC POOL"},{"type":"dim","from":[15,175],"to":[165,175],"text":"CONCURRENT HTTP"}]}', 1, 'approved', 7);
-- 7. Verified Portfolio & Resume Fabricator (Sector RS2)
CREATE TABLE IF NOT EXISTS portfolio_items (
    id            TEXT PRIMARY KEY,
    kind          TEXT NOT NULL CHECK (kind IN ('skill','certification','achievement','project','education','experience','marksheet')),
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    proof_url     TEXT NOT NULL CHECK (length(proof_url) > 0),
    proof_type    TEXT NOT NULL CHECK (proof_type IN ('link','document','repo','transcript','video','credential')),
    issuer        TEXT,
    date_from     TEXT,
    date_to       TEXT,
    tags          TEXT NOT NULL DEFAULT '[]', -- JSON array
    weight        INTEGER NOT NULL DEFAULT 0,
    visible       INTEGER NOT NULL DEFAULT 1,
    verified_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS resume_templates (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    layout_spec  TEXT NOT NULL, -- JSON: section order, columns, accent color
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_portfolio_visible ON portfolio_items(visible, verified_at, weight DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_kind ON portfolio_items(kind, weight DESC);

-- Seed Resume Templates
INSERT OR IGNORE INTO resume_templates (id, name, layout_spec) VALUES
('quant-research', 'QUANT / ML RESEARCH', '{"sections":["education","projects","skills","certifications","experience"],"columns":1,"accent":"#39d6ff"}'),
('fullstack-ai',   'FULL-STACK AI / PROD', '{"sections":["experience","projects","skills","certifications","education"],"columns":1,"accent":"#4dff8a"}'),
('robotics-mech',  'ROBOTICS & MECH-ENG',  '{"sections":["education","projects","skills","certifications","experience"],"columns":1,"accent":"#ffb15c"}'),
('exec-clean',     'EXECUTIVE / CLEAN',    '{"sections":["experience","projects","education","certifications","skills"],"columns":1,"accent":"#c084fc"}');

-- Seed Verified Portfolio Items (Priyansh Gadia — All items backed by real proof URLs from user resumes)
INSERT OR REPLACE INTO portfolio_items (id, kind, title, summary, proof_url, proof_type, issuer, date_from, date_to, tags, weight, visible, verified_at) VALUES
-- Education
('edu:iitg', 'education', 'Indian Institute of Technology Guwahati', 'B.Sc. (Hons) in Data Science and Artificial Intelligence · CPI: 9.25/10.0 (Upto Trimester VIII, peak 9.77 in Tri V) · Currently enrolled in 10th Trimester · Coursework: Machine Learning, Statistical Inference, Linear Algebra, Optimization, DSA, Probability & Stochastic Processes.', 'https://iitg.ac.in/acad/admission/online/Bsc_DSAI_Curriculum.pdf', 'transcript', 'IIT Guwahati', '2023-10', '2027-08', '["Data Science","Artificial Intelligence","Machine Learning","Optimization","IIT"]', 100, 1, 1725667200),
('edu:djsce', 'education', 'Dwarkadas J. Sanghvi College of Engineering', 'B.Tech (Hons) in Mechanical Engineering and Robotics · CGPA: 8.23/10.0 (Upto Semester VI) · Currently enrolled in 7th Semester · Grade O in AI/ML, CAD/CAM & FEA Labs; Grade A+ in AI & ML · Coursework: Applied Thermodynamics, Fluid Mechanics, CAD/CAM, CNC, FEA, Advanced Robotics.', 'https://www.djsce.ac.in', 'transcript', 'DJSCE', '2023-08', '2027-08', '["Mechanical Engineering","Robotics","CAD/CAM","Thermodynamics","CNC"]', 95, 1, 1725667200),
('edu:kc-college', 'education', 'Kishinchand Chellaram (K.C.) College — HSC Class 12', 'Higher Secondary Certificate (HSC) Class 12 (2023) · Marks: 452 / 600 · Percentage: 75.33% · Science & Electronics Stream (PCMEEm).', 'https://kccollege.edu.in', 'marksheet', 'K.C. College', '2021', '2023', '["HSC","Class 12","Academics","High School","Mathematics"]', 80, 1, 1725667200),
('edu:activity-school', 'education', 'Activity High School — ICSE Class 10', 'Indian Certificate of Secondary Education (ICSE) Class 10 (2021) · Marks: 448 / 500 · Percentage: 89.60%.', 'https://activityhighschool.com', 'marksheet', 'Activity High School', '2019', '2021', '["ICSE","Class 10","Academics","School"]', 75, 1, 1725667200),

-- Experience
('exp:the-key', 'experience', 'Marketing Operations Intern — The Key', 'Collection and uploading of data by managing multiple retail store owners/staff, while liaising with tech-team for app development (Aug 2022 – Sep 2022, Mumbai, India).', 'https://linkedin.com/in/priyansh-gadia-b7645320b', 'link', 'The Key', '2022-08', '2022-09', '["Marketing Operations","App Development","Retail Data","Coordination"]', 70, 1, 1725667200),
('exp:rotaract-photo', 'experience', 'Official & Event Photographer — Rotaract Club of KC College', 'Official Photographer appointed for Rotaract Club of KC College AGM 2022. Event Photographer for R.E.D. 2022 (Rotaract Mumbai district youth fest hosted at SPIT Andheri). Over 4 years of active field practice across events, portraits, sports, and media.', 'https://kccollege.edu.in', 'link', 'Rotaract Club of KC College / Rotaract Mumbai', '2022-07', '2022-12', '["Photography","Event Photography","Rotaract","Creative Media"]', 72, 1, 1725667200),

-- Certifications & Specialized Qualifications
('cert:oci-ds', 'certification', 'Oracle Cloud Infrastructure 2025 Certified Data Science Professional', 'Certified OCI Data Science Professional (October 2025). Advanced competencies in distributed ML training, MLOps model deployment, data pipelines, and enterprise OCI services.', 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=045EC65FDEB4B83DAFF5596C9995FB467E12374A19E8627EA37A14267A0E737B', 'credential', 'Oracle University', '2025-10', '2025-10', '["Oracle Cloud","Data Science","MLOps","Pipelines","Infrastructure"]', 98, 1, 1725667200),
('cert:citi-program', 'certification', 'Collaborative Institutional Training Initiative (CITI Program)', 'Human Research & Data or Specimens Only Research (Jul 2025). Massachusetts Institute of Technology Affiliate. Clinical trial data handling, HIPAA, and ethics protocols.', 'https://www.citiprogram.org/verify/?k56a0e057-078f-4fcb-931c-35d6abd67ca3-70963231', 'credential', 'MIT Affiliate / CITI', '2025-07', '2025-07', '["CITI Program","Human Subjects","MIT Affiliate","Clinical Ethics","MIMIC-IV"]', 90, 1, 1725667200),
('cert:michiganx-py4e', 'certification', 'University of Michigan — Programming for Everybody (Python)', 'Verified Certificate in Python programming foundations, data structures, conditional execution, and algorithm design from Univ. of Michigan / edX (Charles Severance). Verification ID: cb80bebc7b7044fe85f6a17f2282e12e.', 'https://courses.edx.org/certificates/cb80bebc7b7044fe85f6a17f2282e12e', 'credential', 'University of Michigan / edX', '2021', '2021', '["Python","Programming","University of Michigan","edX","Computer Science"]', 88, 1, 1725667200),
('cert:glasgow-cdss', 'certification', 'Data Mining of Clinical Databases - 1 (CDSS)', 'Clinical Decision Support Systems (CDSS) & large-scale ICU EHR data mining certification.', 'https://www.gla.ac.uk', 'credential', 'University of Glasgow', '2025-07', '2025-07', '["Clinical AI","EHR","CDSS","Healthcare","Data Mining","Glasgow"]', 85, 1, 1725667200),
('cert:glasgow-dl-ehr', 'certification', 'Deep Learning in Electronic Health Record', 'Advanced deep learning models for longitudinal electronic health records, temporal sequence modeling, and clinical risk prediction.', 'https://www.gla.ac.uk', 'credential', 'University of Glasgow', '2026', '2026', '["Deep Learning","EHR","Clinical ML","Glasgow","Bioinformatics"]', 84, 1, 1725667200),

-- Projects
('proj:cryptograph', 'project', 'CryptoGraph Analytics — Ensemble Forecasting & Real-Time Analytics', 'Full-stack platform ingesting Binance WebSocket data, computing indicators (RSI, MACD, volatility) for 100+ crypto assets. Ensemble ML pipeline combining Spatio-Temporal GCN for asset correlation, LSTM for sequential patterns, and NeuralProphet for temporal decomposition. Mixture-of-Agents trading swarm with SHAP attribution and Groq LLaMA 3.3.', 'https://github.com/PriyanshGadia', 'repo', 'Self-Directed', '2024', 'Present', '["Graph Neural Networks","PyTorch","FastAPI","Next.js 14","WebSockets","ST-GCN"]', 100, 1, 1725667200),
('proj:rso', 'project', 'Respiratory Support Optimization — Biomedical ML Research', 'Interdisciplinary research developing a machine learning-based approach to detect clinically invisible pressure transients during ICU ventilation. Processed 200 Hz waveforms across 50,920 MIMIC-IV patient records with esophageal pressure ground truth under leave-one-patient-out cross-validation.', 'https://github.com/PriyanshGadia/Respiratory-Support-Optimization', 'repo', 'Biomedical ML Research', '2025-12', 'Present', '["Biomedical ML","Physiological Waveforms","MIMIC-IV","SciPy","ICU Ventilator"]', 98, 1, 1725667200),
('proj:idp', 'project', 'Intelligent Document Processing & Insight Engine', 'Document intelligence platform with content-aware routing: TF-IDF/XGBoost classification, LayoutLMv3 table extraction, DistilBERT sentiment, and LLM streaming. Lazy model loading with LRU caching (~150 MB cold start) and content-hash prediction caching for O(1) repeated inference.', 'https://github.com/PriyanshGadia', 'repo', 'Enterprise AI', '2025', '2026', '["LayoutLMv3","FastAPI","XGBoost","DistilBERT","Document AI","Ollama"]', 92, 1, 1725667200),
('proj:tesla-prophet', 'project', 'Tesla Stock Price Prediction using Facebook Prophet', 'Created a Facebook Prophet Model forecasting the stock price of Tesla 30 days into the future and evaluated using Google Finance automation in Google Sheets.', 'https://coursera.org/verify/U1T7WE8IW6BT', 'credential', 'Coursera Project', '2025-04', '2025-04', '["Facebook Prophet","Time-Series","Google Finance","Tesla","Forecasting"]', 88, 1, 1725667200),
('proj:forms-bulk', 'project', 'Google Forms Bulk Responder', 'Automatically extracts the structure of a Google Form and submits high-concurrency randomized responses for load testing, fuzzing, and synthetic test-data generation.', 'https://github.com/PriyanshGadia/Google-Forms-Bulk-Responder', 'repo', 'Automation Tool', '2026-01', 'Present', '["Automation","Reverse Engineering","Load Testing","Python","Testing"]', 85, 1, 1725667200),
('proj:argus', 'project', 'Argus — Institutional Quantitative & RegTech OS', '11-package monorepo for quant asset management: feature store (path signatures, rough vol), alpha models (Mamba-3 + GAT), and strict anti-overfitting protocol (DSR/PBO, CSCV).', 'https://github.com/PriyanshGadia/Argus', 'repo', 'Quant Research', '2025', 'Present', '["Quantitative Finance","PyTorch","Mamba","GAT","Risk Budgeting","RegTech"]', 98, 1, 1725667200),
('proj:physionet', 'project', 'PhysioNet Challenge 2026 — Cognitive Impairment Prediction', 'Predicting cognitive impairment across 6,600 PSG records (3 hospital sites); extracted 120+ sleep/EEG/HRV features with dual-layer age residualization (fage_z + post-hoc gamma) in Dockerized pipeline.', 'https://github.com/PriyanshGadia', 'repo', 'PhysioNet / CinC', '2026', 'Present', '["PhysioNet","LightGBM","XGBoost","Docker","Biomedical ML","Sleep EEG"]', 96, 1, 1725667200),
('proj:gpt2', 'project', 'GPT-2 From Scratch — Autoregressive Transformer in PyTorch', 'Autoregressive transformer architecture (multi-head causal self-attention, learned positional embeddings, layer normalization, causal masking) implemented end-to-end in pure PyTorch.', 'https://github.com/PriyanshGadia', 'repo', 'Deep Learning Research', '2024', '2024', '["PyTorch","Transformers","GPT-2","Attention","Deep Learning"]', 90, 1, 1725667200),
('proj:cave', 'project', 'Cave — VAULT-01 Procedural 3D WebGL Engine', 'Real-time procedural WebGL engine built without raster assets. Custom GLSL PBR shader stack, raymarched volumetric fog, and interactive tabletop cyberdeck terminals.', 'https://github.com/PriyanshGadia/Cave', 'repo', 'Computer Graphics', '2026', 'Present', '["WebGL","Three.js","GLSL","PBR","Procedural Geometry"]', 86, 1, 1725667200),

-- Skills & Technical Domains
('skill:languages', 'skill', 'Languages: Python, SQL, C, C++, Java, R, MATLAB, TypeScript, JavaScript', 'Production expertise across Python, SQL (PostgreSQL, SQLite), C, C++, Java, R, MATLAB, TypeScript, and modern JavaScript.', 'https://github.com/PriyanshGadia', 'repo', 'Core Languages', '2021', 'Present', '["Python","SQL","C++","Java","R","MATLAB","TypeScript"]', 100, 1, 1725667200),
('skill:ml-analytics', 'skill', 'ML & Analytics: PyTorch, scikit-learn, XGBoost, LSTM, ST-GCN, Prophet, SHAP', 'Deep learning architectures (ST-GCN, LSTM, NeuralProphet), model explainability (SHAP), time-series forecasting, pandas, NumPy, SciPy.', 'https://github.com/PriyanshGadia', 'repo', 'Machine Learning', '2022', 'Present', '["PyTorch","scikit-learn","XGBoost","LSTM","ST-GCN","SHAP","SciPy"]', 98, 1, 1725667200),
('skill:frameworks-systems', 'skill', 'Frameworks & Systems: FastAPI, Next.js 14, Docker, Redis, WebSockets', 'Full-stack production web architectures, async APIs (FastAPI), real-time WebSockets, Redis caching, SQLAlchemy, Prometheus, Sentry observability.', 'https://github.com/PriyanshGadia', 'repo', 'Systems & Cloud', '2023', 'Present', '["FastAPI","Next.js 14","Docker","Redis","WebSockets","Observability"]', 92, 1, 1725667200),
('skill:cad-robotics', 'skill', 'Machine Design & CAD/CAM: Autodesk (Inventor, Fusion 360), KeyShot, CNC', 'Parametric mechanical design, Autodesk Inventor, Fusion 360, KeyShot rendering, CNC machining (milling & lathe), Applied Thermodynamics & Fluid Mechanics.', 'https://www.djsce.ac.in', 'link', 'Mechanical & Robotics', '2023', 'Present', '["CAD/CAM","Autodesk","Fusion 360","KeyShot","CNC","Robotics"]', 90, 1, 1725667200),
('skill:finance-quant', 'skill', 'Financial Valuation, Portfolio Analysis & Economical Management', 'Quantitative risk budgeting, portfolio valuation, econometric modeling, automated financial forecasting pipelines, and market microstructure analysis.', 'https://github.com/PriyanshGadia', 'repo', 'Quantitative Finance', '2023', 'Present', '["Financial Valuation","Portfolio Analysis","Econometrics","Risk Management"]', 88, 1, 1725667200),
('skill:photography', 'skill', 'Photography & Visual Media (Sam Bagli Mentorship, Adobe Suite)', '2 years formal photography study under mentor Sam Bagli + 2 years advanced practice & active hobby. Portrait, event, product, nature, sports. Tools: Adobe Lightroom, Photoshop, Canva, Filmora.', 'https://kccollege.edu.in', 'link', 'Sam Bagli Mentorship', '2020', 'Present', '["Photography","Adobe Lightroom","Photoshop","Canva","Filmora","Visual Media"]', 86, 1, 1725667200),
('skill:creative-arts', 'skill', 'Visual Arts & Creative Expression: Sketching, Singing, Dancing', 'Fine arts & illustration with dedicated Instagram sketch portfolio. Qualified UCEED 2023 (National Design Entrance Examination). Passionate performer across freehand drawing, vocal singing, and dance.', 'https://instagram.com', 'link', 'Creative Arts / UCEED', '2020', 'Present', '["Visual Arts","Sketching","Illustration","UCEED","Creative Arts"]', 84, 1, 1725667200);

-- 8. RS3 · Holo-Calendar & Meeting Booking Engine
CREATE TABLE IF NOT EXISTS calendar_cache (
    id TEXT PRIMARY KEY DEFAULT 'freebusy',
    payload TEXT NOT NULL,
    cached_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS booking_requests (
    id TEXT PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    start_iso TEXT NOT NULL,
    end_iso TEXT NOT NULL,
    google_event_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',   -- pending | created | failed
    ip_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_booking_ip ON booking_requests(ip_hash, created_at);

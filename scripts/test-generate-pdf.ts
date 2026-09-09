import * as fs from 'fs';
import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';

function cleanWinAnsi(str: string): string {
  if (!str) return '';
  return str
    .replace(/[γΓ]/g, 'gamma')
    .replace(/[αΑ]/g, 'alpha')
    .replace(/[βΒ]/g, 'beta')
    .replace(/[λΛ]/g, 'lambda')
    .replace(/[μΜ]/g, 'mu')
    .replace(/[σΣ]/g, 'sigma')
    .replace(/[θΘ]/g, 'theta')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•]/g, '-')
    .replace(/[·]/g, '|')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const safeText = cleanWinAnsi(text);
  const words = safeText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const w = font.widthOfTextAtSize(testLine, size);
    if (w > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateTestPdf(templateId: string = 'quant-research'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const left = 38;
  const right = width - 38;
  const contentW = right - left;
  let y = height - 34;

  const navy = rgb(0.12, 0.23, 0.54);
  const dark = rgb(0.06, 0.09, 0.16);
  const textGray = rgb(0.2, 0.24, 0.32);
  const lineGray = rgb(0.78, 0.82, 0.88);
  const blueLink = rgb(0.11, 0.31, 0.85);

  function safeDraw(text: string, opts: any) {
    const safe = cleanWinAnsi(text);
    page.drawText(safe, opts);
    return safe;
  }

  function addLink(rect: [number, number, number, number], url: string) {
    if (!url) return;
    try {
      const linkAnnot = doc.context.register(doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: rect,
        Border: [0, 0, 0],
        A: doc.context.obj({ Type: 'Action', S: 'URI', URI: url }),
      }));
      const existing = page.node.Annots();
      page.node.set(PDFName.of('Annots'), doc.context.obj([...(existing ? existing.asArray() : []), linkAnnot]));
    } catch {}
  }

  function checkPage(needed: number) {
    if (y - needed < 32) {
      page = doc.addPage([595.28, 841.89]);
      y = height - 34;
    }
  }

  function drawSection(title: string) {
    checkPage(30);
    y -= 8;
    safeDraw(title, { x: left, y, size: 10.5, font: bold, color: navy });
    y -= 3;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.6,
      color: lineGray,
    });
    y -= 10;
  }

  // 1. Header
  const nameStr = 'Priyansh Gadia';
  const nameW = bold.widthOfTextAtSize(nameStr, 22);
  safeDraw(nameStr, { x: (width - nameW) / 2, y, size: 22, font: bold, color: dark });
  y -= 16;

  const subMap: Record<string, string> = {
    'quant-research': 'ML Engineer  |  Quantitative Research  |  Full-Stack AI Systems',
    'fullstack-ai': 'Full-Stack AI Engineer  |  Distributed Systems  |  Production ML',
    'robotics-mech': 'Robotics Engineer  |  Autonomous Systems  |  CAD / Mechanical Design',
    'exec-clean': 'Dual-Degree Technologist  |  AI Systems  |  Creative Media',
  };
  const subStr = cleanWinAnsi(subMap[templateId] || subMap['quant-research']);
  const subW = bold.widthOfTextAtSize(subStr, 9.5);
  safeDraw(subStr, { x: (width - subW) / 2, y, size: 9.5, font: bold, color: navy });
  y -= 14;

  const contactStr = cleanWinAnsi('Mumbai, India  |  +91 8104521541  |  gadiapriyansh@gmail.com  |  LinkedIn  |  GitHub');
  const contactW = font.widthOfTextAtSize(contactStr, 8.5);
  safeDraw(contactStr, { x: (width - contactW) / 2, y, size: 8.5, font, color: textGray });
  
  // Link annotations on contact line
  const startX = (width - contactW) / 2;
  const emailOff = font.widthOfTextAtSize('Mumbai, India  |  +91 8104521541  |  ', 8.5);
  const emailW = font.widthOfTextAtSize('gadiapriyansh@gmail.com', 8.5);
  addLink([startX + emailOff, y - 2, startX + emailOff + emailW, y + 10], 'mailto:gadiapriyansh@gmail.com');

  const liOff = emailOff + emailW + font.widthOfTextAtSize('  |  ', 8.5);
  const liW = font.widthOfTextAtSize('LinkedIn', 8.5);
  addLink([startX + liOff, y - 2, startX + liOff + liW, y + 10], 'https://linkedin.com/in/priyanshgadia');

  const ghOff = liOff + liW + font.widthOfTextAtSize('  |  ', 8.5);
  const ghW = font.widthOfTextAtSize('GitHub', 8.5);
  addLink([startX + ghOff, y - 2, startX + ghOff + ghW, y + 10], 'https://github.com/PriyanshGadia');

  y -= 4;

  // 2. Summary
  drawSection('SUMMARY');
  const summaryMap: Record<string, string> = {
    'quant-research': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) shipping production AI and quantitative systems end-to-end - from research hypothesis to deployed containerized infrastructure. Architected Argus (institutional quant monorepo with strict DSR/PBO anti-overfitting discipline), CryptoGraph Analytics (live real-time platform forecasting 107 crypto assets), and clinical ML models validated across 50,920 ICU records. Combines deep mathematical rigor (PyTorch, GNNs, state spaces) with enterprise engineering (FastAPI, Docker, Next.js 14) to build robust, high-conviction systems.',
    'fullstack-ai': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) engineering enterprise-grade full-stack AI platforms and microservices. Architected CryptoGraph Analytics with real-time WebSocket feeds across 107 crypto assets and Next.js 14 dashboards, and an Intelligent Document Processing engine with 1:1 OCI Cloud Adapter pattern under 150 MB RAM cold start. Expert in async APIs (FastAPI), Redis pub/sub, Dockerized deployments, and production MLOps.',
    'robotics-mech': 'Dual-degree engineer (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) bridging advanced robotics, machine learning, and precision mechanical design. Hands-on mastery of parametric CAD/CAM (Autodesk Inventor, Fusion 360), CNC manufacturing, FEA analysis, and autonomous robotics perception (ST-GCN graph neural networks, ROS). Strong academic grounding with Grade O across AI/ML, CAD/CAM, and FEA Laboratories.',
    'exec-clean': 'Dual-degree technologist (IIT Guwahati 9.25 GPA | DJSCE 8.23 GPA) combining deep technical AI rigor with visual media leadership and creative communication. Qualified national UCEED 2023 design exam with dedicated illustration portfolio; official photographer for Rotaract Club of KC College AGM 2022 and R.E.D. 2022 Mumbai youth fest. Proven leadership across cross-functional engineering, production AI, and visual arts.',
  };
  const sumLines = wrapText(summaryMap[templateId] || summaryMap['quant-research'], font, 8.5, contentW);
  for (const l of sumLines) {
    checkPage(12);
    safeDraw(l, { x: left, y, size: 8.5, font, color: textGray });
    y -= 11.2;
  }
  y -= 4;

  // 3. Technical Skills
  drawSection('TECHNICAL SKILLS');
  const skillGroups = [
    { label: 'Languages: ', val: 'Python, SQL (PostgreSQL, SQLite), C, C++, Java, R, MATLAB, TypeScript, JavaScript' },
    { label: 'ML & Deep Learning: ', val: 'PyTorch, LightGBM, XGBoost, scikit-learn, ST-GCN, LSTM, NeuralProphet, SHAP, SciPy' },
    { label: 'Quantitative & Risk: ', val: 'Mamba-3, GAT, Path Signatures, HRP, Kelly Sizing, Meucci Entropy Pooling, DSR/PBO, CPCV' },
    { label: 'Systems & Cloud: ', val: 'FastAPI, Next.js 14, Docker, Redis, Streamlit, PostgreSQL, WebSockets, Alembic, Prometheus' },
    { label: 'Platforms & Data: ', val: 'Oracle Cloud Infrastructure (Certified), Binance API, MIMIC-IV, Groq LLM API, ReportLab' },
  ];

  if (templateId === 'robotics-mech') {
    skillGroups.splice(2, 1, { label: 'Mechanical & CAD/CAM: ', val: 'Autodesk Inventor, Fusion 360, KeyShot, CNC Machining (Milling & Lathe), FEA' });
  } else if (templateId === 'exec-clean') {
    skillGroups.push({ label: 'Visual Media & Arts: ', val: 'Adobe Lightroom, Photoshop, Canva, Filmora, Photography, Sketching (UCEED 2023)' });
  }

  for (const sg of skillGroups) {
    checkPage(13);
    const labSafe = cleanWinAnsi(sg.label);
    const labW = bold.widthOfTextAtSize(labSafe, 8.5);
    safeDraw(labSafe, { x: left, y, size: 8.5, font: bold, color: dark });
    const valLines = wrapText(sg.val, font, 8.5, contentW - labW);
    safeDraw(valLines[0] || '', { x: left + labW, y, size: 8.5, font, color: textGray });
    y -= 11.5;
    for (let li = 1; li < valLines.length; li++) {
      checkPage(12);
      safeDraw(valLines[li], { x: left + labW, y, size: 8.5, font, color: textGray });
      y -= 11.5;
    }
  }
  y -= 4;

  // 4. Projects
  drawSection('PROJECTS');

  interface FeaturedProject {
    title: string;
    status: string;
    repoUrl: string;
    tech: string;
    bullets: string[];
  }

  const featuredProjects: FeaturedProject[] = [
    {
      title: 'Argus - Institutional Quantitative & RegTech Operating System',
      status: '[Ongoing]',
      repoUrl: 'https://github.com/PriyanshGadia/Argus',
      tech: 'Python 3.12, PyTorch, LightGBM, Streamlit, ReportLab, Alembic, Mypy strict, 73 unit tests',
      bullets: [
        'Architecting an 11-package monorepo for quantitative asset management: feature store (fractional differencing, rough volatility, path signatures), alpha models (RSMG-Net: Mamba-3 + GAT; RSMG-Lite: GBDT), and portfolio risk budgeting (HRP, meta-gated Kelly, Meucci entropy pooling).',
        'Enforced institutional anti-overfitting protocol (CSCV, Deflated Sharpe Ratio with N-trial penalty, PBO); built RegTech engine with SEBI Master Circular 2026 compliance, SHA-256 audit ledger, and automated equity research notes under Mypy strict typing.',
      ],
    },
    {
      title: 'CryptoGraph Analytics - Ensemble Forecasting & Real-Time Trading Platform',
      status: '[Live]',
      repoUrl: 'https://github.com/PriyanshGadia',
      tech: 'Python, PyTorch, FastAPI, Next.js 14, Docker, Redis, PostgreSQL (Supabase)',
      bullets: [
        'Architected a full-stack platform ingesting Binance WebSocket feeds, computing multi-modal indicators across 107 crypto assets streamed to a live Next.js 14 dashboard with interactive Recharts visualizers.',
        'Engineered an ensemble pipeline (ST-GCN multi-relational graphs x LSTM x NeuralProphet) gated by Sharpe ratio thresholds (> 1.5), integrated with a Mixture-of-Agents LLM explainability swarm and Redis/Docker backend.',
      ],
    },
    {
      title: 'Respiratory Support Optimization - Biomedical ML Research',
      status: '',
      repoUrl: 'https://github.com/PriyanshGadia/Respiratory-Support-Optimization',
      tech: 'Python, SciPy, scikit-learn, pandas, NumPy',
      bullets: [
        'Led a 3-phase study detecting clinically invisible ICU pressure transients; processed 200 Hz physiological waveforms validated against 50,920 MIMIC-IV patient records.',
        'Built the first patient-ventilator asynchrony detector anchored in esophageal pressure ground truth (PL = Paw - Pes) using bedside-only allowlist features under LOPO cross-validation across 1,405 synthetic runs.',
      ],
    },
  ];

  for (const fp of featuredProjects) {
    checkPage(40);
    // Project Title line
    const titleSafe = cleanWinAnsi(fp.title);
    safeDraw(titleSafe, { x: left, y, size: 9.5, font: bold, color: dark });
    let curX = left + bold.widthOfTextAtSize(titleSafe, 9.5) + 6;

    if (fp.status) {
      const stSafe = cleanWinAnsi(fp.status);
      safeDraw(stSafe, { x: curX, y, size: 8.5, font: oblique, color: rgb(0.3, 0.4, 0.5) });
      curX += oblique.widthOfTextAtSize(stSafe, 8.5) + 5;
    }

    const ghText = '[GitHub]';
    safeDraw(ghText, { x: curX, y, size: 8.5, font: bold, color: blueLink });
    const ghW = bold.widthOfTextAtSize(ghText, 8.5);
    addLink([curX, y - 2, curX + ghW, y + 10], fp.repoUrl);
    y -= 11.5;

    // Tech stack line
    checkPage(12);
    safeDraw(fp.tech, { x: left, y, size: 8.2, font: oblique, color: rgb(0.35, 0.4, 0.48) });
    y -= 10.5;

    // Bullets
    for (const b of fp.bullets) {
      const bulletLines = wrapText(b, font, 8.5, contentW - 14);
      checkPage(12);
      safeDraw('-', { x: left + 2, y, size: 8.5, font: bold, color: navy });
      safeDraw(bulletLines[0], { x: left + 12, y, size: 8.5, font, color: textGray });
      y -= 10.8;
      for (let bi = 1; bi < bulletLines.length; bi++) {
        checkPage(12);
        safeDraw(bulletLines[bi], { x: left + 12, y, size: 8.5, font, color: textGray });
        y -= 10.8;
      }
    }
    y -= 3;
  }

  // 5. Selected Technical Projects
  drawSection('SELECTED TECHNICAL PROJECTS');
  const selectedCompact = [
    {
      title: 'PhysioNet Challenge 2026',
      gh: 'https://github.com/PriyanshGadia',
      tech: 'LightGBM, XGBoost, Docker: ',
      desc: 'Predicting cognitive impairment across 6,600 PSG records (3 hospital sites); extracted 120+ sleep/EEG/HRV features with dual-layer age residualization (fage_z + post-hoc gamma) in a Dockerized pipeline.',
    },
    {
      title: 'Intelligent Document Processing Engine',
      gh: 'https://github.com/PriyanshGadia',
      tech: 'FastAPI, XGBoost, LayoutLMv3: ',
      desc: 'Enterprise doc intelligence with 1:1 OCI Cloud Adapter pattern, 4-tier IntelligentRouter, and SHA-256 prediction cache for O(1) response in <150 MB RAM.',
    },
    {
      title: 'GPT-2 From Scratch',
      gh: 'https://github.com/PriyanshGadia',
      tech: 'Python, PyTorch: ',
      desc: 'Autoregressive transformer (multi-head attention, positional embeddings, causal masking) implemented end-to-end in PyTorch.',
    },
  ];

  for (const sc of selectedCompact) {
    checkPage(24);
    safeDraw('-', { x: left + 2, y, size: 8.5, font: bold, color: navy });
    const scTitle = cleanWinAnsi(sc.title);
    safeDraw(scTitle, { x: left + 12, y, size: 8.5, font: bold, color: dark });
    let curX = left + 12 + bold.widthOfTextAtSize(scTitle, 8.5) + 3;

    if (sc.gh) {
      safeDraw('[GitHub]', { x: curX, y, size: 8, font: bold, color: blueLink });
      const wgh = bold.widthOfTextAtSize('[GitHub]', 8);
      addLink([curX, y - 2, curX + wgh, y + 10], sc.gh);
      curX += wgh + 4;
    }

    safeDraw('-', { x: curX, y, size: 8.5, font, color: textGray });
    curX += font.widthOfTextAtSize('- ', 8.5);

    const scTech = cleanWinAnsi(sc.tech);
    safeDraw(scTech, { x: curX, y, size: 8.5, font: oblique, color: rgb(0.35, 0.4, 0.48) });
    curX += oblique.widthOfTextAtSize(scTech, 8.5);

    const firstLineMax = contentW - (curX - left);
    const descWords = cleanWinAnsi(sc.desc).split(' ');
    let firstLine = '';
    let wordIdx = 0;
    while (wordIdx < descWords.length) {
      const test = firstLine ? `${firstLine} ${descWords[wordIdx]}` : descWords[wordIdx];
      if (font.widthOfTextAtSize(test, 8.5) > firstLineMax && firstLine) break;
      firstLine = test;
      wordIdx++;
    }
    safeDraw(firstLine, { x: curX, y, size: 8.5, font, color: textGray });
    y -= 10.8;

    const remaining = descWords.slice(wordIdx).join(' ');
    if (remaining) {
      const remLines = wrapText(remaining, font, 8.5, contentW - 12);
      for (const rl of remLines) {
        checkPage(12);
        safeDraw(rl, { x: left + 12, y, size: 8.5, font, color: textGray });
        y -= 10.8;
      }
    }
    y -= 2;
  }
  y -= 2;

  // 6. Education
  drawSection('EDUCATION');
  const eduItems = [
    {
      inst: 'Indian Institute of Technology Guwahati',
      date: 'Oct 2023 - Aug 2027',
      degree: 'B.Sc. (Hons) Data Science & Artificial Intelligence',
      gpa: 'GPA: 9.25 / 10.0',
      proof: 'https://iitg.ac.in/acad/admission/online/Bsc_DSAI_Curriculum.pdf',
    },
    {
      inst: 'Dwarkadas J. Sanghvi College of Engineering',
      date: 'Aug 2023 - Aug 2027',
      degree: 'B.Tech (Hons) Mechanical Engineering & Robotics',
      gpa: 'GPA: 8.23 / 10.0',
      proof: 'https://www.djsce.ac.in',
    },
  ];

  for (const ed of eduItems) {
    checkPage(24);
    // Line 1: Institution & Date
    const edInst = cleanWinAnsi(ed.inst);
    safeDraw(edInst, { x: left, y, size: 9.5, font: bold, color: dark });
    if (ed.proof) {
      const instW = bold.widthOfTextAtSize(edInst, 9.5);
      addLink([left, y - 2, left + instW, y + 10], ed.proof);
    }

    const edDate = cleanWinAnsi(ed.date);
    const dateW = font.widthOfTextAtSize(edDate, 8.5);
    safeDraw(edDate, { x: right - dateW, y, size: 8.5, font, color: textGray });
    y -= 11.5;

    // Line 2: Degree & GPA
    const edDeg = cleanWinAnsi(ed.degree);
    safeDraw(edDeg, { x: left, y, size: 8.5, font, color: textGray });
    const degW = font.widthOfTextAtSize(edDeg, 8.5);
    safeDraw('  |  ', { x: left + degW, y, size: 8.5, font, color: rgb(0.6, 0.65, 0.72) });
    const sepW = font.widthOfTextAtSize('  |  ', 8.5);
    safeDraw(ed.gpa, { x: left + degW + sepW, y, size: 8.5, font: bold, color: dark });
    y -= 12.5;
  }
  y -= 2;

  // 7. Certifications
  drawSection('CERTIFICATIONS');
  const certItems = [
    {
      title: 'Oracle Cloud Infrastructure 2025 Certified Data Science Professional',
      issuer: 'Oracle University',
      date: 'Oct 2025',
      url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=045EC65FDEB4B83DAFF5596C9995FB467E12374A19E8627EA37A14267A0E737B',
    },
    {
      title: 'CITI Human Subjects Research',
      issuer: 'MIT Affiliate',
      date: 'Jul 2025',
      url: 'https://www.citiprogram.org/verify/?k56a0e057-078f-4fcb-931c-35d6abd67ca3-70963231',
    },
    {
      title: 'Data Mining of Clinical Databases (CDSS)',
      issuer: 'University of Glasgow',
      date: 'Jul 2025',
      url: 'https://www.gla.ac.uk',
    },
    {
      title: 'University of Michigan - Programming for Everybody (Python)',
      issuer: 'edX ID: cb80bebc7b7044fe85f6a17f2282e12e',
      date: '2021',
      url: 'https://courses.edx.org/certificates/cb80bebc7b7044fe85f6a17f2282e12e',
    },
  ];

  for (const c of certItems) {
    checkPage(14);
    const titleStr = cleanWinAnsi(`${c.title} - `);
    safeDraw(titleStr, { x: left, y, size: 8.5, font: bold, color: dark });
    const tW = bold.widthOfTextAtSize(titleStr, 8.5);
    const issStr = cleanWinAnsi(c.issuer);
    safeDraw(issStr, { x: left + tW, y, size: 8.5, font, color: textGray });

    if (c.url) {
      addLink([left, y - 2, left + tW + font.widthOfTextAtSize(issStr, 8.5), y + 10], c.url);
    }

    const cDate = cleanWinAnsi(c.date);
    const cDateW = font.widthOfTextAtSize(cDate, 8.5);
    safeDraw(cDate, { x: right - cDateW, y, size: 8.5, font, color: textGray });
    y -= 11.5;
  }

  const bytes = await doc.save();
  return bytes;
}

async function main() {
  const bytes = await generateTestPdf('quant-research');
  fs.writeFileSync('Priyansh_Gadia_Resume_quant-research_v2.pdf', bytes);
  console.log('Successfully generated Priyansh_Gadia_Resume_quant-research_v2.pdf (size:', bytes.length, 'bytes)');
}

if (process.argv[1].endsWith('test-generate-pdf.ts')) {
  main().catch(console.error);
}

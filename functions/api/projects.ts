interface Env {
  WORKSHOP_DB: D1Database;
}

const DEFAULT_APPROVED_PROJECTS = [
  {
    id: 'gh:PriyanshGadia/Cave',
    source: 'github',
    repo_full: 'PriyanshGadia/Cave',
    title: 'Cave',
    tagline: 'VAULT-01 real-time procedural WebGL engine. Zero raster images, 60 FPS PBR renderer.',
    tags: ['WebGL', 'Three.js', 'TypeScript', 'Procedural', 'PBR'],
    stats: { stars: 0, forks: 0, lang: 'TypeScript' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 60, h: 50, label: 'CAVERN' },
        { type: 'rect', x: 105, y: 25, w: 60, h: 50, label: 'VAULT' },
        { type: 'line', from: [75, 50], to: [105, 50] },
        { type: 'circle', x: 90, y: 50, r: 8, label: 'DOOR' },
        { type: 'circle', x: 135, y: 50, r: 14, label: 'PEDESTAL' },
        { type: 'dim', from: [15, 105], to: [165, 105], text: 'TUNNEL 25m' },
        { type: 'rect', x: 25, y: 130, w: 130, h: 45, label: 'PBR SHADER STACK' }
      ]
    },
    sort_order: 1
  },
  {
    id: 'gh:PriyanshGadia/Argus',
    source: 'github',
    repo_full: 'PriyanshGadia/Argus',
    title: 'Argus',
    tagline: 'Autonomous telemetry & visual anomaly surveillance engine.',
    tags: ['Python', 'Computer Vision', 'Telemetry', 'Surveillance'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'circle', x: 50, y: 50, r: 24, label: 'OPTIC SENSOR' },
        { type: 'circle', x: 50, y: 50, r: 8 },
        { type: 'line', from: [74, 50], to: [110, 50] },
        { type: 'rect', x: 110, y: 28, w: 55, h: 44, label: 'CNN FILTER' },
        { type: 'line', from: [137, 72], to: [137, 115] },
        { type: 'rect', x: 95, y: 115, w: 75, h: 45, label: 'ALERT BUS' },
        { type: 'dim', from: [20, 180], to: [165, 180], text: '<15ms LATENCY' }
      ]
    },
    sort_order: 2
  },
  {
    id: 'gh:PriyanshGadia/physionet2026-unchartered-iitian',
    source: 'github',
    repo_full: 'PriyanshGadia/physionet2026-unchartered-iitian',
    title: 'PhysioNet 2026',
    tagline: 'Physiological multi-lead ECG time-series classification & cardiac outcome prediction.',
    tags: ['Python', 'ECG', 'Bioinformatics', 'Time-Series', 'PyTorch'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 50, h: 60, label: 'ECG 12-LEAD' },
        { type: 'line', from: [65, 55], to: [95, 55] },
        { type: 'rect', x: 95, y: 25, w: 70, h: 60, label: 'WAVELET DECOMP' },
        { type: 'line', from: [130, 85], to: [130, 115] },
        { type: 'circle', x: 130, y: 140, r: 22, label: 'ATTENTION' },
        { type: 'dim', from: [15, 185], to: [165, 185], text: '500Hz SAMPLING' }
      ]
    },
    sort_order: 3
  },
  {
    id: 'gh:PriyanshGadia/CryptoGraph_Analytics',
    source: 'github',
    repo_full: 'PriyanshGadia/CryptoGraph_Analytics',
    title: 'CryptoGraph',
    tagline: 'On-chain network topology analysis and transaction graph clustering.',
    tags: ['Python', 'Graph Theory', 'Blockchain', 'NetworkX'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'circle', x: 40, y: 45, r: 14, label: 'NODE-A' },
        { type: 'circle', x: 135, y: 45, r: 14, label: 'NODE-B' },
        { type: 'circle', x: 88, y: 115, r: 18, label: 'HUB' },
        { type: 'line', from: [50, 55], to: [78, 102] },
        { type: 'line', from: [125, 55], to: [98, 102] },
        { type: 'line', from: [54, 45], to: [121, 45] },
        { type: 'dim', from: [20, 165], to: [165, 165], text: 'FLOW MATRIX' }
      ]
    },
    sort_order: 4
  },
  {
    id: 'gh:PriyanshGadia/Respiratory-Support-Optimization',
    source: 'github',
    repo_full: 'PriyanshGadia/Respiratory-Support-Optimization',
    title: 'Ventilator AI',
    tagline: 'Closed-loop ventilator control & adaptive respiratory support optimization.',
    tags: ['Python', 'Medical AI', 'Control Systems', 'Optimization'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 55, h: 50, label: 'FLOW SENSOR' },
        { type: 'line', from: [70, 50], to: [105, 50] },
        { type: 'rect', x: 105, y: 25, w: 60, h: 50, label: 'PID CONTROLLER' },
        { type: 'line', from: [135, 75], to: [135, 110] },
        { type: 'circle', x: 135, y: 130, r: 18, label: 'VALVE' },
        { type: 'line', from: [117, 130], to: [42, 130] },
        { type: 'line', from: [42, 130], to: [42, 75] },
        { type: 'dim', from: [15, 175], to: [165, 175], text: 'PEEP REGULATION' }
      ]
    },
    sort_order: 5
  },
  {
    id: 'gh:PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
    source: 'github',
    repo_full: 'PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',
    title: 'Insight Engine',
    tagline: 'Multimodal document extraction, layout parsing & semantic vector synthesis.',
    tags: ['Python', 'NLP', 'OCR', 'Document AI', 'Embeddings'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 45, h: 65, label: 'DOC INGEST' },
        { type: 'line', from: [60, 55], to: [90, 55] },
        { type: 'rect', x: 90, y: 25, w: 75, h: 65, label: 'LAYOUT PARSER' },
        { type: 'line', from: [127, 90], to: [127, 120] },
        { type: 'circle', x: 127, y: 142, r: 20, label: 'EMBEDDINGS' },
        { type: 'dim', from: [15, 185], to: [165, 185], text: 'VECTOR RAG' }
      ]
    },
    sort_order: 6
  },
  {
    id: 'gh:PriyanshGadia/Google-Forms-Bulk-Responder',
    source: 'github',
    repo_full: 'PriyanshGadia/Google-Forms-Bulk-Responder',
    title: 'Form Dispatcher',
    tagline: 'Form schema reverse engineering & high-throughput concurrency load tester.',
    tags: ['Python', 'Automation', 'Reverse Engineering', 'Load Testing'],
    stats: { stars: 0, forks: 0, lang: 'Python' },
    diagram_spec: {
      shapes: [
        { type: 'rect', x: 15, y: 25, w: 60, h: 45, label: 'SCHEMA PROBE' },
        { type: 'line', from: [75, 47], to: [105, 47] },
        { type: 'rect', x: 105, y: 25, w: 60, h: 45, label: 'RANDOM SEED' },
        { type: 'line', from: [135, 70], to: [135, 105] },
        { type: 'rect', x: 80, y: 105, w: 85, h: 45, label: 'ASYNC POOL' },
        { type: 'dim', from: [15, 175], to: [165, 175], text: 'CONCURRENT HTTP' }
      ]
    },
    sort_order: 7
  }
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.WORKSHOP_DB;
    if (!db) {
      return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    const { results } = await db
      .prepare(
        'SELECT id, source, repo_full, title, tagline, tags, stats, readme_excerpt, diagram_spec, sort_order FROM projects WHERE visible = 1 AND review_state = ? ORDER BY sort_order ASC'
      )
      .bind('approved')
      .all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    const projects = results.map((row: any) => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags,
      stats: typeof row.stats === 'string' ? JSON.parse(row.stats || '{}') : row.stats,
      diagram_spec: typeof row.diagram_spec === 'string' && row.diagram_spec ? JSON.parse(row.diagram_spec) : row.diagram_spec,
    }));

    return new Response(JSON.stringify(projects), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify(DEFAULT_APPROVED_PROJECTS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};


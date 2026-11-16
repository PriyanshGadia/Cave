const projects = {
 graph:{category:'Graph forecasting',title:'CryptoGraph Analytics',body:'Forecasts 107 crypto assets with ST-GCN, LSTM, and NeuralProphet. FastAPI and WebSockets deliver the forecasts to the application.',facts:['Python and PyTorch','Graph and time-series ensembles'],href:'https://github.com/PriyanshGadia/CryptoGraph_Analytics',link:'View CryptoGraph code'},
 document:{category:'Document AI',title:'Document Intelligence',body:'A FastAPI service routes documents with TF-IDF and XGBoost, extracts tables with LayoutLMv3, and uses DistilBERT for sentiment analysis.',facts:['Layout-aware table extraction','Task-specific model routing'],href:'https://github.com/PriyanshGadia/Intelligent-Document-Processing-And-Insight-Engine',link:'View Document Intelligence code'},
 clinical:{category:'Clinical machine learning',title:'Respiratory AI',body:'Models respiratory mechanics from 200 Hz physiological waveforms and esophageal pressure. Validation holds out one patient at a time.',facts:['200 Hz clinical waveforms','Leave-one-patient-out validation'],href:'https://github.com/PriyanshGadia/Respiratory-Support-Optimization',link:'View Respiratory AI code'}
};

const argus = {category:'Quantitative research',title:'ARGUS',body:'An 11-package research system for feature engineering, risk budgeting, and strategy evaluation. It uses Deflated Sharpe Ratio and Probability of Backtest Overfitting to assess strategy selection bias.',facts:['Mamba-3 and graph attention','Path signatures and rough volatility features'],href:'https://github.com/PriyanshGadia/Argus',link:'View ARGUS code'};
const relics={
 'argus-eye':argus,
 compiler:argus,
 twins:{category:'Education',title:'Data science and robotics',body:'I study statistical inference and machine learning at IIT Guwahati and mechanical engineering and robotics at DJSCE Mumbai.',facts:['IIT Guwahati: 9.25/10 CPI','DJSCE Mumbai: 8.23/10 CGPA','Oracle Cloud Infrastructure 2025 Certified Data Science Professional'],href:'/portfolio/about-text.html#education',link:'Read education and certifications'},
 core:{category:'Graphics engineering',title:'WebGL portfolio',body:'The observatory uses procedural geometry, generated materials, and GPU lighting. Each chapter is rendered within the same scene.',facts:['Three.js and WebGL 2','Procedural steel and bronze'],href:'/portfolio/about-text.html',link:'Read the text portfolio'},
 throne:{category:'Contact',title:'Work with me',body:'Book a meeting to discuss a research or engineering role, or to review one of the projects.',facts:[],href:'#schedule',link:'Schedule a meeting'},
 table:{category:'Source code',title:'Engineering repositories',body:'Browse project code and implementation notes on GitHub.',facts:[],href:'https://github.com/PriyanshGadia?tab=repositories',link:'Browse repositories'},
 orrery:projects.graph,
 chronometer:{category:'Scheduling',title:'Meeting calendar',body:'Select a date and an available half-hour block. Adjacent blocks can be reserved together. The standard calendar offers the same booking options.',facts:[],href:'#schedule',link:'Open the schedule'},
 window:{category:'Graphics engineering',title:'Rose window',body:'A radial stone-and-bronze window lights the nave through animated shafts rendered in the scene.',facts:['Procedural geometry','Three.js and GLSL'],href:'/portfolio/about-text.html#skills',link:'Read the technical skills'},
 ...projects,
 'project-graph':projects.graph,
 'project-document':projects.document,
 'project-clinical':projects.clinical
};
export function initInspector({getScene}){
 const panel=document.getElementById('poi-inspector'),title=document.getElementById('poi-title'),facts=document.getElementById('poi-facts'),link=document.getElementById('poi-link');let opener=null;
 function close(){panel.hidden=true;getScene()?.resetCamera();opener?.focus({preventScroll:true})}
 function inspect(e){const item=relics[e.detail.name];if(!item)return;opener=document.activeElement;panel.hidden=false;panel.dataset.relic=e.detail.name;document.getElementById('poi-category').textContent=item.category;title.textContent=item.title;document.getElementById('poi-description').textContent=item.body;facts.replaceChildren(...item.facts.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));link.textContent=item.link;link.href=item.href;panel.querySelector('[data-close-inspector]').focus({preventScroll:true})}
 const key=e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();close()}};panel.querySelector('[data-close-inspector]').addEventListener('click',close);link.addEventListener('click',()=>{panel.hidden=true;getScene()?.resetCamera()});const reset=()=>{panel.hidden=true};addEventListener('executive:inspect',inspect);addEventListener('executive:reset',reset);addEventListener('keydown',key);
 return {dispose(){removeEventListener('executive:inspect',inspect);removeEventListener('executive:reset',reset);removeEventListener('keydown',key)}};
}

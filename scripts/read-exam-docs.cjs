const fs = require('fs');
const path = require('path');

async function run() {
  const dir = 'C:\\Users\\gadia\\OneDrive\\Documents\\EXAM DOCUMENTS';
  const targetFiles = [
    'Creative Resume CV.pdf',
    'MichiganX py4e101x Certificate _ edX.pdf',
    'Result of 60005230219 for Semester VI held in MAY , 2026.PDF',
    '12th Passing Certificate.pdf'
  ];

  for (const f of targetFiles) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) {
      console.log('Not found: ' + f);
      continue;
    }
    console.log('=== FILE: ' + f + ' ===');
    const buf = fs.readFileSync(p);
    const str = buf.toString('latin1');
    const texts = [];
    const re = /\(([^)]+)\)\s*Tj/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      texts.push(m[1]);
    }
    const txt = texts.join(' ');
    console.log('Sample Tj count:', texts.length);
    if (txt.length > 0) {
      console.log(txt.slice(0, 1000));
    } else {
      // Try Tj array / TJ
      const tjRe = /\[(.*?)\]\s*TJ/gs;
      const tjTexts = [];
      let tm;
      while ((tm = tjRe.exec(str)) !== null) {
        tjTexts.push(tm[1].replace(/\\/g, ''));
      }
      console.log('TJ sample:', tjTexts.join(' ').slice(0, 1000));
    }
  }
}
run();

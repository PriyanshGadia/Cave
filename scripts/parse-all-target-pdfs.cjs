const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extractPdfText(buf) {
  const str = buf.toString('binary');
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  let fullText = '';
  while ((m = re.exec(str)) !== null) {
    try {
      const raw = Buffer.from(m[1], 'binary');
      let inflated;
      try {
        inflated = zlib.inflateSync(raw).toString('latin1');
      } catch {
        try {
          inflated = zlib.inflateRawSync(raw).toString('latin1');
        } catch {
          inflated = raw.toString('latin1');
        }
      }
      const tjRe = /\((.*?)\)\s*Tj/g;
      let tm;
      while ((tm = tjRe.exec(inflated)) !== null) {
        fullText += tm[1] + ' ';
      }
      const tjaRe = /\[(.*?)\]\s*TJ/g;
      while ((tm = tjaRe.exec(inflated)) !== null) {
        // extract all (text) inside array
        const innerRe = /\((.*?)\)/g;
        let im;
        while ((im = innerRe.exec(tm[1])) !== null) {
          fullText += im[1] + ' ';
        }
      }
    } catch (e) {}
  }
  return fullText.replace(/\\([0-9]{3})/g, (match, oct) => String.fromCharCode(parseInt(oct, 8)))
                 .replace(/\\([()\\])/g, '$1')
                 .replace(/\s+/g, ' ');
}

const dir = 'C:\\Users\\gadia\\OneDrive\\Documents\\EXAM DOCUMENTS';
const files = [
  'Result of 60005230219 for Semester VI held in MAY , 2026.PDF',
  'Creative Resume CV.pdf',
  'MichiganX py4e101x Certificate _ edX.pdf',
  '10th School Board Marksheet.pdf'
];

for (const f of files) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    console.log('====================================');
    console.log('FILE:', f);
    console.log('====================================');
    const txt = extractPdfText(fs.readFileSync(p));
    console.log(txt.slice(0, 3000));
  }
}

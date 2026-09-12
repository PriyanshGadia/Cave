const fs = require('fs');
const code = fs.readFileSync('ls1_holo_data.js', 'utf8');
const match = code.match(/LS1_FRONT_DATA_URI\s*=\s*['"](data:image\/[^;]+;base64,[^'"]+)['"]/);
if (match) {
  const buf = Buffer.from(match[1].replace(/^data:image\/\w+;base64,/, ''), 'base64');
  fs.writeFileSync('front_tmp.png', buf);
  console.log('Saved front_tmp.png, size:', buf.length);
} else {
  console.log('Pattern not matched');
}

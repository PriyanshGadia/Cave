const { chromium } = require('playwright');

async function testNews() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMessages.push(`[PAGEERROR] ${err.message}`));
  
  await page.goto('http://localhost:8788/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 }).catch(async () => {
    // fallback to port 8000
    await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
  });

  await page.waitForFunction('window.__lab && window.__lab.state && window.__lab.state.ready', { timeout: 20000 });
  
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/geo/news');
    const data = await res.json();
    const ch = data.channels?.find(c => c.id === 'ddindia-in') || data.channels?.[0];
    if (window.__lab.openNewsDispatch) {
      window.__lab.openNewsDispatch(ch);
    }
    await new Promise(r => setTimeout(r, 3000));
    const video = document.getElementById('ls3-news-video');
    const iframe = document.getElementById('ls3-news-iframe');
    return {
      channel: ch,
      videoDisplay: video ? video.style.display : null,
      videoSrc: video ? video.src : null,
      videoPaused: video ? video.paused : null,
      videoReadyState: video ? video.readyState : null,
      videoNetworkState: video ? video.networkState : null,
      iframeDisplay: iframe ? iframe.style.display : null,
      iframeSrc: iframe ? iframe.src : null,
    };
  });
  
  console.log('Result:', result);
  console.log('Console logs:', consoleMessages.filter(m => m.includes('hls') || m.includes('Hls') || m.includes('LS3') || m.includes('error')));
  
  await browser.close();
}

testNews().catch(console.error);

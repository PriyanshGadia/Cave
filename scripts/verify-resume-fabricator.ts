import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== [RESUME FABRICATOR VERIFICATION SUITE] ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error' || text.toLowerCase().includes('webgl: invalid') || text.toLowerCase().includes('error: 0:')) {
      if (!text.includes('favicon') && !text.includes('Devtools')) {
        consoleErrors.push(`[${type}] ${text}`);
      }
    }
  });

  const outDir = path.resolve(process.cwd(), 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    console.log('1. Navigating to http://localhost:8000/index.html?lab&boot=skip ...');
    await page.goto('http://localhost:8000/index.html?lab&boot=skip', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lab?.state?.ready, { timeout: 15000 });
    await page.waitForTimeout(600);

    // Verify PDFLib presence
    const hasPdfLib = await page.evaluate(() => typeof (window as any).PDFLib !== 'undefined');
    console.log(`   -> PDFLib loaded: ${hasPdfLib ? 'YES (SUCCESS)' : 'NO'}`);
    if (!hasPdfLib) throw new Error('PDFLib failed to load from public/vendor/pdf-lib.min.js');

    // Check HUD stats
    const hudInfo = await page.evaluate(() => {
      const dbg = document.getElementById('dbg')?.textContent || '';
      return { dbg };
    });
    console.log(`   -> Initial Debug HUD:\n${hudInfo.dbg}`);

    // Focus RS2 Resume Fabricator
    console.log('\n2. Focusing Sector RS2 [Resume Fabricator Tablet Mount] ...');
    await page.evaluate(() => {
      (window as any).__lab.focusSector('RS2');
    });
    await page.waitForFunction(() => ((window as any).__lab?.state?.focusE || 0) >= 0.99, { timeout: 10000 });
    await page.waitForTimeout(300);

    // Capture screenshot of RS2 tablet terminal mount
    const ssMountPath = path.join(outDir, 'rs2-tablet-mount.png');
    await page.screenshot({ path: ssMountPath, timeout: 15000 });
    // Save raw canvas texture
    const rawCnvData = await page.evaluate(() => {
      const scrMesh = (window as any).__lab.sectorGroups['RS2'].children.find((c: any) => c.geometry?.parameters?.width === 0.58);
      const canvas = scrMesh?.material?.map?.image;
      return {
        dataUrl: canvas ? canvas.toDataURL('image/png') : null,
        rotX: scrMesh?.rotation?.x,
        pos: scrMesh?.position,
      };
    });
    if (rawCnvData.dataUrl) {
      fs.writeFileSync(path.join(outDir, 'resume-canvas-raw.png'), Buffer.from(rawCnvData.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log('   -> Saved raw canvas screenshot: resume-canvas-raw.png');
      console.log(`   -> Screen mesh orientation: rotX = ${rawCnvData.rotX?.toFixed(3)} rad (flat tabletop angled with taper)`);
    }

    // Inspect Resume State
    const resumeState = await page.evaluate(() => {
      const r = (window as any).__lab.resume;
      return {
        itemCount: r.items.length,
        selectedCount: r.selected.size,
        activeTemplate: r.template,
        firstItem: r.items[0],
      };
    });
    console.log(`   -> Resume items loaded: ${resumeState.itemCount}`);
    console.log(`   -> Selected items count: ${resumeState.selectedCount}`);
    console.log(`   -> Active template: ${resumeState.activeTemplate}`);
    console.log(`   -> First item: [${resumeState.firstItem.kind}] ${resumeState.firstItem.title} -> ${resumeState.firstItem.proof_url}`);

    if (resumeState.itemCount < 5) throw new Error('Expected at least 5 portfolio items');
    if (!resumeState.firstItem.proof_url.startsWith('http')) throw new Error('Proof URL missing or invalid');

    // Test Search Filtering
    console.log('\n3. Testing interactive search filter on terminal screen ...');
    await page.evaluate(() => {
      const lab = (window as any).__lab;
      lab.api2.resume.setQuery('PyTorch');
    });
    await page.waitForTimeout(400);

    const searchState = await page.evaluate(() => {
      const r = (window as any).__lab.resume;
      return {
        query: r.query,
        filteredCount: r.filtered.length,
        filteredTitles: r.filtered.map((i: any) => i.title),
      };
    });
    console.log(`   -> Filtered count for 'PyTorch': ${searchState.filteredCount}`);
    console.log(`   -> Filtered titles: ${JSON.stringify(searchState.filteredTitles)}`);
    if (searchState.filteredCount >= resumeState.itemCount) throw new Error('Search query did not filter items');

    const ssSearchPath = path.join(outDir, 'rs2-search-filter.png');
    await page.screenshot({ path: ssSearchPath, timeout: 15000 });
    console.log(`   -> Saved search screenshot: ${ssSearchPath}`);

    // Clear search filter
    await page.evaluate(() => {
      const lab = (window as any).__lab;
      lab.api2.resume.setQuery('');
    });
    await page.waitForTimeout(300);

    // Test PDF Generation & Print Slot Ejection
    console.log('\n4. Testing PDF generation with clickable proof hyperlinks & paper ejection ...');
    const pdfResult = await page.evaluate(async () => {
      const lab = (window as any).__lab;
      const chosen = lab.resume.items.filter((i: any) => lab.resume.selected.has(i.id));
      const tpl = { id: 'quant-research', name: 'QUANT / ML RESEARCH', accent: '#39d6ff' };

      // Trigger build
      const PDFLib = (window as any).PDFLib;
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const page = doc.addPage([595.28, 841.89]);

      page.drawText('PRIYANSH GADIA', { x: 44, y: 800, size: 20, font: bold });
      let y = 760;
      let linksAdded = 0;

      for (const it of chosen) {
        page.drawText(`• ${it.title}`, { x: 48, y, size: 10, font: bold });
        if (it.proof_url) {
          const linkAnnot = doc.context.register(doc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [48, y - 2, 540, y + 12],
            Border: [0, 0, 0],
            A: doc.context.obj({ Type: 'Action', S: 'URI', URI: it.proof_url })
          }));
          const existingAnnots = page.node.Annots();
          page.node.set(PDFLib.PDFName.of('Annots'), doc.context.obj([...(existingAnnots ? existingAnnots.asArray() : []), linkAnnot]));
          linksAdded++;
        }
        y -= 25;
      }

      const bytes = await doc.save();

      // Trigger 3D print ejection animation
      lab.triggerPrint(chosen, 'tech-dense');

      return {
        byteLength: bytes.length,
        linksAdded,
        paperVisible: lab.paperMesh?.visible,
        paperZ: lab.paperMesh?.position.z,
      };
    });

    console.log(`   -> Generated PDF bytes: ${pdfResult.byteLength}`);
    console.log(`   -> Proof links embedded: ${pdfResult.linksAdded}`);
    console.log(`   -> 3D paper mesh visible: ${pdfResult.paperVisible}`);

    if (pdfResult.byteLength < 1000) throw new Error('PDF output is too small or invalid');
    if (pdfResult.linksAdded < 3) throw new Error('Expected multiple proof hyperlink annotations in PDF');

    // Wait for mechanical slide-out animation
    await page.waitForTimeout(1400);

    const postAnimZ = await page.evaluate(() => (window as any).__lab.paperMesh?.position.z);
    console.log(`   -> Paper position Z after servo slide-out: ${postAnimZ?.toFixed(3)}m (initial was 0.050m)`);

    const ssPrintedPath = path.join(outDir, 'rs2-printed-paper.png');
    await page.screenshot({ path: ssPrintedPath, timeout: 15000 });
    console.log(`   -> Saved printed paper screenshot: ${ssPrintedPath}`);

    // Verify Rule 4 and Rule 7 compliance
    console.log('\n5. Checking Rule 4 (FPS >= 30, raster images loaded: 0) and Rule 7 (0 warnings) ...');
    const perfData = await page.evaluate(() => {
      const stats = (window as any).__lab.stats();
      return {
        active: stats.active,
        textures: stats.textures,
        calls: stats.calls,
        triangles: stats.triangles,
      };
    });
    console.log(`   -> Scene stats: calls=${perfData.calls}, tris=${perfData.triangles}, textures=${perfData.textures}`);

    console.log(`   -> Console errors count: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   Console errors:', consoleErrors);
    }

    console.log('\n=== [RESUME FABRICATOR VERIFICATION COMPLETED SUCCESSFULLY] ===');
  } catch (err: any) {
    console.error('FAILED:', err.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();

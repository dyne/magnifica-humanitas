// Development-only checker; production dependencies and browser checks belong to L3/L6.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const theme=path.resolve(process.env.MH_THEME_DIR || path.join(root,'../../../vite-theme'));
const {chromium}=await import(pathToFileURL(path.join(theme,'node_modules/playwright/index.mjs')));
const out=path.resolve(process.env.MH_STORYBOARD_EVIDENCE || path.join(root,'../../output/storyboards'));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.MH_CHROMIUM_PATH || chromium.executablePath()});
const results=[]; const issues=[];
try {
  for(const [width,height] of [[360,800],[1440,1000]]) for(const scale of [100,200]) for(const appearance of ['light','dark']) for(const motion of ['no-preference','reduce']) for(const view of ['entry','concept','trail','source','saved']) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:4285/?view=${view}&appearance=${appearance}`);
    await page.waitForFunction(()=>!document.querySelector('h1').textContent.includes('Reading storyboard'));
    await page.evaluate(scale=>document.documentElement.style.fontSize=`${scale}%`,scale);
    await page.evaluate(()=>document.fonts.ready);
    const report=await page.evaluate(()=>{
      const h=document.querySelector('h1');
      const controls=[...document.querySelectorAll('button, select, nav a, .concept-links a, .actions a')].filter(x=>x.getClientRects().length);
      return {title:h.textContent,overflow:document.documentElement.scrollWidth>innerWidth,mainCount:document.querySelectorAll('main').length,bodyFont:getComputedStyle(document.body).fontFamily,fontSize:getComputedStyle(document.body).fontSize,smallControls:controls.filter(x=>x.getBoundingClientRect().height<43).map(x=>x.textContent),svgHidden:[...document.querySelectorAll('svg')].every(x=>x.getAttribute('aria-hidden')==='true'),duration:getComputedStyle(document.documentElement).getPropertyValue('--dyne-duration').trim(),appearance:document.documentElement.dataset.dyneTheme,headings:[...document.querySelectorAll('main h1, main h2, main h3')].map(x=>x.textContent)};
    });
    const name=`${view}-${width}-${scale}-${appearance}-${motion}`;
    assert.equal(report.overflow,false,name); assert.equal(report.mainCount,1,name); assert.deepEqual(errors,[],name); assert.deepEqual(report.smallControls,[],name); assert.equal(report.appearance,appearance,name); assert.equal(report.svgHidden,true,name);
    if(motion==='reduce')assert.equal(report.duration,'0ms',name);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to reading',name);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'main',name);
    if(view==='trail'){
      await page.locator('#reveal').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#reveal').getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#feedback').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'reveal');
      await page.locator('#reveal').click();
    }
    if(view==='saved'){
      await page.locator('#remove').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'undo');
      assert.equal(await page.locator('#empty').isVisible(),true);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'remove');
    }
    if(motion==='no-preference'){
      await page.evaluate(async()=>{document.activeElement.blur();history.replaceState(null,'',location.pathname+location.search);window.scrollTo(0,0);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
      assert.equal(await page.evaluate(()=>window.scrollY),0,name);
      await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});
    }
    results.push({name,...report}); await page.close();
  }
  await fs.writeFile(path.join(out,'matrix.json'),JSON.stringify({environment:'Headless Playwright Chromium, Linux; CSS root font enlargement (not browser zoom)',results,issues},null,2)+'\n');
  console.log(`PASS ${results.length} layout/appearance/text/motion cases; 40 screenshots; native keyboard checks passed. Evidence: ${out}`);
} finally {await browser.close();}

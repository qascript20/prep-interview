import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext(),page=await context.newPage(),base='http://127.0.0.1:8796/';
try{
 await page.goto(base+'#/pilot');await page.locator('#pilot-research-consent').waitFor();assert.equal(await page.locator('#pilot-research-consent').isChecked(),false);await page.locator('#pilot-research-consent').check();await page.getByText('Research activity sharing enabled. Source code and explanations are excluded.',{exact:true}).waitFor();await page.locator('#pilot-research-consent').uncheck();await page.getByText('Research sharing withdrawn and recorded research events deleted.',{exact:true}).waitFor();console.log('PASS research opt-in and withdrawal');
 const id='2-01-find-duplicate-trade-ids-in-second-occurrence-order',url=base+'#/lab?domain=Investment+Banking&language=java&question='+id;
 await page.goto(url);await page.locator('.CodeMirror').waitFor();await page.locator('.CodeMirror').evaluate(el=>el.CodeMirror.setValue('// PRIVATE_WORKSPACE_A\npublic class Main {}'));await page.waitForTimeout(1000);
 await context.clearCookies();await page.reload();await page.locator('.CodeMirror').waitFor();assert(!(await page.locator('.CodeMirror').evaluate(el=>el.CodeMirror.getValue())).includes('PRIVATE_WORKSPACE_A'));console.log('PASS cached code is isolated when browser workspace identity changes');
 await page.goto(base+'#/pilot');await page.locator('[data-pilot-export]').waitFor();const downloading=page.waitForEvent('download');await page.locator('[data-pilot-export]').click();const download=await downloading;assert(download.suggestedFilename().endsWith('.ndjson'));const text=await readFile(await download.path(),'utf8');text.trim().split('\n').forEach(JSON.parse);assert(!text.includes('PRIVATE_WORKSPACE_A'));console.log('PASS private export contains only the active workspace');
 await page.locator('[data-pilot-delete]').click();await page.locator('[data-pilot-confirm-delete]').click();await page.locator('#pilot-research-consent').waitFor();const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('prepspace-v1')));assert.deepEqual(state.pilotDrafts,{});console.log('PASS deletion clears test-account server records and browser copies');
 for(const route of ['#/domains','#/languages','#/roles','#/rounds','#/round/introduction','#/round/coding?tab=questions','#/round/technical','#/round/manager','#/round/hr','#/concepts','#/best-practices','#/pilot-research']){await page.goto(base+route);await page.locator('main h1').first().waitFor();assert((await page.locator('main').innerText()).length>100);}
 console.log('PASS all public preparation routes render');
}finally{await browser.close();}

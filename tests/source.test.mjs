import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const json = path => JSON.parse(read(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const base = 'content/source/en/';
const corpus = json(`${base}corpus.json`);
const structure = json(`${base}structure.json`);
const manifest = json('research/source-manifest.json');

test('exact stable coverage of 245 paragraphs and 224 footnotes', () => {
  for (const [records, count, prefix] of [[corpus.paragraphs,245,'p'],[corpus.footnotes,224,'n']]) {
    assert.equal(records.length,count);
    assert.equal(new Set(records.map(r => r.id)).size,count);
    records.forEach((r,i) => {
      assert.equal(r.number,i+1);
      assert.equal(r.id,`${prefix}${String(i+1).padStart(3,'0')}`);
      assert.equal(r.sha256,sha(r.text));
      assert.ok(r.text.trim().length>0);
      assert.ok(r.pages.every(p => p>=1 && p<=47));
      assert.doesNotMatch(r.text,/22\/07\/26|https:\/\/www\.vatican\.va|\uFFFD|Ã|â€|Copyright ©/);
    });
  }
});

test('all footnotes resolve in both directions, including multiple references', () => {
  for (const p of corpus.paragraphs) {
    const refs = [...new Set([...p.text.matchAll(/\[(\d+)\]/g)].map(m => `n${m[1].padStart(3,'0')}`))];
    assert.deepEqual(p.footnoteIds,refs);
    for (const id of refs) assert.ok(corpus.footnotes.find(n => n.id===id)?.paragraphIds.includes(p.id));
  }
  for (const n of corpus.footnotes) {
    assert.ok(n.paragraphIds.length);
    assert.deepEqual(n.paragraphIds,corpus.paragraphs.filter(p => p.footnoteIds.includes(n.id)).map(p=>p.id));
  }
});

test('chapter/section coverage and headings are separate from paragraph bodies', () => {
  assert.deepEqual(structure.chapters.map(c=>[c.start,c.end]),[[1,16],[17,45],[46,89],[90,130],[131,181],[182,228],[229,245]]);
  assert.equal(structure.headings.length,81);
  for (const p of corpus.paragraphs) {
    const chapter=structure.chapters.find(c=>c.id===p.chapterId);
    assert.ok(chapter.start<=p.number && p.number<=chapter.end);
    assert.ok(p.sectionIds.length);
    for (const id of p.sectionIds) {
      const s=structure.sections.find(s=>s.id===id);
      assert.ok(s && s.start<=p.number && p.number<=s.end && s.chapterId===p.chapterId);
    }
    for (const h of structure.headings.filter(h => h.start===p.number+1)) assert.ok(!p.text.endsWith(h.title),`heading leaked into ${p.id}: ${h.title}`);
  }
});

test('frozen artifacts match manifest checksums', () => {
  for (const artifact of manifest.artifacts) assert.equal(sha(read(artifact.path)),artifact.sha256,artifact.path);
  assert.equal(manifest.verification.paragraphs,245);
  assert.equal(manifest.verification.footnotes,224);
});

test('entire PDF corpus and online comparison reproduce without owner files', () => {
  const result=spawnSync('python3',['scripts/ingest-source.py','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('PDF samples cover opening and closing of every chapter', () => {
  const samples=json('research/source-verification.json');
  assert.deepEqual(samples.chapters.map(s=>s.chapterId),structure.chapters.map(c=>c.id));
  for (const s of samples.chapters) for (const sample of [s.opening,s.closing]) {
    const p=corpus.paragraphs.find(p=>p.id===sample.paragraphId);
    assert.equal(p.text.startsWith(sample.firstWords),true);
    assert.equal(p.text.endsWith(sample.lastWords),true);
    assert.equal(p.sha256,sample.sha256);
  }
});

test('official comparison preserves the known extra web footnote, never replaces PDF', () => {
  const comparison=json(`${base}comparison.json`);
  assert.equal(comparison.paragraphsCompared,245);
  assert.deepEqual(comparison.differences.map(d=>d.paragraphId),['p082']);
  const d=comparison.differences[0];
  assert.equal(d.pdfText,corpus.paragraphs[81].text);
  assert.match(d.officialHtmlText,/\[110\] \[10\]/);
  assert.doesNotMatch(d.pdfText,/\[10\]/);
});

test('parser rejects damaged heading, missing/duplicate body, and missing note', () => {
  const result=spawnSync('python3',['tests/parser-contract.py'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, validateContent } from '../scripts/validate-editorial.mjs';
const content=loadContent();
const record=n=>content.coverage.records[n-1];
const reject=(mutate,expected)=>{
 const changed=structuredClone(content);mutate(changed);
 assert.ok(validateContent(changed).some(e=>e.includes(expected)),`missing expected validation: ${expected}`);
};

test('all 245 individual decisions and typed concept/relation references validate',()=>{
 assert.deepEqual(validateContent(content),[]);
 assert.equal(content.coverage.records.length,245);
 assert.equal(content.concepts.concepts.length,27);
 assert.equal(content.relations.relations.length,44);
 assert.equal(new Set(content.coverage.records.map(r=>r.rationale)).size,245);
});

test('each mixed devotional exclusion has exact offsets, a reason, and sentence context',()=>{
 const exclusions=content.coverage.records.flatMap(r=>r.exclusions);
 assert.equal(exclusions.length,18);
 for (const e of exclusions) {
  assert.ok(e.sentenceContexts.length>0);
  assert.ok(e.preserve.text.length>30);
  const p=content.corpus.paragraphs.find(p=>p.id===e.sourceSpan.paragraphId);
  assert.equal(p.text.slice(e.sourceSpan.start,e.sourceSpan.end),e.sourceSpan.text);
 }
});

test('source foundations remain optional, attributed and distinct from exclusion',()=>{
 const premises=content.coverage.records.flatMap(r=>r.faithPremises);
 assert.ok(premises.length>=75);
 for (const f of premises) {
  assert.equal(f.kind,'source-annotation');
  assert.equal(f.placement,'optional-foundations');
  assert.ok(f.sourceRefs.includes(f.sourceSpan.paragraphId));
 }
 for (const n of [48,49,50,88,127,232,234,242,243]) {
  assert.equal(record(n).disposition,'context');
  assert.ok(record(n).faithPremises.length);
 }
});

test('high-risk qualifications and institutional self-criticism are protected',()=>{
 const highRisk=[52,66,68,69,70,71,72,86,87,88,89,99,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,138,149,150,151,152,153,154,165,176,177,178,179,197,198,199,200,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245];
 for (const n of highRisk) {
  assert.ok(record(n).necessaryQualifications.length,`qualification missing from p${n}`);
  assert.notEqual(record(n).disposition,'omit-devotional');
 }
 for (const n of [86,87,89,138,176,177,244]) assert.ok(record(n).protectedSpans.length);
 assert.equal(record(176).exclusions.length,0,'institutional request for pardon must remain');
 assert.equal(record(138).exclusions.length,0,'reporters and Church responsibility must remain');
 assert.equal(record(244).exclusions.length,0,'victims perspective is substantive');
 assert.match(record(244).protectedSpans.map(s=>s.sourceSpan.text).join(' '),/widow, the orphan, the stranger, the wounded child, the exile and the fugitive/);
});

test('prayer narratives and unrelated uses do not trigger mechanical deletion',()=>{
 for (const n of [2,7,8,15,106,121,125,148,173,176,177,199,201,244]) assert.equal(record(n).exclusions.length,0,`unexpected keyword deletion in p${n}`);
 assert.match(content.corpus.paragraphs[120].text,/Lord’s Prayer/);
 assert.match(content.corpus.paragraphs[147].text,/prayer and work/);
 // In §241 only the reader-facing clause is removed; Nehemiah's action remains.
 assert.deepEqual(record(241).exclusions.map(e=>e.sourceSpan.text),['prayer and']);
});

test('consciousness, family and life-position claims retain attribution and scope',()=>{
 for (const n of [55,99,165,198,233]) {
  assert.equal(record(n).authority.author,'Leo XIV');
  assert.equal(record(n).authority.scientificConsensusClaim,false);
 }
 for (const n of [55,165]) assert.equal(record(n).authority.claimStatus,'source-normative-position');
 for (const n of [99,198,233]) assert.equal(record(n).authority.claimStatus,'source-anthropological-claim');
 assert.match(record(99).rationale,/rather than settled scientific consensus/);
 assert.match(record(165).protectedSpans[0].sourceSpan.text,/between a man and a woman/);
 assert.match(record(55).necessaryQualifications[0].text,/abortion and euthanasia/);
});

test('relations form a connected explanatory atlas with explicit direction and evidence',()=>{
 const ids=content.concepts.concepts.map(c=>c.id);
 const visited=new Set([ids[0]]);
 let previous=-1;
 while (previous!==visited.size) {
  previous=visited.size;
  for (const r of content.relations.relations) {
   if (visited.has(r.from)) visited.add(r.to);
   if (visited.has(r.to)) visited.add(r.from);
   assert.equal(r.directed,true);
   assert.equal(r.explanation.kind,'editorial-interpretation');
   assert.ok(r.explanation.sourceRefs.length);
  }
 }
 assert.equal(visited.size,ids.length);
});

test('validator rejects incomplete coverage, duplicate rationales and dangling references',()=>{
 reject(c=>c.coverage.records.pop(),'245 records');
 reject(c=>c.coverage.records[1].rationale=c.coverage.records[0].rationale,'individually authored');
 reject(c=>c.coverage.records[0].sourceRefs=['p246'],'unknown source');
 reject(c=>c.coverage.records[0].conceptIds=['invented-concept'],'unknown concept');
 reject(c=>c.relations.relations[0].to='invented-concept','valid distinct endpoints');
 reject(c=>c.relations.relations[0].type='nearby','typed relation');
});

test('validator rejects invented, spliced or mislabeled quotations/paraphrases',()=>{
 reject(c=>c.concepts.concepts[0].sourceQuotation.text+=' fabricated','quotation differs');
 reject(c=>c.concepts.concepts[0].sourceQuotation.text='These aspects ... diminished.','quotation differs');
 reject(c=>c.concepts.concepts[0].sourceQuotation.kind='paraphrase','labelled quotations');
 reject(c=>c.concepts.concepts[0].definition.kind='quotation','labelled paraphrase');
 reject(c=>c.relations.relations[0].explanation.kind='quotation','labelled editorial-interpretation');
});

test('validator rejects bad exclusions, erased substantive spans and source drift',()=>{
 reject(c=>c.coverage.records[2].exclusions[0].sourceSpan.start++,'quotation differs');
 reject(c=>c.coverage.records[2].exclusions[0].sentenceContexts=[],'sentence-level context required');
 reject(c=>c.coverage.records[2].exclusions[0].preserve.text='','text required');
 reject(c=>c.coverage.records[175].disposition='omit-devotional','cannot be omitted wholesale');
 reject(c=>c.coverage.records[243].disposition='omit-devotional','cannot be omitted wholesale');
 reject(c=>c.coverage.records[0].sourceSha256='different-edition','different source body');
 reject(c=>c.coverage.records[0].faithPremises[0].placement='main','optional and attributed');
});

test('the final peace commitment and daily sharing survive direct prayer exclusions',()=>{
 for (const n of [228,231,234,235,243,245]) {
  assert.ok(record(n).exclusions.length);
  assert.ok(record(n).protectedSpans.length);
  for (const e of record(n).exclusions) for (const p of record(n).protectedSpans) {
   assert.ok(e.sourceSpan.end<=p.sourceSpan.start || e.sourceSpan.start>=p.sourceSpan.end);
  }
 }
 assert.match(record(228).protectedSpans[0].sourceSpan.text,/relationships and in society/);
 assert.match(record(245).protectedSpans[0].sourceSpan.text,/sharing who we are and what we have/);
 assert.equal(record(235).exclusions[0].scope,'liturgical-formula');
 assert.equal(record(235).exclusions[0].sourceSpan.text,'The “Amen” that we say in the liturgy,');
});

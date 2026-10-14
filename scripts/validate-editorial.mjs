import { readFileSync } from 'node:fs';
import { localeRegistry } from './locales.mjs';
import { pathToFileURL } from 'node:url';

export function loadContent(locale = 'en') {
  if (!localeRegistry.some(entry => entry.id === locale)) throw new Error(`Unknown locale ${locale}`);
  const editorial = locale === 'en' ? 'content/editorial' : `content/editorial/${locale}`;
  const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
  return {
    corpus: read(`content/source/${locale}/corpus.json`),
    coverage: read(`${editorial}/coverage.json`),
    concepts: read(`${editorial}/concepts.json`),
    relations: read(`${editorial}/relations.json`),
  };
}

const dispositions = new Set(['retain','adapt','context','omit-devotional']);
const kinds = new Set(['editorial-decision','source-annotation','quotation','paraphrase','editorial-interpretation','editorial-instruction']);
export const relationTypes = new Set(['grounds','requires','supports','qualifies','applies-to','puts-in-tension','provides-test-for','provides-source-foundation-for','has-source-foundation-in']);
const blank = value => typeof value !== 'string' || !value.trim();
const intersects = (a,b) => a.start < b.end && b.start < a.end;

/** Structural/fidelity anchors are machine-checkable; semantic review is human work. */
export function validateContent({corpus,coverage,concepts,relations}) {
  const errors = [];
  const check = (condition,path,message) => { if (!condition) errors.push(`${path}: ${message}`); };
  const paragraphs = new Map(corpus.paragraphs.map(p=>[p.id,p]));
  const conceptIds = new Set(concepts.concepts.map(c=>c.id));
  for (const [name,data] of Object.entries({coverage,concepts,relations})) {
    check(data.schemaVersion===1,name,'unsupported schema version');
    check(data.editionId===corpus.editionId,name,'source edition mismatch');
    check(data.language===(corpus.language ?? 'en') && localeRegistry.some(locale => locale.id === data.language),name,'official-language alignment required');
  }
  function refs(values,path,allowEmpty=false) {
    check(Array.isArray(values),path,'reference array required');
    if (!Array.isArray(values)) return;
    check(allowEmpty || values.length>0,path,'source references required');
    check(new Set(values).size===values.length,path,'duplicate references');
    for (const id of values) check(paragraphs.has(id),path,`unknown source ${id}`);
  }
  function span(value,path,expectedId) {
    check(value?.kind==='quotation',path,'exact source spans must be labelled quotations');
    const p=paragraphs.get(value?.paragraphId);
    check(Boolean(p),path,'unknown quotation paragraph');
    if (!p) return;
    if (expectedId) check(value.paragraphId===expectedId,path,'span belongs to another paragraph');
    check(Number.isInteger(value.start) && Number.isInteger(value.end) && value.start>=0 && value.end>value.start && value.end<=p.text.length,path,'invalid source offsets');
    check(p.text.slice(value.start,value.end)===value.text,path,'quotation differs from exact contiguous source');
  }
  function block(value,path,kind) {
    check(value?.kind===kind,path,`must be labelled ${kind}`);
    check(!blank(value?.text),path,'text required');
    refs(value?.sourceRefs,`${path}.sourceRefs`);
  }
  check(coverage.records.length===245,'coverage','must contain exactly 245 records');
  check(new Set(coverage.records.map(r=>r.paragraphId)).size===245,'coverage','duplicate or missing paragraph decision');
  check(new Set(coverage.records.map(r=>r.rationale)).size===245,'coverage','rationales must be individually authored');
  for (const [index,r] of coverage.records.entries()) {
    const path=`coverage.${r.paragraphId}`;
    const p=corpus.paragraphs[index];
    check(r.paragraphId===p?.id,path,'stable paragraph order/coverage mismatch');
    check(r.kind==='editorial-decision',path,'decision must be labelled editorial');
    check(r.authority?.author==='Leo XIV' && r.authority?.document==='Magnifica Humanitas' && r.authority?.documentDate==='2026-05-15',path,'source attribution required');
    check(r.authority?.scientificConsensusClaim===false,path,'do not silently certify source claims as scientific consensus');
    check(['attributed-source-argument','source-normative-position','source-anthropological-claim','source-institutional-self-criticism'].includes(r.authority?.claimStatus),path,'source claim frame required');
    check(dispositions.has(r.disposition),path,'invalid disposition');
    check(!blank(r.rationale),path,'individual rationale required');
    check(r.sourceSha256===p?.sha256,path,'decision applies to a different source body');
    refs(r.sourceRefs,`${path}.sourceRefs`);
    check(r.sourceRefs?.length===1 && r.sourceRefs[0]===r.paragraphId,path,'decision must cite its own paragraph');
    check(r.reviewStatus==='pending-supervisor-review',path,'do not claim prose/supervisor acceptance in this contract');
    check(Array.isArray(r.conceptIds) && r.conceptIds.length>0,path,'concept associations required');
    for (const id of r.conceptIds ?? []) check(conceptIds.has(id),path,`unknown concept ${id}`);
    for (const q of r.necessaryQualifications ?? []) block(q,`${path}.qualification`,'editorial-instruction');
    for (const f of r.faithPremises ?? []) {
      check(f.kind==='source-annotation' && !blank(f.description),path,'faith annotation description required');
      check(f.placement==='optional-foundations',path,'faith premise must be optional and attributed');
      refs(f.sourceRefs,`${path}.faith.sourceRefs`);
      span(f.sourceSpan,`${path}.faith.sourceSpan`,r.paragraphId);
    }
    for (const c of r.contextSpans ?? []) {
      span(c.sourceSpan,`${path}.context`,r.paragraphId);
      check(c.placement==='optional-foundations',path,'context relocation must stay optional');
    }
    check(Array.isArray(r.exclusions) && Array.isArray(r.protectedSpans),path,'explicit exclusion and protected-span arrays required');
    for (const [i,e] of (r.exclusions ?? []).entries()) {
      const ep=`${path}.exclusion.${i+1}`;
      span(e.sourceSpan,ep,r.paragraphId);
      check(e.id===`${r.paragraphId}-exclusion-${i+1}`,ep,'stable exclusion ID required');
      check(['clause','sentence','liturgical-formula','ceremonial-address'].includes(e.scope),ep,'explicit exclusion scope required');
      check(!blank(e.reason),ep,'individual exclusion reason required');
      block(e.preserve,`${ep}.preserve`,'editorial-instruction');
      check(e.sentenceContexts?.length>0,ep,'sentence-level context required');
      for (const s of e.sentenceContexts ?? []) span(s,`${ep}.sentenceContext`,r.paragraphId);
      if (e.sentenceContexts?.length) {
        check(e.sentenceContexts[0].start<=e.sourceSpan.start && e.sentenceContexts.at(-1).end>=e.sourceSpan.end,ep,'sentence context does not contain exclusion');
      }
      for (const other of r.exclusions.slice(i+1)) check(!intersects(e.sourceSpan,other.sourceSpan),ep,'overlapping exclusions');
      for (const protectedSpan of r.protectedSpans ?? []) check(!intersects(e.sourceSpan,protectedSpan.sourceSpan),ep,'exclusion erases protected substantive argument');
    }
    for (const protectedSpan of r.protectedSpans ?? []) {
      span(protectedSpan.sourceSpan,`${path}.protected`,r.paragraphId);
      check(!blank(protectedSpan.reason),path,'protected-span reason required');
    }
    if (r.disposition==='omit-devotional') {
      check(r.exclusions.length>0,path,'whole omission needs exact devotional exclusions');
      check(r.protectedSpans.length===0,path,'substantive mixed paragraph cannot be omitted wholesale');
    }
  }
  check(conceptIds.size===concepts.concepts.length,'concepts','duplicate identity');
  for (const c of concepts.concepts) {
    const path=`concept.${c.id}`;
    check(/^[a-z][a-z0-9-]*$/.test(c.id),path,'stable concept ID required');
    check(c.locale===(corpus.language ?? 'en') && !blank(c.title),path,'localized display title required');
    block(c.definition,`${path}.definition`,'paraphrase');
    block(c.necessaryDistinction,`${path}.distinction`,'editorial-interpretation');
    refs(c.foundationRefs,`${path}.foundationRefs`,true);
    if (c.sourceQuotation) span(c.sourceQuotation,`${path}.quotation`);
  }
  const relationIds=new Set();
  for (const r of relations.relations) {
    const path=`relation.${r.id}`;
    check(!relationIds.has(r.id),path,'duplicate relation identity');relationIds.add(r.id);
    check(conceptIds.has(r.from) && conceptIds.has(r.to) && r.from!==r.to,path,'valid distinct endpoints required');
    check(relationTypes.has(r.type),path,'typed relation required');
    check(r.directed===true,path,'explicit relationship direction required');
    block(r.explanation,`${path}.explanation`,'editorial-interpretation');
    check(r.placement=== (r.type.includes('source-foundation') ? 'optional-foundations':'main'),path,'foundation relationship must stay optional');
  }
  // Catch unlabelled or invented kinds even within nested content.
  function walk(value,path) {
    if (!value || typeof value!=='object') return;
    if ('kind' in value) check(kinds.has(value.kind),path,'unknown quotation/editorial kind');
    for (const [key,child] of Object.entries(value)) walk(child,`${path}.${key}`);
  }
  walk({coverage,concepts,relations},'content');
  return errors;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const content=loadContent();
  const errors=validateContent(content);
  if (errors.length) {
    console.error(errors.slice(0,12).join('\n'));
    console.error(`${errors.length} editorial contract errors`);
    process.exitCode=1;
  } else {
    const records=content.coverage.records;
    console.log(`245 individual dispositions; ${records.reduce((n,r)=>n+r.exclusions.length,0)} exact exclusions; ${content.concepts.concepts.length} concepts; ${content.relations.relations.length} typed relations: valid`);
  }
}

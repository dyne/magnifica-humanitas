import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('es');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/es/semantic-review.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const context = id => reading.contexts.find(c => c.paragraphId === id).explanation.text;
const main = id => reading.readingSequence.find(c => c.contextId === id).explanation?.text;
const concept = id => reading.concepts.find(c => c.id === id);

function publicBlocks() {
  const blocks = [];
  const add = (id, value, group) => blocks.push({ id, text: value.text, sourceRefs: value.sourceRefs, group });
  for (const c of reading.contexts) add(c.paragraphId, c.explanation, 'context');
  for (const e of reading.readingSequence) add(e.id, e.explanation ?? { text: e.contextLinkLabel, sourceRefs: e.sourceRefs }, 'sequence');
  for (const c of reading.concepts) {
    for (const key of ['definition', 'necessaryDistinction', 'foundation']) if (c[key]) add(`${c.id}:${key}`, c[key], 'concept');
    for (const b of c.reasoning) add(b.id, b, 'reasoning');
  }
  for (const r of reading.relations) add(r.id, r.explanation, 'relation');
  for (const t of reading.trails) {
    for (const key of ['introduction', 'qualification', 'ending']) add(`${t.id}:${key}`, t[key], 'trail');
    for (const s of t.steps) add(`${t.id}:${s.id}`, s.transition, 'transition');
    for (const key of ['prompt', 'feedback', 'scenario']) if (t.reflection[key]) add(`${t.reflection.id}:${key}`, t.reflection[key], 'reflection');
  }
  return blocks;
}

test('complete Spanish reading and editorial contracts validate against their own official source', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'es');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^es-/);
  assert.notEqual(reading.revision, english.revision);
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.concepts.reduce((n, c) => n + c.reasoning.length, 0), 86);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
});

test('every Spanish public block and source comparison has current semantic-review evidence', () => {
  const blocks = publicBlocks();
  assert.equal(blocks.length, 762);
  assert.equal(review.blocks.length, blocks.length);
  assert.equal(new Set(review.blocks.map(b => b.id)).size, blocks.length);
  assert.equal(review.revision, reading.revision);
  assert.equal(review.sourceHtmlSha256, corpus.sourceHtmlSha256);
  for (const block of blocks) {
    const evidence = review.blocks.find(b => b.id === block.id);
    assert.ok(evidence, block.id);
    assert.equal(evidence.group, block.group, block.id);
    assert.equal(evidence.authoredSha256, hash(block.text), `renew semantic review: ${block.id}`);
    assert.deepEqual(evidence.sourceRefs, block.sourceRefs, block.id);
    for (const id of block.sourceRefs) assert.equal(evidence.sourceHashes[id], corpus.paragraphs.find(p => p.id === id).sha256, block.id);
  }
  assert.deepEqual(review.sourceComparisons.map(c => c.paragraphId), corpus.paragraphs.map(p => p.id));
  for (const [i, p] of review.sourceComparisons.entries()) {
    assert.equal(p.sourceSha256, corpus.paragraphs[i].sha256);
    assert.equal(p.contextSha256, hash(reading.contexts[i].explanation.text));
    assert.ok(p.meaningCheck.trim().length > 30);
  }
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, `renew artifact review: ${path}`);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('Spanish source index retains exact local spans, dispositions, attribution and 224 notes', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.editionId, corpus.editionId);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    assert.equal(p.sourceSha256, corpus.paragraphs.find(s => s.id === p.paragraphId).sha256);
    assert.equal(p.placementExplanation, coverage.records.find(r => r.paragraphId === p.paragraphId).rationale);
    assert.equal('text' in p, false, 'raw paragraphs must not enter the public context bundle');
    for (const q of p.quotations) assert.equal(corpus.paragraphs.find(s => s.id === q.paragraphId).text.slice(q.start, q.end), q.text);
  }
  assert.equal(index.notes.find(n => n.id === 'n223').text, corpus.footnotes.find(n => n.id === 'n223').text);
});

test('Spanish note screening is local: four argumentative notes, bibliographic Arendt and 35 ibíd. dependencies', () => {
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n143').classification, 'bibliographic-citation');
  const previous = id => reading.reviewedNotes.find(n => n.id === id).previousNoteId;
  for (const note of corpus.footnotes) {
    const expected = /^(?:Cf\. )?ibíd\./i.test(note.text) ? `n${String(note.number - 1).padStart(3, '0')}` : undefined;
    assert.equal(previous(note.id), expected, note.id);
  }
  assert.equal(reading.reviewedNotes.filter(n => n.previousNoteId).length, 35);
  const note = id => corpus.footnotes.find(n => n.id === id).text;
  assert.equal(note('n143'), 'H. Arendt, Los orígenes del totalitarismo, Madrid 2014, 634.');
  assert.match(note('n175'), /1866.*sin condenarla por completo/);
  assert.match(note('n182'), /preventivos/);
  assert.match(main('p120'), /nota 132.*corazón.*poesía.*historia personal/);
  assert.match(main('p176'), /Sicut dudum.*Etsi suscepti.*Dum diversas.*Romanus Pontifex/);
  assert.match(main('p176'), /políticas y económicas.*1866/);
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]));
  assert.deepEqual(coverage.records.flatMap(r => r.exclusions).filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'oración y']]);
});

test('Spanish public explanations are individual and do not relabel a foreign bundle or source paragraph', () => {
  const other = ['en', 'it', 'de'].map(locale => read(`content/reading/${locale}.json`));
  for (const [i, c] of reading.contexts.entries()) {
    for (const foreign of other) assert.notEqual(c.explanation.text, foreign.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, corpus.paragraphs[i].text, 'source is not relabelled as paraphrase');
  }
  for (const [i, e] of reading.readingSequence.entries()) {
    for (const foreign of other) assert.notEqual(e.title, foreign.readingSequence[i].title, e.id);
    assert.match(e.contextLinkLabel, e.placement === 'main' ? /^Contexto de la fuente/ : /^Contexto opcional de la fuente/);
  }
  for (const [i, c] of reading.concepts.entries()) {
    for (const field of ['definition', 'necessaryDistinction']) for (const foreign of other) assert.notEqual(c[field].text, foreign.concepts[i][field].text, c.id);
    for (const [j, b] of c.reasoning.entries()) assert.notEqual(b.text, english.concepts[i].reasoning[j].text, b.id);
  }
  for (const [i, r] of reading.relations.entries()) assert.notEqual(r.explanation.text, english.relations[i].explanation.text, r.id);
});

test('Spanish dignity, rights, family and parental choice retain their distinct qualifications', () => {
  assert.match(main('p052'), /moral.*social.*existencial.*ontológica/);
  assert.match(main('p052'), /ningún pecado, fracaso, humillación o exclusión/);
  assert.match(main('p055'), /concepción.*fin natural.*aborto provocado.*asesinato de inocentes.*eutanasia/);
  assert.match(main('p055'), /posición normativa atribuida a la Iglesia/);
  assert.match(main('p143'), /derecho primario e inalienable.*convicciones morales, culturales y religiosas/);
  assert.match(main('p165'), /un hombre y una mujer.*concepción normativa/);
  assert.match(concept('family').necessaryDistinction.text, /concepción normativa de León XIV/);
});

test('Spanish property and subsidiarity preserve public support, data power and estafa', () => {
  assert.match(main('p066'), /derecho a la propiedad privada.*subordina al destino universal/);
  assert.match(main('p067'), /despilfarro.*estafa o fraude/);
  assert.match(reading.relations.find(r => r.id === 'rel-005').explanation.text, /prevención del fraude/);
  assert.match(main('p068'), /reconocer, proteger y promover/);
  assert.match(main('p069'), /no justifica el desinterés del Estado/);
  assert.match(main('p070'), /elaboración antes.*resultado ya fijado/);
  assert.match(main('p071'), /Auditorías independientes, transparencia de algoritmos, acceso equitativo.*apelación/);
  assert.match(main('p108'), /propiedad de los datos debe regularse.*bienes comunes o colectivos/);
  assert.match(main('p109'), /orientar el diseño/);
  assert.match(main('p178'), /cómo se usan sus datos, quién los utiliza y para quién/);
});

test('Spanish AI limits, enhancement diversity and care remain attributed and qualified', () => {
  assert.match(main('p097'), /no ofrece un tratado completo.*ni una revisión/);
  assert.match(main('p098'), /pueden quedar pronto obsoletas/);
  assert.match(main('p099'), /beneficios concretos/);
  assert.match(main('p099'), /posiciones antropológicas de León XIV, no un consenso científico/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /posiciones antropológicas.*no un consenso científico/);
  assert.match(main('p116'), /sensibilidades distintas.*especialmente radicales.*especulativas/);
  assert.match(main('p118'), /necesario tratar de eliminar el sufrimiento.*no autoriza a negar tratamientos/);
  assert.match(context('p127'), /no equivale a una mejora técnica/);
});

test('Spanish work retains emergency assistance, welcome relief, varied transitions and civic participation', () => {
  assert.match(main('p149'), /ayudas económicas pueden ser necesarias en emergencias/);
  assert.match(main('p149'), /no significa que la persona gane su valor por estar empleada/);
  assert.match(main('p152'), /deseable.*peligrosos/);
  assert.match(main('p153'), /No existe un modelo de cambio único ni una solución global/);
  assert.match(main('p154'), /falta no menoscabe la participación social/);
  assert.match(concept('work').necessaryDistinction.text, /valor intrínseco no se gana trabajando/);
});

test('Spanish institutional criticism and apology stay explicit alongside theological context', () => {
  assert.match(main('p089'), /espirituales, económicos, institucionales, sexuales, de poder y de conciencia/);
  assert.match(main('p138'), /periodistas.*víctimas/);
  assert.match(main('p138'), /responsabilidad grave de la propia Iglesia/);
  assert.match(main('p176'), /posesión de esclavos.*legitimación pontificias.*condena tardía/);
  assert.match(main('p176'), /herida en la memoria cristiana.*pide sinceramente perdón en nombre de la Iglesia/);
  assert.match(main('p177'), /prevención, protección, liberación y rehabilitación/);
  assert.equal(coverage.records.find(r => r.paragraphId === 'p176').authority.claimStatus, 'source-institutional-self-criticism');
});

test('Spanish military AI keeps last resort, non-delegation, prudent values work, time and civilians', () => {
  assert.match(main('p192'), /legítima defensa.*sentido más estricto/);
  assert.match(main('p197'), /último recurso en legítima defensa/);
  assert.match(main('p198'), /rechaza delegar.*decisiones letales o irreversibles/);
  assert.match(main('p198'), /valores y juicio prudente.*ecosistema moral.*conciencia.*límites adecuados/);
  assert.match(main('p199'), /tiempo suficiente para el juicio moral/);
  assert.match(main('p199'), /combatientes y no combatientes/);
  assert.match(main('p200'), /control humano efectivo, consciente y responsable/);
  assert.match(main('p200'), /botón de confirmación nominal no satisface/);
  assert.match(main('p228'), /desarmada, desarmante, humilde y perseverante/);
  assert.match(main('p228'), /hacerla realidad en relaciones y sociedad/);
});

test('Spanish conclusion preserves membership, concrete care, political oppression and all victim groups', () => {
  assert.match(main('p236'), /papel activo.*sin refugiarse/);
  assert.match(main('p239'), /visitas a personas solas y servicio a pobres/);
  assert.match(main('p240'), /condiciones laborales detrás de dispositivos/);
  assert.match(context('p234'), /pertenencia y respuesta verdadera.*unidad recibida obliga así a solidaridad/);
  assert.match(context('p243'), /dominación romana.*continúan.*cambia su mirada/);
  assert.match(main('p244'), /viudas, huérfanos, extranjeros, niños heridos, exiliados y fugitivos/);
  assert.match(main('p245'), /compartir lo que somos y tenemos/);
});

test('Spanish trails retain 32 steps, four fictional cases, optional reflections and current estimates', () => {
  assert.equal(reading.trails.length, 6);
  assert.equal(reading.trails.reduce((n, t) => n + t.steps.length, 0), 32);
  assert.equal(reading.trails.filter(t => t.reflection.scenario).length, 4);
  for (const [i, t] of reading.trails.entries()) {
    assert.notEqual(t.title, english.trails[i].title);
    assert.equal(t.reflection.optional, true);
    assert.equal(t.reflection.responseFormat, 'think-then-reveal');
    assert.notEqual(t.ending.text, english.trails[i].ending.text);
    assert.ok(t.relatedTrailIds.length > 0);
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith(reading.localeMetadata.scenarioPrefix));
    const estimate = estimateTrailReading(t, reading);
    for (const key of ['words', 'wordsPerMinute', 'minutes']) assert.equal(t.readingEstimate[key], estimate[key], `${t.id}:${key}`);
    assert.equal(t.readingEstimate.label, 'Tiempo de lectura estimado');
    assert.match(t.readingEstimate.method, /tiempo real de lectura y reflexión puede variar/);
  }
});

test('Spanish validators reject damaged quotes, lost note review, changed placement and stale estimates', () => {
  const spliced = structuredClone(inputs);
  spliced.reading.concepts[0].sourceQuotation.text += ' inventado';
  assert.ok(validateReading(spliced).some(e => e.includes('quotation must be exact')));
  const lost = structuredClone(inputs);
  lost.reading.reviewedNotes = lost.reading.reviewedNotes.filter(n => n.id !== 'n143');
  assert.ok(validateReading(lost).some(e => e.includes('n143: exact source note requires reader review')));
  const changed = structuredClone(inputs);
  changed.reading.readingSequence[16].placement = 'main';
  changed.reading.trails[0].readingEstimate.minutes += 1;
  assert.ok(validateReading(changed).some(e => e.includes('editorial placement changed')));
  assert.ok(validateReading(changed).some(e => e.includes('reading estimate must derive')));
});

test('Spanish explanations avoid editorial removal instructions and repetitive theological appendices', () => {
  const processLanguage = /(?:oraci[oó]n|plegaria|bendici[oó]n|f[oó]rmula|liturgia).{0,50}(?:se (?:elimina|suprime|omite)|ha sido (?:eliminad|omitid)|debe (?:eliminarse|omitirse))|(?:tras|después de) (?:eliminar|suprimir|retirar)|(?:conservamos|preservamos|retiramos|omitimos) (?:la|el|las|los)/iu;
  for (const block of publicBlocks()) assert.doesNotMatch(block.text, processLanguage, block.id);
  assert.match(context('p176'), /pide sinceramente perdón en nombre de la Iglesia/);
  assert.equal(context('p243').split('dominación romana').length - 1, 1);
  assert.doesNotMatch(context('p134'), /edici[oó]n alemana|diferencias entre ediciones/i);
  assert.doesNotMatch(main('p067'), /en español|traducci[oó]n|sustituir/i);
  for (const c of reading.contexts) {
    const sentences = c.explanation.text.split(/(?<=[.!?])\s+/u).filter(s => s.length > 50);
    assert.equal(new Set(sentences).size, sentences.length, `repeated sentence ${c.paragraphId}`);
  }
});

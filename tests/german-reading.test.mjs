import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('de');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/de/semantic-review.json');
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

test('complete German reading and editorial contracts validate against their own official edition', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'de');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^de-/);
  assert.notEqual(reading.revision, english.revision);
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
});

test('every German public block and source reference has current semantic-review evidence', () => {
  const blocks = publicBlocks();
  assert.equal(blocks.length, 762);
  assert.equal(review.blocks.length, blocks.length);
  assert.equal(new Set(review.blocks.map(b => b.id)).size, blocks.length);
  assert.equal(review.revision, reading.revision);
  for (const block of blocks) {
    const evidence = review.blocks.find(b => b.id === block.id);
    assert.ok(evidence, block.id);
    assert.equal(evidence.group, block.group, block.id);
    assert.equal(evidence.authoredSha256, hash(block.text), `renew semantic review: ${block.id}`);
    assert.deepEqual(evidence.sourceRefs, block.sourceRefs, block.id);
    for (const id of block.sourceRefs) assert.equal(evidence.sourceHashes[id], corpus.paragraphs.find(p => p.id === id).sha256, block.id);
  }
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, `renew artifact review: ${path}`);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('German reading index retains local quotations, dispositions, attribution and all screened notes', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.editionId, corpus.editionId);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    assert.equal(p.sourceSha256, corpus.paragraphs.find(s => s.id === p.paragraphId).sha256);
    assert.equal(p.placementExplanation, coverage.records.find(r => r.paragraphId === p.paragraphId).rationale);
    assert.equal('text' in p, false, 'raw paragraphs must not enter the public context bundle');
    for (const q of p.quotations) {
      const source = corpus.paragraphs.find(s => s.id === q.paragraphId);
      assert.equal(source.text.slice(q.start, q.end), q.text);
    }
  }
  assert.equal(index.notes.find(n => n.id === 'n223').text, corpus.footnotes.find(n => n.id === 'n223').text);
});

test('German notes preserve exact bibliographies, five argumentative notes and malformed ebd. dependencies', () => {
  assert.equal(reading.reviewedNotes.length, 224);
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n143', 'n174', 'n175', 'n182']);
  const previous = id => reading.reviewedNotes.find(n => n.id === id).previousNoteId;
  assert.equal(previous('n163'), 'n162');
  assert.equal(previous('n194'), 'n193');
  assert.equal(previous('n204'), 'n203');
  assert.equal(previous('n211'), 'n210');
  assert.equal(reading.reviewedNotes.filter(n => n.previousNoteId).length, 35);
  const note = id => corpus.footnotes.find(n => n.id === id).text;
  assert.match(note('n143'), /Publikation unterscheidet sich in beiden Sprachen/);
  assert.match(note('n143'), /deutlich anders formuliert/);
  assert.match(context('p134'), /Arendts englische und deutsche Ausgabe.*unterschiedliche Formulierungen/);
  assert.match(note('n163'), /^Vgl \. ebd\./);
  assert.match(note('n194'), /^Vgl\. e bd\./);
  assert.match(note('n175'), /1866.*ohne diese gänzlich zu verurteilen/);
  assert.match(note('n182'), /präventive/);
  assert.match(note('n223'), /Gebetsvigil und des Rosenkranzes/);
  assert.equal(corpus.footnotes[123].sourceMarker, '[124]');
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification]));
  const fragments = coverage.records.flatMap(r => r.exclusions).filter(e => e.matchScope === 'source-location');
  assert.deepEqual(fragments.map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'Gebet und']]);
});

test('German public prose has individual local explanations and no copied English or Italian fillers', () => {
  const italian = read('content/reading/it.json');
  for (const [i, c] of reading.contexts.entries()) {
    assert.notEqual(c.explanation.text, english.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, italian.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, corpus.paragraphs[i].text, 'source is not relabelled as paraphrase');
  }
  for (const [i, e] of reading.readingSequence.entries()) {
    assert.notEqual(e.title, english.readingSequence[i].title, e.id);
    assert.notEqual(e.title, italian.readingSequence[i].title, e.id);
    assert.match(e.contextLinkLabel, e.placement === 'main' ? /^Quellenkontext/ : /^Freiwilliger Quellenkontext/);
  }
  for (const [i, c] of reading.concepts.entries()) {
    for (const field of ['definition', 'necessaryDistinction']) {
      assert.notEqual(c[field].text, english.concepts[i][field].text, c.id);
      assert.notEqual(c[field].text, italian.concepts[i][field].text, c.id);
    }
    for (const [j, b] of c.reasoning.entries()) assert.notEqual(b.text, english.concepts[i].reasoning[j].text, b.id);
  }
  for (const [i, r] of reading.relations.entries()) assert.notEqual(r.explanation.text, english.relations[i].explanation.text, r.id);
});

test('German reading protects four dignity meanings, rights, family and parents’ educational choice', () => {
  assert.match(main('p052'), /Moralische.*gesellschaftliche.*existenzielle.*Ontologische/);
  assert.match(main('p052'), /Sünde, Versagen, Demütigung und Ausschluss heben ihn nicht auf/);
  assert.match(main('p055'), /Empfängnis.*natürlichen Ende.*Abtreibung.*Tötung Unschuldiger.*Euthanasie/);
  assert.match(main('p055'), /beurteilt die Kirche.*normative Position/);
  assert.match(main('p143'), /vorrangige und unveräußerliche Recht der Eltern/);
  assert.match(main('p143'), /moralischen, kulturellen und religiösen Überzeugungen/);
  assert.match(main('p165'), /einem Mann und einer Frau/);
  assert.match(main('p165'), /Aus seiner Sicht.*ursprüngliche Gemeinschaft/);
  assert.match(concept('family').necessaryDistinction.text, /normativen Familienauffassung Leo XIV/);
});

test('German property, subsidiarity and data rights keep support and limits together', () => {
  assert.match(main('p066'), /Recht auf Privateigentum.*allgemeinen Bestimmung der Güter untergeordnet/);
  assert.match(main('p068'), /Schutz und zur Förderung/);
  assert.match(main('p069'), /Rückzug des Staates ausdrücklich zurück/);
  assert.match(main('p070'), /während der Entstehung einer Entscheidung/);
  assert.match(main('p071'), /unabhängige Prüfungen, transparente Algorithmen, gerechten Datenzugang und Rechtsbehelfe/);
  assert.match(main('p108'), /reguliertes Eigentum.*gemeinsamer oder kollektiver Verwaltung/);
  assert.match(main('p109'), /Voraussetzung des Designs/);
  assert.match(main('p178'), /wie Informationen verwendet werden, von wem und zu wessen Nutzen/);
});

test('German KI claims, diversity of enhancement and care remain qualified and attributed', () => {
  assert.match(main('p097'), /weder eine vollständige Darstellung.*noch eine Literaturübersicht/);
  assert.match(main('p098'), /bald überholt/);
  assert.match(main('p099'), /konkrete Vorteile/);
  assert.match(main('p099'), /Positionen des Autors, kein.*wissenschaftlicher Konsens/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /anthropologische Position.*wissenschaftlichen Konsens/);
  assert.match(main('p116'), /unterschiedliche Interessen und Richtungen/);
  assert.match(main('p116'), /Besonders radikale.*spekulativ/);
  assert.match(main('p118'), /Linderung.*Pflicht/);
  assert.match(main('p118'), /keine Aufforderung, notwendige Behandlung zu verweigern/);
  assert.match(context('p127'), /nicht durch technische Steigerung/);
});

test('German work preserves emergency aid, desirable relief, uneven transitions and participation without work', () => {
  assert.match(main('p149'), /Unterstützung.*in Notfällen manchmal notwendig/);
  assert.match(main('p149'), /nicht.*Wert.*durch Beschäftigung verdient/);
  assert.match(main('p152'), /gefährliche Arbeit erleichtern/);
  assert.match(main('p153'), /statt einer angeblich überall passenden Lösung/);
  assert.match(main('p154'), /Fehlende Erwerbsarbeit darf soziale Teilhabe.*nicht mindern/);
  assert.match(concept('work').necessaryDistinction.text, /nicht durch Erwerbsarbeit verdient/);
});

test('German institutional criticism survives the optional placement of theology', () => {
  assert.match(main('p089'), /geistlichen, wirtschaftlichen, institutionellen und sexuellen Missbrauchs.*Macht- und Gewissensmissbrauch/);
  assert.match(main('p138'), /Journalisten.*Missbrauch.*Opfern/);
  assert.match(main('p138'), /zuerst Aufgabe der Kirche selbst/);
  assert.match(main('p176'), /kirchlichen Sklavenbesitz, päpstliche Regelung und Legitimation.*verspätete Verurteilung/);
  assert.match(main('p176'), /Wunde im christlichen Gedächtnis.*im Namen der Kirche aufrichtig um Vergebung/);
  assert.match(main('p177'), /Prävention, des Schutzes, der Befreiung und Rehabilitation/);
  assert.equal(coverage.records.find(r => r.paragraphId === 'p176').authority.claimStatus, 'source-institutional-self-criticism');
});

test('German military KI preserves non-delegation, the positive final sentence, judgement time and civilians', () => {
  assert.match(main('p192'), /legitime Verteidigung im engsten Sinn/);
  assert.match(main('p197'), /letzte Option legitimer Verteidigung/);
  assert.match(main('p198'), /Tödliche oder sonst irreversible Entscheidungen dürfen nicht künstlichen Systemen überlassen/);
  assert.match(main('p198'), /Werte und umsichtiges Urteilsvermögen.*moralisches Umfeld.*Gewissen.*Grenzen/);
  assert.match(main('p199'), /genügend Zeit für moralisches Urteil/);
  assert.match(main('p199'), /Kombattanten und Nichtkombattanten/);
  assert.match(main('p200'), /effektive, bewusste und verantwortliche menschliche Kontrolle/);
  assert.match(main('p200'), /Bestätigungsknopf genügen.*nicht/);
  assert.match(main('p228'), /unbewaffnet, entwaffnend, demütig und beharrlich/);
  assert.match(main('p228'), /Frieden.*Beziehungen.*Gesellschaft zu verwirklichen/);
});

test('German conclusion retains practical care, hidden labour, oppressive conditions and every named victim group', () => {
  assert.match(main('p236'), /aktive Rolle/);
  assert.match(main('p239'), /Besuche bei einsamen Menschen und Dienst an Armen/);
  assert.match(main('p240'), /Arbeitsbedingungen hinter Geräten/);
  assert.match(context('p234'), /Wahrhaftige Zustimmung.*gelebte Zugehörigkeit/);
  assert.match(context('p243'), /römische Herrschaft.*dauern an/);
  assert.match(main('p244'), /Witwen, Waisen, Fremden, verletzten Kindern, Verbannten und Flüchtlingen/);
  assert.match(main('p245'), /Teilen dessen, was Menschen sind und besitzen/);
});

test('German trails keep 32 finite steps, four fictional cases, optional unscored reflections and current estimates', () => {
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
    assert.equal(t.readingEstimate.label, 'Geschätzte Lesezeit');
    assert.match(t.readingEstimate.method, /tatsächliche Lese- und Denkzeit kann abweichen/);
  }
});

test('German validation rejects damaged quotes, missing note review, lost placements and stale estimates', () => {
  const spliced = structuredClone(inputs);
  spliced.reading.concepts[0].sourceQuotation.text += ' erfunden';
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

test('German explanations teach the argument without leaking removal instructions or repeated context summaries', () => {
  // This targets editorial transformation language, not meaningful source claims
  // about preserving dignity, limiting weapons or maintaining social participation.
  const processLanguage = /Aussonderung|ausgesondert\w*|nach (?:der )?Entfernung|zu entfernende Gebetsform|(?:Gebetsform|Gebetsaufforderung).{0,45}(?:aufgeführt|getrennt|gelöscht)|liturgische[rn]? (?:Vollzug|Antwortsequenz).{0,45}(?:aufgeführt|entfern)/iu;
  for (const block of publicBlocks()) assert.doesNotMatch(block.text, processLanguage, block.id);
  assert.match(context('p176'), /Sklavenbesitz.*Legitimation.*verspätete Verurteilung/);
  assert.match(context('p176'), /im Namen der Kirche aufrichtig um Vergebung/);
  assert.match(context('p243'), /römische Herrschaft.*dauern an.*Gottes Handeln an der Seite der Geringen/);
  assert.equal(context('p243').split('römische Herrschaft').length - 1, 1);
  assert.match(context('p234'), /empfangene Einheit verpflichtet zu Solidarität/);
  assert.match(main('p228'), /Frieden in ihren Beziehungen und in der Gesellschaft zu verwirklichen/);
});

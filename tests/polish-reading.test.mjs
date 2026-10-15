import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('pl');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/pl/semantic-review.json');
const alignment = read('content/editorial/pl/alignment-review.json');
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

test('complete Polish reading validates against its own official source', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'pl');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^pl-/);
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.concepts.reduce((n, c) => n + c.reasoning.length, 0), 86);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
});

test('every Polish block and paragraph comparison has current review evidence', () => {
  const blocks = publicBlocks();
  assert.equal(blocks.length, 762);
  assert.equal(review.blocks.length, blocks.length);
  assert.equal(new Set(review.blocks.map(b => b.id)).size, blocks.length);
  assert.equal(review.revision, reading.revision);
  assert.equal(review.sourceHtmlSha256, corpus.sourceHtmlSha256);
  for (const b of blocks) {
    const evidence = review.blocks.find(e => e.id === b.id);
    assert.ok(evidence, b.id);
    assert.equal(evidence.group, b.group, b.id);
    assert.equal(evidence.authoredSha256, hash(b.text), `renew semantic review: ${b.id}`);
    assert.deepEqual(evidence.sourceRefs, b.sourceRefs, b.id);
    for (const id of b.sourceRefs) assert.equal(evidence.sourceHashes[id], corpus.paragraphs.find(p => p.id === id).sha256, b.id);
  }
  assert.deepEqual(review.sourceComparisons.map(p => p.paragraphId), corpus.paragraphs.map(p => p.id));
  for (const [i, p] of review.sourceComparisons.entries()) {
    assert.equal(p.sourceSha256, corpus.paragraphs[i].sha256);
    assert.equal(p.contextSha256, hash(context(p.paragraphId)));
    assert.ok(p.meaningCheck.length > 30);
  }
  assert.equal(review.groupReviews[0].start, 'p001');
  assert.equal(review.groupReviews.at(-1).end, 'p245');
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, path);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('Polish source index retains exact quotes, source attribution and local note anomalies', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    assert.equal(p.sourceSha256, corpus.paragraphs.find(s => s.id === p.paragraphId).sha256);
    assert.equal('text' in p, false, 'raw paragraph bodies stay out of public context bundles');
    for (const q of p.quotations) assert.equal(corpus.paragraphs.find(s => s.id === q.paragraphId).text.slice(q.start, q.end), q.text);
  }
  for (const n of index.notes) {
    const source = corpus.footnotes.find(s => s.id === n.id);
    assert.equal(n.text, source.text);
    assert.deepEqual(n.sourceLinks, source.sourceLinks);
  }
  assert.equal(index.notes.find(n => n.id === 'n033').sourceLinks[0].name, '_ft33');
  assert.equal(index.notes.find(n => n.id === 'n219').sourceLinks[0].href, '#_ftnref210');
  assert.deepEqual(index.notes.find(n => n.id === 'n219').paragraphIds, ['p237']);
});

test('Polish note reviews distinguish 35 same-work and 23 same-author dependencies', () => {
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-author').length, 23);
  for (const n of alignment.notes) {
    const local = reading.reviewedNotes.find(r => r.id === n.noteId);
    assert.equal(local.sourceSha256, n.sourceSha256);
    assert.equal(local.previousNoteId, n.previousNoteId);
    assert.equal(local.previousReferenceKind, n.previousReferenceKind);
  }
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n163').previousNoteId, 'n162');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n217').previousNoteId, undefined);
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n143').classification, 'bibliographic-citation');
  assert.match(main('p120'), /Przypis 132.*serca.*spotkanie, poezję i osobistą historię/);
  assert.match(main('p176'), /Sicut dudum, Etsi suscepti, Dum diversas i Romanus Pontifex.*polityczne i ekonomiczne.*1866/);
  assert.match(main('p192'), /Przypis 182.*ścisłe warunki moralne.*prewencyjnymi/);
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId, n.previousReferenceKind]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId, n.previousReferenceKind]));
});

test('Polish public wording is independently localized without editing directions or damaged Unicode', () => {
  const other = ['en', 'it', 'de', 'es', 'fr', 'pt'].map(locale => read(`content/reading/${locale}.json`));
  for (const [i, c] of reading.contexts.entries()) {
    for (const foreign of other) assert.notEqual(c.explanation.text, foreign.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, corpus.paragraphs[i].text, c.paragraphId);
    assert.ok(review.sourceComparisons[i].qualifiedSummary.length > 80);
    const sentences = c.explanation.text.split(/(?<=[.!?])\s+/u).filter(s => s.length > 50);
    assert.equal(new Set(sentences).size, sentences.length, `repeated sentence ${c.paragraphId}`);
  }
  const processLanguage = /(?:pominięcie|usunięcie).{0,70}(?:formuł|błogosław|modlitw)|(?:po|bez) (?:pominięciu|recytacji)|(?:Zachowujemy|Usuwamy|Pomijamy|Wyłączyć|Zachować)|editorial-instruction|L8\.[123]/u;
  for (const b of publicBlocks()) {
    assert.doesNotMatch(b.text, processLanguage, b.id);
    assert.doesNotMatch(b.text, /[\u00ad\u200b\ufffd]/u, b.id);
  }
  for (const e of reading.readingSequence) {
    assert.notEqual(e.title, english.readingSequence.find(s => s.id === e.id).title);
    assert.match(e.contextLinkLabel, e.placement === 'main' ? /^Kontekst źródłowy/ : /^Opcjonalny kontekst źródłowy/);
  }
});

test('Polish dignity, rights and parental choice retain attributed distinctions', () => {
  assert.match(main('p052'), /moralna.*społeczna.*egzystencjalna.*Ontologiczna.*wina.*wykluczenie/);
  assert.match(context('p052'), /chcianej, stworzonej i kochanej przez Boga/);
  assert.match(main('p055'), /poczęcia do naturalnego kresu.*aborcji.*eutanazji/);
  assert.match(main('p057'), /pracy, edukacji, odpowiedzialności publicznej i wysłuchania/);
  assert.match(main('p081'), /legalnych dróg.*integracji.*pozostania u siebie/);
  assert.match(main('p143'), /pierwszorzędne i niezbywalne prawo.*moralnych, kulturowych i religijnych/);
  assert.match(main('p165'), /trwałym związku mężczyzny i kobiety.*stanowisko autora/);
});

test('Polish property, support, accountability and data sovereignty follow the local argument', () => {
  assert.match(main('p066'), /prawo do własności prywatnej.*podporządkowuje.*powszechnemu przeznaczeniu/);
  assert.match(main('p067'), /środowisko, ubogich i przyszłe pokolenia.*marnotrawstwu.*grabieży/);
  assert.match(main('p068'), /uznawać, chronić, wspierać i koordynować/);
  assert.match(main('p069'), /nie uzasadnia wycofania się państwa/);
  assert.match(main('p070'), /kształtowaniu rozwiązań.*gotowych rozstrzygnięć/);
  assert.match(main('p071'), /audytów.*algorytmów.*danych.*odwoławczych/);
  assert.match(main('p105'), /accountability.*wyjaśnia i uzasadnia.*kontroli i zakwestionowaniu.*naprawia szkody/);
  assert.match(main('p108'), /regulacji.*wspólnego lub zbiorowego/);
  assert.match(main('p109'), /warunkiem uprzednim/);
  assert.match(main('p178'), /nie tylko kopie danych.*decydowania, jak, przez kogo i dla kogo/);
});

test('Polish AI and care retain uncertainty, real benefits, diversity and relief of suffering', () => {
  assert.match(main('p097'), /nie przedstawia pełnego wykładu AI ani przeglądu całej literatury/);
  assert.match(main('p098'), /dezaktualizować.*wiedza.*ograniczona/);
  assert.match(main('p099'), /konkretne korzyści.*Leon XIV.*świadomości moralnej/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /należą do Leona XIV.*konsensusem/);
  assert.match(main('p116'), /różnorodne.*radykalniejszych.*spekulatywne/);
  assert.match(main('p118'), /obowiązek.*usuwania cierpienia.*nie uzasadnia odmowy leczenia ani narzucania cierpienia/);
  assert.match(context('p127'), /Przewyższa zdolność natury.*darem Ducha/);
  assert.match(main('p114'), /Technologia może pomagać.*wolność, osąd.*odpowiedzialność/);
});

test('Polish work keeps aid, desirable relief, varied transitions and participation without employment', () => {
  assert.match(main('p149'), /nie nadaje.*wartości podstawowej.*Pomoc materialna może być konieczna/);
  assert.match(main('p152'), /Pożądane.*ciężkiej, powtarzalnej lub niebezpiecznej/);
  assert.match(main('p153'), /nierówne.*krajowo i lokalnie/);
  assert.match(main('p154'), /udział społeczny.*niezależnie od posiadania etatu/);
  assert.match(main('p156'), /zawczasu|przy wprowadzaniu automatyzacji/);
  assert.match(main('p159'), /wskaźniki uzupełniające/);
  assert.match(main('p162'), /Pozyskiwanie zasobów, finansowanie, produkcja i konsumpcja/);
  assert.match(main('p169'), /pracą, usługami i odpoczynkiem/);
});

test('Polish institutional self-criticism retains abuse, slaveholding, delay and present duties', () => {
  assert.match(main('p089'), /duchowego, ekonomicznego, instytucjonalnego, seksualnego.*władzy i sumienia/);
  assert.match(main('p089'), /Uznanie szkody, sprawiedliwe zadośćuczynienie i prewencja/);
  assert.match(main('p138'), /dziennikarzy.*głosu ofiarom.*obowiązkiem samej instytucji/);
  assert.match(main('p176'), /instytucje kościelne posiadały niewolników.*regulowała i uprawomocniała.*XIX.*osiemnaście wieków/);
  assert.match(main('p176'), /imieniu Kościoła o przebaczenie.*nie usuwa winy/);
  assert.match(main('p176'), /Formalne, bezwzględne i powszechne potępienie.*XIX/);
  assert.match(main('p177'), /prewencją, ochroną, wyzwoleniem i rehabilitacją/);
  assert.equal(coverage.records[175].authority.claimStatus, 'source-institutional-self-criticism');
});

test('Polish military AI retains strict defense, nondelegation, affirmative prudence and civilian safeguards', () => {
  assert.match(main('p192'), /uprawnionej obrony w sensie najściślejszym/);
  assert.match(main('p197'), /ostatecznością w uprawnionej obronie/);
  assert.match(main('p198'), /odrzuca powierzanie.*śmiercionośnych.*nieodwracalnych/);
  assert.match(main('p198'), /wartości i roztropnego osądu.*sumienia.*granicach/);
  assert.match(main('p198'), /Żaden algorytm.*moralnie dopuszczalną.*próg przemocy/);
  assert.match(main('p199'), /identyfikowalny i weryfikowalny.*czas na osąd moralny.*ochrona cywilów/);
  assert.match(main('p199'), /walczących i niewalczących/);
  assert.match(main('p200'), /rzeczywistej, świadomej i odpowiedzialnej kontroli człowieka/);
  assert.match(main('p200'), /nominalna akceptacja nie wystarcza/);
  assert.match(main('p228'), /nieuzbrojony, rozbrajający, pokorny i wytrwały.*relacjach i społeczeństwie/);
});

test('Polish integrated foundations retain 84 premises, membership, action and named victims', () => {
  assert.equal(coverage.records.filter(r => r.faithPremises.length).length, 84);
  assert.equal(review.contextPremiseReview.combinations.length, 84);
  for (const p of review.contextPremiseReview.combinations) {
    assert.equal(p.contextSha256, hash(context(p.paragraphId)));
    assert.ok(p.premisePreserved.length > 30);
  }
  assert.match(context('p234'), /przynależności do ciała Chrystusa.*życia zgodnego.*zgodę/);
  assert.match(context('p235'), /nie wyłącznie indywidualną pobożnością.*niewidocznych/);
  assert.match(main('p236'), /odrzuca ucieczkę w spirytualizm.*czynny udział/);
  assert.match(main('p239'), /odwiedzanie samotnych i służbę biednym/);
  assert.match(main('p240'), /ukryte warunki pracy/);
  assert.match(context('p243'), /panowanie Rzymian.*nadal trwają.*Zmienia się jej spojrzenie/);
  assert.match(main('p244'), /wdowy, sieroty, cudzoziemca, poranionego dziecka, wygnańca i uciekiniera/);
  assert.match(main('p245'), /dzielić się tym, kim jesteśmy i co posiadamy/);
  assert.equal(context('p118').split('obowiązek').length - 1, 1);
  assert.match(context('p118'), /relację z Bogiem.*nie jest odmową opieki/);
});

test('Polish trails are finite, unscored, explicitly fictional where needed and correctly estimated', () => {
  assert.equal(reading.trails.reduce((n, t) => n + t.steps.length, 0), 32);
  assert.equal(reading.trails.filter(t => t.reflection.scenario).length, 4);
  for (const [i, t] of reading.trails.entries()) {
    assert.notEqual(t.title, english.trails[i].title);
    assert.equal(t.reflection.optional, true);
    assert.equal(t.reflection.responseFormat, 'think-then-reveal');
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith(reading.localeMetadata.scenarioPrefix));
    const estimate = estimateTrailReading(t, reading);
    for (const key of ['words', 'wordsPerMinute', 'minutes']) assert.equal(t.readingEstimate[key], estimate[key], `${t.id}:${key}`);
    assert.equal(t.readingEstimate.label, 'Szacowany czas czytania');
    assert.match(t.readingEstimate.method, /Rzeczywisty czas czytania i namysłu jest różny/);
  }
});

test('Polish validators reject invented quotes, missing notes, changed placement and stale estimates', () => {
  const spliced = structuredClone(inputs);
  spliced.reading.concepts[0].sourceQuotation.text += ' zmyślone';
  assert.ok(validateReading(spliced).some(e => e.includes('quotation must be exact')));
  const missing = structuredClone(inputs);
  missing.reading.reviewedNotes = missing.reading.reviewedNotes.filter(n => n.id !== 'n219');
  assert.ok(validateReading(missing).some(e => e.includes('n219: exact source note requires reader review')));
  const changed = structuredClone(inputs);
  changed.reading.readingSequence[16].placement = 'main';
  changed.reading.trails[0].readingEstimate.minutes += 1;
  assert.ok(validateReading(changed).some(e => e.includes('editorial placement changed')));
  assert.ok(validateReading(changed).some(e => e.includes('reading estimate must derive')));
});

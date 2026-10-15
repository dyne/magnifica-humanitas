import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('pt');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/pt/semantic-review.json');
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

test('complete Portuguese reading and editorial contracts validate against their own official source', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'pt');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^pt-/);
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

test('every Portuguese public block and source comparison has current semantic-review evidence', () => {
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

test('Portuguese source index retains exact local spans, dispositions, attribution and 224 notes', () => {
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

test('Portuguese note screening retains four arguments and 35 local ibid dependencies', () => {
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n143').classification, 'bibliographic-citation');
  for (const note of corpus.footnotes) {
    const expected = /^(?:Cf\. )?ibid(?:em)?\b/i.test(note.text) ? `n${String(note.number - 1).padStart(3, '0')}` : undefined;
    assert.equal(reading.reviewedNotes.find(n => n.id === note.id).previousNoteId, expected, note.id);
  }
  assert.equal(reading.reviewedNotes.filter(n => n.previousNoteId).length, 35);
  assert.equal(corpus.footnotes[142].text, 'H. Arendt, As Origens do Totalitarismo (Alfragide 2024), 627.');
  assert.match(corpus.footnotes[212].text, /Deus caritas est \(29 de junho de 2005\).*AAS 101 \(2006\)/);
  assert.match(main('p120'), /nota 132.*coração.*poesia.*história pessoal/);
  assert.match(main('p176'), /Sicut dudum, Etsi suscepti, Dum diversas e Romanus Pontifex.*políticas e económicas.*1866/);
  assert.match(main('p192'), /nota 182.*condições rigorosas.*preventivos/);
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]));
  assert.deepEqual(coverage.records.flatMap(r => r.exclusions).filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'oração e']]);
});

test('Portuguese prose is localized, independently paraphrased and linked to source comparison', () => {
  const other = ['en', 'it', 'de', 'es', 'fr'].map(locale => read(`content/reading/${locale}.json`));
  for (const [i, c] of reading.contexts.entries()) {
    for (const foreign of other) assert.notEqual(c.explanation.text, foreign.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, corpus.paragraphs[i].text, c.paragraphId);
    assert.ok(review.sourceComparisons[i].qualifiedSummary.length > 80);
  }
  for (const e of reading.readingSequence) assert.match(e.contextLinkLabel, e.placement === 'main' ? /^Contexto do texto de origem/ : /^Contexto opcional do texto de origem/);
  for (const [i, c] of reading.concepts.entries()) {
    for (const field of ['definition', 'necessaryDistinction']) for (const foreign of other) assert.notEqual(c[field].text, foreign.concepts[i][field].text, c.id);
    for (const [j, b] of c.reasoning.entries()) assert.notEqual(b.text, english.concepts[i].reasoning[j].text, b.id);
  }
  for (const b of review.blocks) assert.deepEqual(Object.keys(b.meaningChecks), b.sourceRefs);
});

test('Portuguese dignity, rights, family and parental choice preserve attribution and scope', () => {
  assert.match(main('p052'), /moral.*social.*existencial.*ontológica/);
  assert.match(main('p052'), /pecado, fracasso, humilhação e exclusão não a diminuem/);
  assert.match(main('p055'), /conceção.*fim natural.*aborto provocado.*assassinato de inocentes.*eutanásia/);
  assert.match(main('p055'), /posições normativas atribuídas à Igreja/);
  assert.match(main('p143'), /direito fundamental e inalienável.*convicções morais, culturais e religiosas/);
  assert.match(main('p165'), /união estável de um homem e uma mulher.*posição da fonte/);
  assert.match(concept('family').necessaryDistinction.text, /união estável de um homem e uma mulher.*posição atribuída/);
});

test('Portuguese property, support and responsabilização follow the local edition', () => {
  assert.match(main('p066'), /direito à propriedade privada.*subordinado à destinação universal/);
  assert.match(main('p067'), /ambiente.*pobres.*gerações futuras.*desperdícios e pilhagem/);
  assert.match(main('p068'), /reconhecer, proteger e promover/);
  assert.match(main('p069'), /não justifica o seu não envolvimento.*apoio público/);
  assert.match(main('p070'), /construção das escolhas.*decisões já fechadas/);
  assert.match(main('p071'), /Auditorias independentes.*algoritmos.*dados.*recurso/);
  assert.match(main('p105'), /responsabilização.*presta contas.*explica decisões.*controlo e contestação.*repara danos/);
  assert.match(main('p108'), /propriedade dos dados precisa de regulação.*gestão comum ou coletiva/);
  assert.match(main('p109'), /condição da conceção tecnológica/);
  assert.match(main('p178'), /capacidade de decidir usos, destinatários e benefícios, não apenas cópias dos dados/);
  assert.doesNotMatch(main('p067'), /estafa|edição espanhola/i);
});

test('Portuguese AI claims, diversity and care keep capabilities, uncertainty and relief together', () => {
  assert.match(main('p097'), /não pretende oferecer um tratado.*nem rever toda a bibliografia/);
  assert.match(main('p098'), /envelhecer depressa.*conhecimento limitado/);
  assert.match(main('p099'), /benefícios concretos/);
  assert.match(main('p099'), /afirmações antropológicas pertencem à fonte.*não as apresenta como consenso científico/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /atribui-lhe essas afirmações.*consenso científico/);
  assert.match(main('p116'), /sensibilidades diversas.*versões radicais.*especulativas/);
  assert.match(main('p118'), /dever de procurar eliminar o sofrimento.*não equivale a recusar cuidados ou impor sofrimento evitável/);
  assert.match(context('p127'), /não significa fugir da realidade.*capacidade natural.*dom de Deus/);
});

test('Portuguese work keeps unconditional worth, aid, welcome relief and participation', () => {
  assert.match(main('p149'), /não confere valor intrínseco.*Ajuda económica.*necessária em emergência/);
  assert.match(main('p152'), /desejável.*pesado, repetitivo ou perigoso/);
  assert.match(main('p153'), /Não há solução única.*nacionais e locais/);
  assert.match(main('p154'), /falta de emprego não destrua participação social/);
  assert.match(concept('work').necessaryDistinction.text, /não depende do emprego.*participação e cidadania/);
});

test('Portuguese institutional self-criticism keeps named abuses, slavery, delay and pardon', () => {
  assert.match(main('p089'), /espirituais, económicos, institucionais, sexuais, de poder e de consciência/);
  assert.match(main('p089'), /Reconhecer danos, reparar e prevenir/);
  assert.match(main('p138'), /jornalistas.*voz às vítimas.*responsabilidade da instituição/);
  assert.match(main('p176'), /instituições eclesiásticas tiveram escravos.*regulou e legitimou.*século XIX.*dezoito séculos/);
  assert.match(main('p176'), /sinceramente perdão em nome da Igreja.*anacronismo não apaga a ferida/);
  assert.match(main('p177'), /prevenção, proteção, libertação e reabilitação/);
  assert.equal(coverage.records[175].authority.claimStatus, 'source-institutional-self-criticism');
});

test('Portuguese military AI keeps strict defense, non-delegation, affirmative prudence and civilians', () => {
  assert.match(main('p192'), /legítima defesa no sentido mais estrito/);
  assert.match(main('p197'), /última alternativa em legítima defesa/);
  assert.match(main('p198'), /Rejeita confiar decisões letais ou irreversíveis/);
  assert.match(main('p198'), /valores.*ecossistema.*consciência.*limites apropriados/);
  assert.match(main('p199'), /cadeia identificável e verificável.*tempo para julgamento moral.*combatentes de não combatentes/);
  assert.match(main('p200'), /controlo humano efetivo, consciente e responsável/);
  assert.match(main('p200'), /confirmação humana apenas nominal não satisfaz/);
  assert.match(main('p228'), /desarmada, capaz de desarmar, humilde e perseverante.*relações e na sociedade/);
});

test('Portuguese conclusion keeps membership, active care, unchanged oppression and named victims', () => {
  assert.match(context('p234'), /pertença.*corpo de Cristo.*reconhecer essa identidade.*coerente/);
  assert.match(context('p235'), /devoção apenas individual.*pessoas invisíveis/);
  assert.match(main('p236'), /não é refúgio.*papel ativo/);
  assert.match(main('p239'), /visitas a quem está só e serviço aos pobres/);
  assert.match(main('p240'), /condições de trabalho escondidas/);
  assert.match(context('p243'), /situação política permanece: dominação romana.*mudança do seu olhar/i);
  assert.match(main('p244'), /viúva, órfão, estrangeiro, criança ferida, exilado e fugitivo/);
  assert.match(main('p245'), /partilhar o que somos e o que temos/);
});

test('Portuguese trails retain finite steps, optional reflections, fictional labels and actual estimates', () => {
  assert.equal(reading.trails.reduce((n, t) => n + t.steps.length, 0), 32);
  assert.equal(reading.trails.filter(t => t.reflection.scenario).length, 4);
  for (const [i, t] of reading.trails.entries()) {
    assert.notEqual(t.title, english.trails[i].title);
    assert.equal(t.reflection.optional, true);
    assert.equal(t.reflection.responseFormat, 'think-then-reveal');
    assert.notEqual(t.ending.text, english.trails[i].ending.text);
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith(reading.localeMetadata.scenarioPrefix));
    const estimate = estimateTrailReading(t, reading);
    for (const key of ['words', 'wordsPerMinute', 'minutes']) assert.equal(t.readingEstimate[key], estimate[key], `${t.id}:${key}`);
    assert.equal(t.readingEstimate.label, 'Tempo de leitura estimado');
    assert.match(t.readingEstimate.method, /tempo real de leitura e reflexão varia/);
  }
});

test('Portuguese validators reject invented quotation, missing note, placement change and stale estimates', () => {
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

test('Portuguese prose avoids process directions and repeated theological appendices', () => {
  const processLanguage = /(?:oração|bênção|fórmula|liturgia).{0,50}(?:é (?:removida|retirada|omitida)|deve ser (?:removida|retirada|omitida))|(?:após|depois de) (?:remover|retirar)|(?:preservamos|retiramos|omitimos|removemos) (?:a|o|as|os) /iu;
  for (const b of publicBlocks()) {
    assert.doesNotMatch(b.text, processLanguage, b.id);
    assert.doesNotMatch(b.text, /\b(?:Slaveholding|editorial-instruction|Léon XIV|gaspillage|pillage)\b/, b.id);
  }
  assert.equal(context('p243').split('dominação romana').length - 1, 1);
  assert.doesNotMatch(context('p134'), /edição alemã|diferenças entre edições/i);
  for (const c of reading.contexts) {
    const sentences = c.explanation.text.split(/(?<=[.!?])\s+/u).filter(s => s.length > 50);
    assert.equal(new Set(sentences).size, sentences.length, `repeated sentence ${c.paragraphId}`);
  }
});

test('Portuguese p118 context integrates its premise without repeating the relief duty', () => {
  const text = context('p118');
  assert.equal(text.split('dever de procurar eliminar o sofrimento').length - 1, 1);
  assert.equal(text.split('finitude constitutiva').length - 1, 1);
  assert.equal(text.split('ambivalência').length - 1, 1);
  assert.match(text, /não equivale a recusar cuidados ou impor sofrimento evitável/);
  assert.match(text, /Leão XIV interpreta.*relação humana com Deus/);
  assert.equal(review.contextPremiseReview.combinations.length, 29);
  for (const audit of review.contextPremiseReview.combinations) {
    assert.equal(audit.contextSha256, hash(context(audit.paragraphId)), audit.paragraphId);
    assert.ok(audit.premisePreserved.trim().length > 30, audit.paragraphId);
  }
});

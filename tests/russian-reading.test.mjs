import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('ru');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/ru/semantic-review.json');
const alignment = read('content/editorial/ru/alignment-review.json');
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

// These are meaning-sensitive regression witnesses, not a universal semantic
// validator. They read the built Source explanation with no main prose/rationale.
const standaloneRequirements = {
  p013: [/никто не справится.*никто не лишен/s, /различия могут стать творческими/i, /Павлов/],
  p052: [/Нравственное.*социальное.*экзистенциальное.*Онтологическое/s, /могут меняться.*не утрачивается/s, /греха, неудач, унижения или ограничений/, /Бог пожелал, сотворил и возлюбил/],
  p066: [/признает право частной собственности.*всегда подчиняет/s, /социального ограничения, не отрицание/],
  p074: [/еще не полная солидарность/, /сознательный.*равнодушия/s, /Вера.*вверены друг другу/s],
  p079: [/восстанавливает|Восстановительная/, /войны, колониализм, расовую и гендерную/, /коллективную память.*поддерживает/s],
  p081: [/безопасных законных маршрутов/, /права оставаться дома/, /народом Божиим/],
  p089: [/духовное, экономическое, институциональное и сексуальное/, /властью и совестью/, /признание вреда, возмещение и предотвращение/, /Общие ресурсы.*регулярная оценка/s, /действие Духа/],
  p112: [/не исчерпывается дурным использованием/, /неуязвимым.*неожиданность.*контролировать/s, /творение, призванное к отношениям/],
  p118: [/обязанность стремиться устранить страдание/, /мудрым признанием конечности/, /не гарантируют/, /не оправдывает отказа в лечении/, /отношения с Богом/],
  p133: [/ресурсов.*навязывать/s, /первородный грех/, /совесть.*достоинства.*праву/s],
  p147: [/Семьи, школы, христианские общины и институты/, /будущих поколений/, /чувство трансцендентного/, /Школа дает общее время/],
  p176: [/внеисторического.*запоздалое/s, /владение рабами.*узаконивавшие/s, /XIX.*1866/s, /Восемнадцать веков/, /по образу Божию.*бесконечно любимого.*не стирает провал/s, /от имени Церкви просит прощения/],
  p198: [/совесть.*ответственность/s, /запрещает.*смертельными или иными необратимыми/s, /требует закладывать ценности и благоразумное суждение/, /не разрешает делегирования/],
  p215: [/рождается из справедливости/, /кражи, прелюбодеяния/, /грамматически поврежден/, /84\(85\).*не примечание 84.*примечание 191/s],
  p228: [/Божиим даром безусловной любви/, /безоружным, обезоруживающим, смиренным и терпеливым/, /неустанный практический труд.*отношениях и обществе/s],
  p231: [/Плач детей, хрупкость стариков, молчание жертв/, /усталость борющихся/, /Воплощение.*Иисуса/s],
  p235: [/личная встреча.*одно Тело/s, /справедливость, общение в благах/, /бедных и исключенных/, /возвращать незаметным голос/],
  p236: [/общение с Богом/, /не псевдодуховности/, /верность истине, воспитание, отношения, справедливость и мир/],
  p239: [/создает возможности встречи/, /трапезу.*посещение одиноких и служение бедным/s, /храме Духа/],
  p240: [/цепочки производства, скрытый труд/, /войны/, /небес.*земную историю/s],
  p244: [/Вдова, сирота, чужеземец, раненый ребенок, изгнанник и беженец/, /Мария.*страдающих/s, /социально-экономическое/],
  p245: [/делиться собой и своими благами/, /ежедневную верность/, /верой Марии.*Воплощения/s, /без обещания автоматического/],
};
function standaloneErrors(index) {
  const errors = [];
  for (const [id, patterns] of Object.entries(standaloneRequirements)) {
    const text = index.paragraphs.find(p => p.paragraphId === id)?.explanation.text ?? '';
    for (const pattern of patterns) if (!pattern.test(text)) errors.push(`${id}: ${pattern}`);
  }
  return errors;
}

test('complete Russian reading validates with stable identities and local coverage', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'ru');
  assert.equal(reading.editionId, corpus.editionId);
  assert.equal(reading.revision, 'ru-2026-10-15-reading-1');
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.concepts.reduce((n, c) => n + c.reasoning.length, 0), 86);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
  assert.equal(coverage.records.filter(r => r.faithPremises.length).length, 87);
  assert.equal(coverage.records.reduce((n, r) => n + r.necessaryQualifications.length, 0), 121);
});

test('every Russian explanation and source comparison has current review bindings', () => {
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
    assert.deepEqual(p.qualificationChecks, alignment.coverage[i].necessaryQualifications.map(q => q.text));
  }
  assert.equal(review.groupReviews.length, 16);
  assert.equal(review.groupReviews[0].start, 'p001');
  assert.equal(review.groupReviews.at(-1).end, 'p245');
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, path);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('Russian source index exposes only exact local quotes and all unchanged notes', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    const source = corpus.paragraphs.find(s => s.id === p.paragraphId);
    assert.equal(p.sourceSha256, source.sha256);
    assert.equal('text' in p, false);
    for (const q of p.quotations) assert.equal(corpus.paragraphs.find(s => s.id === q.paragraphId).text.slice(q.start, q.end), q.text);
  }
  for (const n of index.notes) {
    const source = corpus.footnotes.find(s => s.id === n.id);
    assert.equal(n.text, source.text);
    assert.deepEqual(n.sourceLinks, source.sourceLinks);
    assert.deepEqual(n.paragraphIds, source.paragraphIds);
  }
  assert.deepEqual(index.notes.find(n => n.id === 'n084').paragraphIds, ['p064']);
  assert.match(context('p215'), /грамматически поврежден/);
  assert.match(context('p215'), /Псалом 84\(85\).*не примечание 84.*примечание 191/s);
});

test('Russian local note dependencies and translator caveat survive publication inputs', () => {
  assert.equal(reading.reviewedNotes.length, 224);
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n133', 'n174', 'n175', 'n182']);
  for (const n of alignment.notes) {
    const local = reading.reviewedNotes.find(r => r.id === n.noteId);
    assert.equal(local.sourceSha256, n.sourceSha256);
    assert.equal(local.previousNoteId, n.previousNoteId);
    assert.equal(local.previousReferenceKind, n.previousReferenceKind);
  }
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(reading.reviewedNotes.filter(n => n.previousReferenceKind === 'same-author').length, 20);
  for (const id of ['n026', 'n066', 'n067', 'n201', 'n202']) assert.equal(reading.reviewedNotes.find(n => n.id === id).previousReferenceKind, 'same-author');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n163').previousNoteId, 'n162');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n217').previousNoteId, undefined);
  assert.match(main('p120'), /132.*сердце, встрече, поэзии.*истории/s);
  assert.match(main('p121'), /133.*отличается.*советского времени/s);
  assert.match(context('p121'), /историческое свидетельство, не молитва/);
  assert.match(corpus.footnotes[132].text, /СССР/);
  assert.match(corpus.footnotes[174].text, /1866.*неосуждаяегополностью/s);
});

test('Russian dignity, rights, property and civic participation retain their distinctions', () => {
  assert.match(main('p052'), /Нравственное, социальное и экзистенциальное.*Онтологическое.*не утрачивается/s);
  assert.match(main('p055'), /Церковь.*зачатия до естественного завершения.*аборт.*эвтаназию/s);
  assert.match(main('p056'), /запуганных или манипулируемых/);
  assert.match(main('p066'), /Право частной собственности признается.*не является абсолютным.*подчинено/s);
  assert.match(main('p069'), /не означает его самоустранения/);
  assert.match(main('p143'), /первичное и неотчуждаемое право родителей.*нравственным, культурным и религиозным/s);
  assert.match(main('p154'), /отсутствие работы не должно подрывать участие/);
  assert.match(main('p165'), /устойчивый союз мужчины и женщины.*позиция Церкви/s);
  assert.match(concept('dignity').necessaryDistinction.text, /Труд выражает ценность, но не создает/);
});

test('Russian care strength, AI scope and diverse currents remain locally faithful', () => {
  assert.match(main('p097'), /не предлагает полного трактата/);
  assert.match(main('p098'), /быстро стареют.*ограниченно/s);
  assert.match(main('p099'), /конкретную пользу.*категорически.*не объявляются научным консенсусом/s);
  assert.match(main('p116'), /разные подходы.*особенно радикальные.*умозрительный/s);
  assert.match(main('p118'), /требует стремиться устранить страдание.*признавать конечность/s);
  assert.match(main('p118'), /не оправдывает отказа в лечении/);
  assert.match(main('p118'), /не означает обещания избавить жизнь от всякой боли/);
  for (const id of ['care', 'embodiment']) assert.match(concept(id).necessaryDistinction.text, /обязанност(?:ь|ью|и) стремиться устранить страдание/);
  assert.match(reading.trails[0].qualification.text, /требует стремиться устранить страдание/);
  assert.match(reading.relations.find(r => r.id === 'rel-017').explanation.text, /требует стремиться устранить страдание/);
});

test('Russian Church criticism preserves explicit delay, all abuse forms and action', () => {
  assert.match(main('p089'), /духовное, экономическое, институциональное и сексуальное.*властью и совестью.*возмещать вред.*предотвращать/s);
  assert.match(main('p138'), /стыд.*Журналисты.*самой Церкви.*внешнего принуждения/s);
  assert.match(main('p176'), /владение рабами.*узаконивание.*запоздалое.*Восемнадцать веков.*1866.*от имени Церкви просит прощения/s);
  assert.doesNotMatch(main('p176') + context('p176'), /отсутствует.*задерж|не названа.*задерж|белорус/i);
  assert.match(main('p177'), /предупреждение, защита, освобождение и реабилитация/);
  assert.match(main('p173'), /разметку данных, обучение моделей и модерацию.*женщины.*низкой оплатой.*детьми.*платформы/s);
  assert.match(main('p169'), /трудом, услугами и отдыхом/);
});

test('Russian military interpretation keeps affirmative values work with nondelegation', () => {
  assert.match(main('p192'), /законную оборону в самом строгом смысле/);
  assert.match(main('p197'), /крайнему средству законной обороны/);
  assert.match(main('p198'), /запрещает передавать.*смертельными или иными необратимыми.*требует закладывать ценности и благоразумное суждение/s);
  assert.doesNotMatch(main('p198'), /насколько возможно|по мере сил/);
  assert.match(main('p199'), /цепь.*проектирования.*обучения.*время.*комбатантов и некомбатантов/s);
  assert.match(main('p200'), /действенный, сознательный и ответственный человеческий контроль/);
  assert.match(reading.trails[5].reflection.feedback.text, /Само подтверждение не устанавливает.*время нравственного суждения.*не заменяют человека/s);
});

test('all Russian standalone Source explanations retain core argument without main prose', () => {
  assert.deepEqual(standaloneErrors(buildReadingIndex(inputs)), []);
  assert.equal(review.standaloneContextReview.allContexts.length, 245);
  assert.equal(review.standaloneContextReview.mainPremisePairs.length, 60);
  assert.equal(review.standaloneContextReview.mainReadingSequenceSha256, hash(JSON.stringify(reading.readingSequence)));
  for (const pair of review.standaloneContextReview.mainPremisePairs) {
    assert.notEqual(main(pair.paragraphId), context(pair.paragraphId), pair.paragraphId);
    assert.equal(pair.mainSha256, hash(main(pair.paragraphId)));
    assert.equal(pair.contextSha256, hash(context(pair.paragraphId)));
  }
});

test('foundation-only Source regressions fail even while complete Russian main entries remain', () => {
  for (const id of Object.keys(standaloneRequirements)) {
    const bad = structuredClone(inputs);
    bad.reading.contexts.find(c => c.paragraphId === id).explanation.text = 'Автор связывает эту мысль с верой в Бога и христианским призванием.';
    assert.deepEqual(validateReading(bad), [], `${id}: fixture must satisfy structural schema`);
    const errors = standaloneErrors(buildReadingIndex(bad));
    assert.ok(errors.some(e => e.startsWith(`${id}:`)), `${id}: main text cannot rescue a foundation-only source explanation`);
  }
});

test('Russian trails have finite routes, optional reflections and current rendered estimates', () => {
  assert.equal(reading.trails.length, 6);
  const reached = new Set();
  for (const t of reading.trails) {
    const estimate = estimateTrailReading(t, reading);
    assert.equal(t.readingEstimate.words, estimate.words);
    assert.equal(t.readingEstimate.minutes, estimate.minutes);
    assert.match(t.readingEstimate.label, /Примерное время/);
    assert.match(t.readingEstimate.method, /200.*округлением вверх/s);
    assert.equal(t.reflection.optional, true);
    assert.equal(t.reflection.responseFormat, 'think-then-reveal');
    assert.match(t.question, /\?$/);
    for (const s of t.steps) reached.add(s.conceptId);
    for (const id of t.optionalConceptIds) reached.add(id);
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith('Редакционный пример — вымышленная ситуация:'));
    assert.ok(t.ending.text.length > 100);
  }
  assert.deepEqual(reading.trails.map(t => [t.id, t.steps.map(s => [s.id, s.conceptId]), t.reflection.id]), english.trails.map(t => [t.id, t.steps.map(s => [s.id, s.conceptId]), t.reflection.id]));
  assert.ok(reached.has('faith-foundations') && reached.has('history'));
  assert.equal(reading.trails.filter(t => t.reflection.scenario).length, 4);
  assert.match(reading.trails[1].reflection.feedback.text, /существенное улучшение.*не дает людям голоса/s);
  assert.match(reading.trails[2].reflection.feedback.text, /не отвергает такую помощь.*не восстанавливает/s);
  assert.match(reading.trails[4].reflection.feedback.text, /Признание прекращает отрицание.*возмещение.*предотвращение/s);
});

test('Russian public prose is localized and optional contexts are complete destinations', () => {
  for (const b of publicBlocks()) {
    assert.match(b.text, /[А-Яа-яЁё]/, b.id);
    assert.doesNotMatch(b.text, /[ІіЎў]|relational|otional|Recит|According to|Optional source context/, b.id);
    assert.notEqual(b.text, english.contexts.find(c => c.paragraphId === b.id)?.explanation.text, b.id);
  }
  for (const e of reading.readingSequence) {
    assert.match(e.title, /[А-Яа-яЁё]/);
    assert.match(e.contextLinkLabel, /Контекст|контекст/);
    if (e.placement === 'optional-context') {
      assert.equal(e.explanation, undefined);
      assert.ok(context(e.contextId).length > 120);
    }
  }
  assert.match(concept('truth').foundation.text, /первородному греху/);
  assert.match(concept('education').foundation.text, /чувство трансцендентного/);
  assert.match(concept('embodiment').foundation.text, /призванием творения/);
});

test('Russian validators reject removed notes, changed stable IDs, spliced quotes and stale estimates', () => {
  const missing = structuredClone(inputs);
  missing.reading.reviewedNotes.pop();
  missing.reading.readingSequence.pop();
  assert.ok(validateReading(missing).some(e => e.includes('exact source note requires reader review')));
  assert.ok(validateReading(missing).some(e => e.includes('Complete source-ordered reading sequence')));
  const ids = structuredClone(inputs);
  ids.reading.concepts[0].reasoning[0].id = 'dignity-new';
  ids.reading.trails[0].steps[0].id = 'new-step';
  assert.ok(validateReading(ids).some(e => e.includes('Stable localized concept/block')));
  assert.ok(validateReading(ids).some(e => e.includes('Stable localized trail/step/reflection')));
  const quote = structuredClone(inputs);
  quote.reading.concepts[0].sourceQuotation.text += '...';
  assert.ok(validateReading(quote).some(e => e.includes('exact and contiguous')));
  const stale = structuredClone(inputs);
  stale.reading.trails[0].introduction.text += ' Дополнительные слова.';
  assert.ok(validateReading(stale).some(e => e.includes('reading estimate must derive')));
});

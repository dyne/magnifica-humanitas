import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('fr');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/fr/semantic-review.json');
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

test('complete French reading and editorial contracts validate against their own official source', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'fr');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^fr-/);
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

test('every French public block and source comparison has current semantic-review evidence', () => {
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

test('French source index retains exact local spans, dispositions, attribution and 224 notes', () => {
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

test('French local note screening keeps four arguments, 35 dependencies and source anomalies', () => {
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n143').classification, 'bibliographic-citation');
  for (const note of corpus.footnotes) {
    const expected = /^(?:Cf\. )?ibid\s*\./i.test(note.text) ? `n${String(note.number - 1).padStart(3, '0')}` : undefined;
    assert.equal(reading.reviewedNotes.find(n => n.id === note.id).previousNoteId, expected, note.id);
  }
  assert.equal(reading.reviewedNotes.filter(n => n.previousNoteId).length, 35);
  assert.equal(corpus.footnotes[142].text, 'H. Arendt, The Origins of Totalitarianism, III, New York 1962, p. 474.');
  assert.match(corpus.footnotes[212].text, /Deus caritas est \(25 décembre 2025\).*AAS 98 \(2006\)/);
  assert.match(main('p120'), /note 132.*cœur.*poésie.*histoire personnelle/);
  assert.match(main('p176'), /Sicut dudum, Etsi suscepti, Dum diversas et Romanus Pontifex.*politiques et économiques.*1866/);
  assert.match(main('p192'), /note 182.*trop larges.*préventives/);
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification, n.previousNoteId]));
  assert.deepEqual(coverage.records.flatMap(r => r.exclusions).filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'prière et']]);
});

test('French prose does not relabel another edition or copy a whole source paragraph', () => {
  const other = ['en', 'it', 'de', 'es'].map(locale => read(`content/reading/${locale}.json`));
  for (const [i, c] of reading.contexts.entries()) {
    for (const foreign of other) assert.notEqual(c.explanation.text, foreign.contexts[i].explanation.text, c.paragraphId);
    assert.notEqual(c.explanation.text, corpus.paragraphs[i].text, c.paragraphId);
  }
  for (const e of reading.readingSequence) assert.match(e.contextLinkLabel, e.placement === 'main' ? /^Contexte de la source/ : /^Contexte facultatif de la source/);
  for (const [i, c] of reading.concepts.entries()) {
    for (const field of ['definition', 'necessaryDistinction']) for (const foreign of other) assert.notEqual(c[field].text, foreign.concepts[i][field].text, c.id);
    for (const [j, b] of c.reasoning.entries()) assert.notEqual(b.text, english.concepts[i].reasoning[j].text, b.id);
  }
  for (const [i, r] of reading.relations.entries()) assert.notEqual(r.explanation.text, english.relations[i].explanation.text, r.id);
});

test('French dignity, rights, family and parental choice retain scope and attribution', () => {
  assert.match(main('p052'), /morale.*sociale.*existentielle.*ontologique/);
  assert.match(main('p052'), /aucun péché, échec, humiliation ou exclusion/);
  assert.match(main('p055'), /conception.*terme naturel.*avortement provoqué.*meurtre d’innocents.*euthanasie/);
  assert.match(main('p055'), /position normative.*celle de l’Église/);
  assert.match(main('p143'), /droit primordial et inaliénable.*convictions morales, culturelles et religieuses/);
  assert.match(main('p165'), /un homme et d’une femme.*conception normative.*celle de la source/);
  assert.match(concept('family').necessaryDistinction.text, /Léon XIV.*conception normative.*attribuée/);
});

test('French property, subsidiarity and answerability use their own official meanings', () => {
  assert.match(main('p066'), /droit à la propriété privée.*subordonne à la destination universelle/);
  assert.match(main('p067'), /environnement.*pauvres.*générations futures.*gaspillage.*pillage/);
  assert.match(reading.relations.find(r => r.id === 'rel-005').explanation.text, /gaspillage et le pillage/);
  assert.match(main('p068'), /reconnaître, protéger et promouvoir/);
  assert.match(main('p069'), /ne justifie pas le désengagement de l’État.*intervention publique est nécessaire/);
  assert.match(main('p070'), /participer à l’élaboration.*résultat déjà fixé/);
  assert.match(main('p071'), /Contrôles indépendants, transparence des algorithmes, accès équitable aux données et dispositifs de recours/);
  assert.match(main('p105'), /Rendre compte.*responsables.*motifs.*contrôler et contester.*réparer/);
  assert.match(main('p108'), /propriété des données doit être réglementée.*biens communs ou collectifs/);
  assert.match(main('p109'), /dès la conception/);
  assert.match(main('p178'), /comment leurs données seront utilisées, par qui et pour qui/);
  assert.doesNotMatch(main('p067'), /estafa|fraude|espagnol|traduction/i);
  assert.doesNotMatch(main('p105'), /accountability/);
});

test('French AI claims, enhancement diversity and care keep their qualifications', () => {
  assert.match(main('p097'), /ni une analyse complète.*ni une revue/);
  assert.match(main('p098'), /rapidement obsolètes/);
  assert.match(main('p099'), /avantages concrets/);
  assert.match(main('p099'), /positions anthropologiques de Léon XIV, non un consensus scientifique/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /positions anthropologiques.*non un consensus scientifique/);
  assert.match(main('p116'), /pluralité.*les plus radicales.*spéculatives/);
  assert.match(main('p118'), /notre devoir d’essayer d’éliminer la souffrance.*ni de refuser des traitements ni d’imposer une douleur évitable/);
  assert.match(context('p127'), /ni à fuir le monde.*don de Dieu.*seules capacités naturelles/);
});

test('French work retains emergency help, welcome relief, varied transitions and participation without employment', () => {
  assert.match(main('p149'), /aides économiques peuvent être nécessaires en urgence/);
  assert.match(main('p149'), /ne signifie pas.*valeur intrinsèque.*emploi/);
  assert.match(main('p152'), /souhaitable.*dangereuses/);
  assert.match(main('p153'), /ni modèle de changement unique ni solution globale/);
  assert.match(main('p154'), /son absence ne compromette pas la participation sociale/);
  assert.match(concept('work').necessaryDistinction.text, /valeur intrinsèque ne se gagne pas en travaillant/);
});

test('French institutional criticism retains abuse, slaveholding, legitimation, delay and pardon', () => {
  assert.match(main('p089'), /spirituels, économiques, institutionnels, sexuels, de pouvoir et de conscience/);
  assert.match(main('p089'), /Reconnaissance du préjudice, réparation juste et prévention/);
  assert.match(main('p138'), /journalistes.*voix aux victimes.*grave responsabilité de l’Église elle-même/);
  assert.match(main('p176'), /possession d’esclaves.*légitimation pontificales.*XIXe siècle.*dix-huit siècles/);
  assert.match(main('p176'), /blessure de la mémoire chrétienne.*demande sincèrement pardon au nom de l’Église/);
  assert.match(main('p177'), /prévention, protection, libération et réhabilitation/);
  assert.equal(coverage.records.find(r => r.paragraphId === 'p176').authority.claimStatus, 'source-institutional-self-criticism');
});

test('French military AI retains strict defense, non-delegation, values, time and civilians', () => {
  assert.match(main('p192'), /légitime défense dans son sens le plus strict/);
  assert.match(main('p197'), /dernier recours.*légitime défense/);
  assert.match(main('p198'), /refuse de confier.*décisions mortelles ou autrement irréversibles/);
  assert.match(main('p198'), /valeurs et jugement prudent.*écosystème moral.*conscience.*limites appropriées/);
  assert.match(main('p199'), /chaîne identifiable et vérifiable.*temps pour le jugement moral.*combattants et non-combattants/);
  assert.match(main('p200'), /contrôle humain effectif, conscient et responsable/);
  assert.match(main('p200'), /bouton de confirmation purement nominal ne satisfait pas/);
  assert.match(main('p228'), /désarmée, désarmante, humble et persévérante.*réaliser dans les relations et dans la société/);
});

test('French conclusion explains membership, active care, unchanged oppression and named victims', () => {
  assert.match(context('p234'), /appartenance au corps du Christ.*réponse vraie.*partage/);
  assert.match(context('p235'), /dépasser|dépasse|devotion|dévotion privée/);
  assert.match(main('p236'), /construire concrètement plutôt qu’à se réfugier/);
  assert.match(main('p239'), /visites aux personnes seules et service des pauvres/);
  assert.match(main('p240'), /conditions de travail derrière les appareils/);
  assert.match(context('p243'), /domination romaine.*continuent.*regard nouveau/);
  assert.match(main('p244'), /veuves, orphelins, étrangers, enfants blessés, exilés et fugitifs/);
  assert.match(main('p245'), /partager ce que nous sommes et ce que nous avons/);
});

test('French trails keep finite steps, optional unscored reflection, fictional attribution and accurate estimates', () => {
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
    assert.equal(t.readingEstimate.label, 'Temps de lecture estimé');
    assert.match(t.readingEstimate.method, /temps réel de lecture et de réflexion peut varier/);
  }
});

test('French validators reject spliced quotations, lost note screening, changed placement and stale estimates', () => {
  const spliced = structuredClone(inputs);
  spliced.reading.concepts[0].sourceQuotation.text += ' inventé';
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

test('French public copy avoids editorial-process directions and repeated theological appendices', () => {
  const processLanguage = /(?:prière|bénédiction|formule|liturgie).{0,50}(?:est (?:supprimée|retirée|omise)|doit être (?:supprimée|retirée|omise))|(?:après|en) (?:supprimant|retirant)|(?:nous (?:préservons|retirons|omettons|supprimons)) (?:la|le|les)/iu;
  for (const b of publicBlocks()) {
    assert.doesNotMatch(b.text, processLanguage, b.id);
    assert.doesNotMatch(b.text, /\b(?:Slaveholding|accountability|editorial-instruction)\b/, b.id);
  }
  assert.equal(context('p243').split('domination romaine').length - 1, 1);
  assert.doesNotMatch(context('p134'), /édition allemande|différences entre éditions/i);
  for (const c of reading.contexts) {
    const sentences = c.explanation.text.split(/(?<=[.!?])\s+/u).filter(s => s.length > 50);
    assert.equal(new Set(sentences).size, sentences.length, `repeated sentence ${c.paragraphId}`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('ar');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/ar/semantic-review.json');
const alignment = read('content/editorial/ar/alignment-review.json');
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

// Bounded meaning-sensitive witnesses read ONLY the built Source explanation.
// These do not prove fidelity for arbitrary Arabic prose.
const standaloneRequirements = {
  p013: [/لا يستطيع فرد.*ولا يبلغ ضعف/s, /بولس/, /الاختلافات قد تصير إبداعًا/],
  p052: [/الكرامة الأخلاقيّة.*الكرامة الاجتماعيّة.*كرامة الحياة.*الكرامة الوجوديّة/s, /هذه الثلاثة تتغيّر/, /لا تنقص بخطيئة أو فشل أو إهانة أو استبعاد/, /الله أراد الإنسان وخلقه وأحبّه/],
  p066: [/بحقّ الملكية الخاصّة.*يخضعه دائمًا/s, /لا رأيًا لاهوتيًّا اختياريًّا/, /دون إنكار أصل حقّ الملكية/],
  p074: [/لا يصير تضامنًا كاملًا إلّا باختيار واعٍ/, /ائتمان متبادل/, /برفض اللامبالاة/],
  p079: [/هياكل.*تنتج اللامساواة/s, /هياكل خطيئة/, /الحرب والاستعمار والتمييز/, /شفاء الذاكرة.*دعم/s],
  p081: [/طرق آمنة قانونية/, /حقّ البقاء/, /شعب الله السائر/, /موارد وأحلام ومشاركة/],
  p089: [/الروحيّ والاقتصاديّ والمؤسسيّ والجنسيّ واعتداء السلطة والضمير/, /تعويضًا ووقاية/, /الموارد يجب أن تُشارك/, /التقييم المنتظم/, /انفتاحها على الروح/],
  p108: [/جماعات المؤمنين/, /ملكيتها للقطاع الخاصّ وحده/s, /رقابة ومشاركة فعلية/],
  p111: [/الجماعات المسيحيّة المعنيّة/, /المشاركة البشرية|مشاركة بشرية/, /الشفافية والمسؤولية/, /الخير الحقيقيّ/],
  p112: [/لا يُختزل في سوء استعمال/, /تقليل الضعف وإلغاء المفاجآت والسيطرة الشاملة/, /مخلوق مدعوّ للعلاقة والشركة/],
  p116: [/تيارات متنوّعة/, /ما بعد الإنسانية.*ما يتجاوز الإنسانية/s, /الجذرية/, /تخمينية/],
  p118: [/يوجب السعي إلى إزالة الألم/, /الاعتراف الحكيم بالمحدودية/, /لا يَعِد بإلغاء كلّ وجع ولا يجيز رفض العلاج/, /العلاقة الأصلية بالله/],
  p133: [/مالكي الموارد.*فرض/s, /دون أن يسمّي الأصل العربيّ هنا الخطيئة الأصلية/, /الضمير.*كرامة الإنسان.*قناعة/s],
  p147: [/الأسر والمدارس والجماعات المسيحية والمؤسسات/, /الأجيال الآتية/, /حسّ التسامي/, /زمنًا مشتركًا للتعلّم/],
  p176: [/بلا سياقه.*التأخير/s, /امتلكت مؤسسات كنسية عبيدًا/, /أضفى شرعية/, /القرن التاسع عشر.*1866/s, /ثمانية عشر قرنًا/, /المغفرة باسم الكنيسة/],
  p198: [/وعي ومسؤولية واعتراف/, /المميتة أو غير القابلة للرجوع/, /أهمية غرس القيم والحكم الرشيد/, /لا يجيز التفويض/],
  p215: [/سلام يولد من العدل/, /السرقة والزنا/, /العربية متماسك/, /85، 11.*191.*84/s],
  p228: [/عطيّة من محبة الله غير المشروطة.*قيامة المسيح/s, /مجرّدًا من السلاح ومجرّدًا له ومتواضعًا ومثابرًا/, /العمل بلا تعب.*العلاقات والمجتمع/s],
  p231: [/بكاء الصغار وضعف المسنّين وصمت الضحايا وتعب/, /التجسّد/, /الآب/],
  p235: [/كلقاء شخصيّ.*جسد واحد/s, /للعدل وتقاسم الخيرات/, /للفقراء والمهمّشين/, /إعادة الصوت/],
  p236: [/علاقة بالله/, /لا يهربون إلى روحانية مجرّدة/, /الحقّ والتربية والعلاقات والعدل والسلام/],
  p239: [/فرص لقاء واتصال/, /المائدة المشتركة.*زيارة الوحيدين وخدمة الفقراء/s, /هيكلًا للروح/],
  p240: [/سلاسل الإنتاج والعمل وراء الأجهزة/, /أرباح الحرب/, /برجاء سماويّ يولّد تاريخًا أرضيًّا/],
  p244: [/الأرملة واليتيم والغريب والطفل الجريح والمنفيّ واللاجئ/, /مريم/, /تاريخيّ واجتماعيّ/],
  p245: [/مشاركة الذات والخيرات والأمانة/, /إيمان مريم/, /التجسّد/, /بلا وعد بتحسّن تقنيّ تلقائيّ/],
};
function standaloneErrors(index) {
  const errors = [];
  for (const [id, patterns] of Object.entries(standaloneRequirements)) {
    const text = index.paragraphs.find(p => p.paragraphId === id)?.explanation.text ?? '';
    for (const pattern of patterns) if (!pattern.test(text)) errors.push(`${id}: ${pattern}`);
  }
  return errors;
}

test('complete Arabic reading validates all stable identities, coverage and local edition', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'ar');
  assert.equal(reading.editionId, corpus.editionId);
  assert.equal(reading.revision, 'ar-2026-10-15-reading-1');
  assert.deepEqual([reading.concepts.length, reading.concepts.reduce((n,c)=>n+c.reasoning.length,0), reading.relations.length, reading.contexts.length, reading.readingSequence.length, reading.reviewedNotes.length], [27,86,44,245,245,224]);
  assert.equal(reading.readingSequence.filter(e=>e.placement==='main').length,203);
  assert.equal(reading.readingSequence.filter(e=>e.placement==='optional-context').length,42);
  assert.equal(new Set(reading.contexts.map(c=>c.explanation.text)).size,245);
  assert.equal(coverage.records.filter(r=>r.faithPremises.length).length,87);
  assert.equal(coverage.records.reduce((n,r)=>n+r.necessaryQualifications.length,0),121);
  assert.equal(coverage.records.reduce((n,r)=>n+r.exclusions.length,0),18);
});

test('all Arabic public blocks and every paragraph have current source-comparison bindings', () => {
  const blocks=publicBlocks();
  assert.equal(blocks.length,762);
  assert.equal(review.blocks.length,blocks.length);
  assert.equal(new Set(review.blocks.map(b=>b.id)).size,blocks.length);
  assert.equal(review.revision,reading.revision);
  assert.equal(review.sourceHtmlSha256,corpus.sourceHtmlSha256);
  for(const b of blocks){
    const evidence=review.blocks.find(e=>e.id===b.id);
    assert.ok(evidence,b.id);
    assert.equal(evidence.group,b.group,b.id);
    assert.equal(evidence.authoredSha256,hash(b.text),`renew review: ${b.id}`);
    assert.deepEqual(evidence.sourceRefs,b.sourceRefs,b.id);
    for(const id of b.sourceRefs)assert.equal(evidence.sourceHashes[id],corpus.paragraphs.find(p=>p.id===id).sha256,b.id);
  }
  assert.deepEqual(review.sourceComparisons.map(p=>p.paragraphId),corpus.paragraphs.map(p=>p.id));
  for(const [i,p] of review.sourceComparisons.entries()){
    assert.equal(p.sourceSha256,corpus.paragraphs[i].sha256);
    assert.equal(p.contextSha256,hash(context(p.paragraphId)));
    assert.ok(p.meaningCheck.length>30);
    assert.deepEqual(p.qualificationChecks,alignment.coverage[i].necessaryQualifications.map(q=>q.text));
  }
  assert.equal(review.groupReviews.length,16);
  assert.equal(review.groupReviews[0].start,'p001');
  assert.equal(review.groupReviews.at(-1).end,'p245');
  for(const [path,expected] of Object.entries(review.artifacts))assert.equal(hash(readFileSync(new URL(`../${path}`,import.meta.url))),expected,path);
  assert.match(review.method,/No external factual update or native-speaker proofreading is claimed/);
});

test('Arabic source index uses local exact quotations, notes, metadata and intentional dependencies', () => {
  const index=buildReadingIndex(inputs);
  assert.equal(index.paragraphs.length,245);assert.equal(index.notes.length,224);
  for(const p of index.paragraphs){
    assert.equal(p.sourceSha256,corpus.paragraphs.find(s=>s.id===p.paragraphId).sha256);
    assert.equal('text' in p,false);
    for(const q of p.quotations)assert.equal(corpus.paragraphs.find(s=>s.id===q.paragraphId).text.slice(q.start,q.end),q.text);
  }
  for(const n of index.notes){const s=corpus.footnotes.find(s=>s.id===n.id);assert.equal(n.text,s.text);assert.deepEqual(n.sourceLinks,s.sourceLinks);assert.deepEqual(n.paragraphIds,s.paragraphIds);}
  assert.deepEqual(index.notes.find(n=>n.id==='n084').paragraphIds,['p064']);
  assert.deepEqual(reading.reviewedNotes.filter(n=>n.classification==='source-argument-and-citation').map(n=>n.id),['n132','n174','n175','n182']);
  assert.equal(reading.reviewedNotes.filter(n=>n.previousReferenceKind==='same-work').length,35);
  assert.equal(reading.reviewedNotes.filter(n=>n.previousReferenceKind==='same-author').length,24);
  for(const n of alignment.notes){const local=reading.reviewedNotes.find(r=>r.id===n.noteId);assert.equal(local.sourceSha256,n.sourceSha256);assert.equal(local.previousNoteId,n.previousNoteId);assert.equal(local.previousReferenceKind,n.previousReferenceKind);}
  assert.match(context('p121'),/133.*مرجع ببليوغرافيّ فقط/s);
  assert.equal(reading.reviewedNotes.find(n=>n.id==='n217').previousNoteId,undefined);
});

test('built Arabic Source explanations independently preserve arguments, qualifications and local premises', () => {
  assert.deepEqual(standaloneErrors(buildReadingIndex(inputs)),[]);
  assert.equal(review.standaloneContextReview.allContexts.length,245);
  assert.equal(review.standaloneContextReview.mainPremisePairs.length,60);
  assert.equal(review.standaloneContextReview.mainReadingSequenceSha256,hash(JSON.stringify(reading.readingSequence)));
  for(const pair of review.standaloneContextReview.mainPremisePairs){assert.notEqual(main(pair.paragraphId),context(pair.paragraphId),pair.paragraphId);assert.equal(pair.mainSha256,hash(main(pair.paragraphId)));assert.equal(pair.contextSha256,hash(context(pair.paragraphId)));}
});

test('foundation-only Arabic Source fails meaning witnesses even with intact main prose', () => {
  for(const id of Object.keys(standaloneRequirements)){
    const bad=structuredClone(inputs);
    bad.reading.contexts.find(c=>c.paragraphId===id).explanation.text='يربط الكاتب هذه الفكرة بإيمانه بالله ودعوته المسيحيّة.';
    assert.deepEqual(validateReading(bad),[],`${id}: fixture remains structurally valid`);
    assert.ok(standaloneErrors(buildReadingIndex(bad)).some(e=>e.startsWith(`${id}:`)),`${id}: main text cannot rescue missing source argument`);
  }
});

test('Arabic dignity, active subsidiarity, care obligation, rights and employment distinctions remain visible', () => {
  assert.match(main('p052'),/الكرامة الأخلاقيّة.*الكرامة الاجتماعيّة.*كرامة الحياة.*الكرامة الوجوديّة/s);
  assert.match(main('p055'),/موقف الكنيسة.*الإجهاض.*القتل الرحيم/s);
  assert.match(main('p066'),/بحقّ الملكية.*لا يعدّه مطلقًا/s);
  assert.match(main('p069'),/لا يبرّران لامبالاة الدولة/);
  assert.match(main('p143'),/الوالدين الأوّليّ.*الأخلاقية والثقافية والدينية/s);
  assert.match(main('p118'),/يجب السعي إلى إزالة الألم.*لا يعني ذلك وعدًا بمحو كلّ وجع أو تبرير ترك المرض بلا علاج/s);
  assert.match(concept('embodiment').necessaryDistinction.text,/السعي لإزالة الألم/);
  assert.match(concept('care').necessaryDistinction.text,/السعي لإزالة الألم/);
  assert.match(reading.relations[16].explanation.text,/السعي لإزالة الألم/);
  assert.match(reading.trails[0].qualification.text,/السعي إلى إزالة الألم/);
  assert.match(main('p149'),/ضرورية في الطوارئ.*فقدان الوظيفة فقدانًا لقيمته/s);
  assert.match(main('p152'),/يرحّب.*الشاقّة والمتكررة والخطرة/s);
  assert.match(main('p169'),/العمل والخدمات والراحة/);
});

test('Arabic institutional criticism and military requirements retain the stronger local positions', () => {
  assert.match(main('p089'),/الروحيّ والاقتصاديّ والمؤسسيّ والجنسيّ.*الاعتراف بالضرر والتعويض والوقاية/s);
  assert.match(main('p138'),/بخجل.*صحفيون.*مسؤولية الكنيسة.*لا انتظار/s);
  assert.match(main('p176'),/بتأخّر الإدانة.*عبيدًا.*تشريع.*ثمانية عشر قرنًا.*1866.*باسم الكنيسة/s);
  assert.match(main('p192'),/الدفاع المشروع عن النفس بمعناه الدقيق/);
  assert.match(main('p197'),/كملاذ أخير/);
  assert.match(main('p198'),/المميتة أو غير القابلة للرجوع.*أهمية غرس القيم والحكم الرشيد.*لا يجيز التفويض/s);
  assert.doesNotMatch(main('p198'),/قدر الإمكان|بقدر المستطاع/);
  assert.match(main('p199'),/ثلاثة معايير.*مسؤوليات.*وقت.*المدنيين/s);
  assert.match(main('p200'),/رقابة بشرية فعلية وواعية ومسؤولة/);
  assert.match(reading.trails[5].reflection.feedback.text,/وجود مشغّل لا يثبت.*وقت للحكم الأخلاقيّ.*لا لاستبداله/s);
});

test('Arabic trails preserve finite stable routes, optional reflections, source refs and rendered estimates', () => {
  const reached=new Set();
  for(const t of reading.trails){const estimate=estimateTrailReading(t,reading);assert.equal(t.readingEstimate.words,estimate.words);assert.equal(t.readingEstimate.minutes,estimate.minutes);assert.match(t.readingEstimate.label,/تقريبيّ/);assert.match(t.readingEstimate.method,/200.*الأعلى/s);assert.equal(t.reflection.optional,true);assert.equal(t.reflection.responseFormat,'think-then-reveal');assert.ok(t.question.endsWith('؟'));for(const s of t.steps)reached.add(s.conceptId);for(const id of t.optionalConceptIds)reached.add(id);if(t.reflection.scenario)assert.ok(t.reflection.scenario.text.startsWith('حالة تحريرية متخيّلة:'));assert.ok(t.ending.text.length>100);}
  assert.deepEqual(reading.trails.map(t=>[t.id,t.steps.map(s=>[s.id,s.conceptId]),t.reflection.id]),english.trails.map(t=>[t.id,t.steps.map(s=>[s.id,s.conceptId]),t.reflection.id]));
  assert.ok(reached.has('history')&&reached.has('faith-foundations'));
  assert.equal(reading.trails.filter(t=>t.reflection.scenario).length,4);
  assert.match(reading.trails[1].reflection.feedback.text,/لا يصحّ اعتباره بلا قيمة.*المشاركة قبل حسم المعايير/s);
  assert.match(reading.trails[2].reflection.feedback.text,/ضروريًّا عاجلًا.*لا يعوّض تلقائيًّا/s);
  assert.match(reading.trails[4].reflection.feedback.text,/الاعتراف.*المسؤولية.*الإنصاف.*الوقاية/s);
});

test('Arabic public copy has no foreign filler and optional source contexts remain complete destinations', () => {
  for(const b of publicBlocks()){assert.match(b.text,/\p{Script=Arabic}/u,b.id);assert.doesNotMatch(b.text,/[A-Za-z\p{Script=Cyrillic}]|PLACEHOLDER|Optional source context/u,b.id);}
  for(const e of reading.readingSequence){assert.match(e.title,/\p{Script=Arabic}/u);assert.match(e.contextLinkLabel,/سياق/);if(e.placement==='optional-context'){assert.equal(e.explanation,undefined);assert.ok(context(e.contextId).length>150);}}
  for(const id of ['p108','p111','p116','p133','p215','p237','p241'])assert.ok(context(id).length>200);
  assert.match(context('p108'),/جماعات المؤمنين/);assert.match(context('p111'),/الجماعات المسيحيّة المعنيّة/);
  assert.match(context('p237'),/دون صفة مضافة/);assert.match(main('p241'),/الإصغاء والشجاعة والمسؤولية/);
});

test('Arabic validators reject missing notes, changed stable identities, spliced quotes and stale estimates', () => {
  const missing=structuredClone(inputs);missing.reading.reviewedNotes.pop();missing.reading.readingSequence.pop();assert.ok(validateReading(missing).some(e=>e.includes('exact source note requires reader review')));assert.ok(validateReading(missing).some(e=>e.includes('Complete source-ordered reading sequence')));
  const ids=structuredClone(inputs);ids.reading.concepts[0].reasoning[0].id='dignity-new';ids.reading.trails[0].steps[0].id='new-step';assert.ok(validateReading(ids).some(e=>e.includes('Stable localized concept/block')));assert.ok(validateReading(ids).some(e=>e.includes('Stable localized trail/step/reflection')));
  const quote=structuredClone(inputs);quote.reading.concepts[0].sourceQuotation.text+='...';assert.ok(validateReading(quote).some(e=>e.includes('exact and contiguous')));
  const stale=structuredClone(inputs);stale.reading.trails[0].introduction.text+=' كلمات إضافيّة.';assert.ok(validateReading(stale).some(e=>e.includes('reading estimate must derive')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const contract = read('../design/journeys.json');
const concepts = read('../content/editorial/concepts.json');
const relations = read('../content/editorial/relations.json');
const corpus = read('../content/source/en/corpus.json');

test('journey contract references the accepted edition and actual concepts, relations and source spans', () => {
  assert.equal(contract.editionId, corpus.editionId);
  assert.equal(contract.editionId, concepts.editionId);
  for (const journey of contract.walkthroughs) {
    for (const id of journey.conceptIds) assert.ok(concepts.concepts.some(c => c.id === id), `${journey.id}: ${id}`);
    for (const id of journey.sourceRefs) assert.ok(corpus.paragraphs.some(p => p.id === id), `${journey.id}: ${id}`);
    if (journey.relationId) {
      const relation = relations.relations.find(r => r.id === journey.relationId);
      assert.ok(relation, journey.id);
      assert.ok(journey.conceptIds.includes(relation.from) && journey.conceptIds.includes(relation.to));
      assert.equal(relation.placement, 'main');
    }
    if (journey.quotation) {
      const q = journey.quotation;
      const paragraph = corpus.paragraphs.find(p => p.id === q.paragraphId);
      assert.equal(paragraph.text.slice(q.start, q.end), q.text);
      assert.ok(journey.sourceRefs.includes(q.paragraphId));
    }
  }
});

test('no-results and invalid-link walkthroughs remain genuinely unmatched as content grows', () => {
  const invalid = contract.walkthroughs.find(j => j.id === 'invalid-link');
  assert.ok(!concepts.concepts.some(c => c.id === invalid.invalidConceptId));
  assert.ok(!corpus.paragraphs.some(p => p.id === invalid.invalidParagraphId));
  const query = new URLSearchParams(contract.walkthroughs.find(j => j.id === 'no-results').entry.split('?')[1]).get('q');
  assert.ok(!JSON.stringify(concepts).toLowerCase().includes(query));
});

const prototype = read('../design/storyboards/prototype-content.json');
test('storyboard preserves exact model meanings, relation directions and contiguous quotation', () => {
  assert.equal(prototype.editionId, corpus.editionId);
  for (const c of prototype.concepts) assert.deepEqual(c, concepts.concepts.find(x => x.id === c.id));
  for (const r of prototype.relations) {
    assert.deepEqual(r, relations.relations.find(x => x.id === r.id));
    assert.ok(prototype.concepts.some(c => c.id === r.from));
    assert.ok(prototype.concepts.some(c => c.id === r.to));
  }
  const q=prototype.quotation;
  assert.equal(corpus.paragraphs.find(p=>p.id===q.paragraphId).text.slice(q.start,q.end),q.text);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const locales = ['ar', 'be', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'ru'];
const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const json = path => JSON.parse(read(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const editions = locales.map(locale => ({
  locale,
  corpus: json(`content/source/${locale}/corpus.json`),
  structure: json(`content/source/${locale}/structure.json`),
  alignment: json(`content/source/${locale}/alignment.json`),
  verification: json(`content/source/${locale}/verification.json`),
}));

test('official editions bind all artifacts and complete local identities to their snapshots', () => {
  for (const { locale, corpus, structure } of editions) {
    const manifest = json(`content/source/${locale}/manifest.json`);
    for (const artifact of manifest.artifacts) {
      const bytes = read(`content/source/${locale}/${artifact.path}`);
      assert.equal(bytes.length, artifact.bytes);
      assert.equal(sha(bytes), artifact.sha256);
    }
    assert.equal(corpus.sourceHtmlSha256, sha(read(`content/source/${locale}/official.html`)));
    assert.equal(structure.sourceHtmlSha256, corpus.sourceHtmlSha256);
    assert.deepEqual(corpus.paragraphs.map(p => p.id), Array.from({ length: 245 }, (_, i) => `p${String(i + 1).padStart(3, '0')}`));
    assert.deepEqual(corpus.footnotes.map(n => n.number), structure.noteNumbers);
    assert.equal(new Set(corpus.footnotes.map(n => n.id)).size, structure.noteNumbers.length);
    for (const record of [...corpus.paragraphs, ...corpus.footnotes, ...corpus.ancillary]) {
      assert.equal(record.sha256, sha(record.text));
      assert.doesNotMatch(record.text, /\uFFFD/);
    }
  }
});

test('local headings remain separate and every source block has exactly one disposition', () => {
  for (const { corpus, structure, verification } of editions) {
    assert.equal(new Set(structure.inventory.map(item => item.id)).size, structure.inventory.length);
    assert.equal(verification.accountedBlockCount, structure.inventory.length);
    assert.equal(verification.sourceBlockCount, structure.inventory.length);
    const consumed = [
      ...corpus.paragraphs.flatMap(p => p.sourceBlockIds),
      ...corpus.footnotes.flatMap(n => n.sourceBlockIds),
      ...corpus.ancillary.map(item => item.sourceBlockId),
      ...structure.headings.flatMap(h => h.sourceBlockIds),
    ];
    assert.deepEqual(consumed.toSorted(), structure.inventory.map(item => item.id).toSorted());
    for (const paragraph of corpus.paragraphs) {
      assert.ok(paragraph.sectionIds.length);
      for (const id of paragraph.sectionIds) {
        const section = structure.sections.find(item => item.id === id);
        assert.ok(section && section.start <= paragraph.number && paragraph.number <= section.end);
        assert.equal(section.chapterId, paragraph.chapterId);
      }
    }
    for (const heading of structure.headings) {
      assert.ok(heading.title);
      const preceding = corpus.paragraphs.find(p => p.number === heading.start - 1);
      if (preceding) assert.ok(!preceding.text.endsWith(heading.title));
    }
  }
});

test('localized markers use JavaScript quotation coordinates and resolve in both directions', () => {
  for (const { corpus } of editions) {
    for (const paragraph of corpus.paragraphs) {
      assert.deepEqual(paragraph.footnoteIds, [...new Set(paragraph.noteReferences.map(reference => reference.noteId))]);
      for (const reference of paragraph.noteReferences) {
        assert.equal(paragraph.text.slice(reference.start, reference.end), reference.text);
        assert.match(reference.text, /^\[\s*\d+\s*\]$/u);
        assert.ok(corpus.footnotes.find(n => n.id === reference.noteId)?.paragraphIds.includes(paragraph.id));
      }
    }
    for (const note of corpus.footnotes) {
      assert.deepEqual(note.paragraphIds, corpus.paragraphs.filter(p => p.footnoteIds.includes(note.id)).map(p => p.id));
      assert.ok(note.paragraphIds.length);
    }
  }
});

test('alignment and boundary evidence cover requested paragraphs and every local note', () => {
  for (const { corpus, structure, alignment, verification } of editions) {
    assert.equal(alignment.sourceHtmlSha256, corpus.sourceHtmlSha256);
    assert.deepEqual(alignment.paragraphs.map(p => p.paragraphId), corpus.paragraphs.map(p => p.id));
    assert.deepEqual(alignment.notes.map(n => n.noteId), corpus.footnotes.map(n => n.id));
    assert.deepEqual(alignment.officialLinkAnomalies, structure.reviewedLinkAnomalies);
    assert.deepEqual(verification.paragraphSamples.map(p => p.paragraphId), [1, 52, 99, 176, 197, 198, 199, 200, 228, 245].map(n => `p${String(n).padStart(3, '0')}`));
    for (const [witnesses, records, key] of [[verification.paragraphSamples, corpus.paragraphs, 'paragraphId'], [verification.noteBoundaries, corpus.footnotes, 'noteId']]) {
      for (const witness of witnesses) {
        const record = records.find(item => item.id === witness[key]);
        assert.ok(record.text.startsWith(witness.opening));
        assert.ok(record.text.endsWith(witness.closing));
        assert.equal(record.sha256, witness.sha256);
      }
    }
    assert.deepEqual(verification.noteBoundaries.map(n => n.noteId), corpus.footnotes.map(n => n.id));
  }
});

test('official ingestion rejects Arabic and Cyrillic structural damage and preserves edition anomalies', () => {
  for (const script of ['tests/official-snapshots.py', 'tests/official-parser.py']) {
    const result = spawnSync('python3', [script], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

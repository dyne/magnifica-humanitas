"""Structural contracts use real snapshots and small Arabic/Cyrillic fixtures."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from official_source import extract, read_document, sha

spec = importlib.util.spec_from_file_location('ingest_official', ROOT / 'scripts/ingest-official-sources.py')
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)


def fixture(locale):
    template = (ROOT / f'tests/fixtures/official-{locale}.html').read_text()
    heading = 'عنوان الفصل' if locale == 'ar' else 'ЗАГОЛОВОК ГЛАВЫ'
    body = ''.join((f'<p>{heading}</p>' if number == 52 else '') +
                   f'<p>{number}. {"نصّ" if locale == "ar" else "Текст"} {number}' +
                   (' [7]' if number == 3 else '') + '.</p>' for number in range(3, 246))
    raw = template.replace('{{PARAGRAPHS}}', body).encode()
    blocks = read_document(raw)
    inventory = []
    for block in blocks:
        index, text = int(block['id'][1:]), block['text']
        item = {key: block[key] for key in ('id', 'tag', 'scope', 'sha256', 'links')}
        if index == 0:
            item['role'] = 'front-matter'
        elif index == 1 or text == heading:
            item['role'] = 'heading'
        elif index == 3:
            item.update(role='paragraph-continuation', paragraphId='p001')
        elif index == len(blocks) - 2:
            item.update(role='note-continuation', noteId='n001')
        elif text.startswith('['):
            item.update(role='note', number=7 if text.startswith('[ 7]') else 1)
        elif '. ' in text and text.split('. ', 1)[0].isdigit():
            item.update(role='paragraph', number=int(text.split('.', 1)[0]))
        else:
            item['role'] = 'closing'
        inventory.append(item)
    structure = {'locale': locale, 'editionId': 'fixture', 'sourceHtmlSha256': hashlib.sha256(raw).hexdigest(),
                 'inventory': inventory, 'noteNumbers': [1, 7],
                 'chapters': [{'id': 'introduction', 'start': 1, 'end': 245, 'title': blocks[1]['text']}],
                 'headings': [{'id': f'h{i}', 'title': b['text'], 'start': 1 if i == 0 else 52,
                               'end': 51 if i == 0 else 245, 'kind': 'section',
                               'sourceBlockIds': [b['id']], 'sha256': b['sha256']}
                              for i, b in enumerate(b for b, item in zip(blocks, inventory) if item['role'] == 'heading')]}
    for heading_item in structure['headings']:
        heading_item['chapterId'] = 'introduction'
    structure['sections'] = [{key: h[key] for key in ('id', 'title', 'chapterId', 'start', 'end')} for h in structure['headings']]
    return raw, structure


def rebind_hashes(raw, structure):
    """Exercise structural gates independently of the frozen-byte checksum gate."""
    structure = copy.deepcopy(structure)
    structure['sourceHtmlSha256'] = hashlib.sha256(raw).hexdigest()
    blocks = read_document(raw)
    if len(blocks) == len(structure['inventory']):
        for block, item in zip(blocks, structure['inventory']):
            item['sha256'] = block['sha256']
            item['links'] = block['links']
    return structure


class OfficialParserContract(unittest.TestCase):
    def test_fixtures_preserve_multiline_continuations_and_local_note_count(self):
        for locale in ('ar', 'ru'):
            with self.subTest(locale=locale):
                raw, structure = fixture(locale)
                corpus = extract(raw, structure)
                self.assertEqual(len(corpus['paragraphs']), 245)
                self.assertEqual([n['number'] for n in corpus['footnotes']], [1, 7])
                self.assertEqual(len(corpus['paragraphs'][0]['sourceBlockIds']), 2)
                self.assertEqual(len(corpus['footnotes'][0]['sourceBlockIds']), 2)
                self.assertNotIn('\n', corpus['paragraphs'][1]['text'])
                self.assertNotIn(structure['headings'][1]['title'], corpus['paragraphs'][50]['text'])
                self.assertEqual([n['paragraphIds'] for n in corpus['footnotes']], [['p001'], ['p003']])
                self.assertEqual(corpus['footnotes'][1]['sourceMarker'], '[ 7]')
                for reference in corpus['paragraphs'][0]['noteReferences']:
                    body = corpus['paragraphs'][0]['text'].encode('utf-16-le')
                    self.assertEqual(body[reference['start'] * 2:reference['end'] * 2].decode('utf-16-le'), '[1]')

    def test_missing_and_duplicate_paragraph_numbers_fail_even_with_rebound_hashes(self):
        for locale in ('ar', 'ru'):
            raw, structure = fixture(locale)
            for replacement in (b'244. ', b'246. '):
                damaged = raw.replace(b'245. ', replacement, 1)
                with self.subTest(locale=locale, replacement=replacement):
                    with self.assertRaisesRegex(ValueError, 'numbering changed|source paragraphs'):
                        extract(damaged, rebind_hashes(damaged, structure))

    def test_missing_or_changed_heading_fails(self):
        for locale in ('ar', 'ru'):
            raw, structure = fixture(locale)
            heading = structure['headings'][1]['title'].encode()
            damaged = raw.replace(heading, b'Changed heading')
            with self.subTest(locale=locale):
                with self.assertRaisesRegex(ValueError, 'Heading boundary'):
                    extract(damaged, rebind_hashes(damaged, structure))
                damaged = raw.replace(b'<p>' + heading + b'</p>', b'')
                with self.assertRaisesRegex(ValueError, 'inventory length'):
                    extract(damaged, rebind_hashes(damaged, structure))

    def test_heading_cannot_be_silently_classified_as_front_matter(self):
        raw, structure = fixture('ru')
        item = next(item for item in structure['inventory'] if item['id'] == structure['headings'][1]['sourceBlockIds'][0])
        item['role'] = 'front-matter'
        structure['headings'].pop()
        structure['sections'].pop()
        with self.assertRaisesRegex(ValueError, 'Front matter inside'):
            extract(raw, structure)

    def test_note_boundaries_and_dangling_markers_fail(self):
        for locale in ('ar', 'ru'):
            raw, structure = fixture(locale)
            for old, new in ((b'[ 7]', b'[ 1]'), (b'[ 7]', b'7.'), (b' [7]', b' [99]')):
                damaged = raw.replace(old, new, 1)
                with self.subTest(locale=locale, marker=old):
                    with self.assertRaisesRegex(ValueError, 'Note numbering|Missing note marker|Dangling note'):
                        extract(damaged, rebind_hashes(damaged, structure))

    def test_unicode_corruption_and_unclosed_markup_fail(self):
        for locale in ('ar', 'ru'):
            raw, structure = fixture(locale)
            for damaged in (raw.replace(b'&amp;', '\ufffd'.encode(), 1), raw.replace(b'</p>', b'', 1)):
                with self.subTest(locale=locale):
                    with self.assertRaises(ValueError):
                        rebind_hashes(damaged, structure)

    def test_all_saved_editions_reconstruct_exactly_and_account_for_every_block(self):
        for locale in ingest.LOCALES:
            with self.subTest(locale=locale):
                directory = ROOT / 'content/source' / locale
                structure = ingest.load(directory / 'structure.json')
                corpus = extract((directory / 'official.html').read_bytes(), structure)
                self.assertEqual(corpus, ingest.load(directory / 'corpus.json'))
                self.assertEqual(len(structure['inventory']), len(read_document((directory / 'official.html').read_bytes())))
                self.assertEqual([p['id'] for p in corpus['paragraphs']], [f'p{n:03}' for n in range(1, 246)])
                for record in corpus['paragraphs'] + corpus['footnotes']:
                    self.assertEqual(record['sha256'], sha(record['text']))

    def test_independent_html_reader_checks_requested_samples_and_every_note_boundary(self):
        # A separate HTMLParser reads all <p> elements, independently of the
        # reviewed richtext inventory used by the ingestion parser.
        spec = importlib.util.spec_from_file_location('snapshot_reader', ROOT / 'scripts/check-official-snapshots.py')
        snapshot_reader = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(snapshot_reader)
        import re
        for locale in ingest.LOCALES:
            with self.subTest(locale=locale):
                directory = ROOT / 'content/source' / locale
                parser = snapshot_reader.Snapshot()
                parser.feed((directory / 'official.html').read_text())
                numbered = {int(match[1]): match[2] for text in parser.blocks
                            if (match := re.fullmatch(r'(\d+)\.\s*(.*)', text))}
                notes = {int(match[1]): match[2] for text in parser.blocks
                         if (match := re.fullmatch(r'\[\s*(\d+)\s*\]\s*(.*)', text))}
                corpus = ingest.load(directory / 'corpus.json')
                for number in ingest.SAMPLE_NUMBERS:
                    self.assertEqual(corpus['paragraphs'][number - 1]['text'], numbered[number])
                self.assertEqual(len(notes), len(corpus['footnotes']))
                for note in corpus['footnotes']:
                    self.assertEqual(note['text'], notes[note['number']])

    def test_real_note_link_defects_are_preserved_without_invented_local_references(self):
        read = lambda locale: ingest.load(ROOT / f'content/source/{locale}/corpus.json')
        self.assertNotIn('n071', read('ar')['paragraphs'][65]['footnoteIds'])
        self.assertEqual(read('be')['footnotes'][83]['paragraphIds'], ['p064', 'p215'])
        self.assertEqual(read('it')['footnotes'][123]['sourceMarker'], '[ 124]')
        polish = read('pl')
        self.assertEqual(polish['footnotes'][32]['sourceLinks'][0]['name'], '_ft33')
        self.assertEqual(polish['footnotes'][218]['sourceLinks'][0]['name'], '_ftn210')
        self.assertEqual(polish['footnotes'][218]['id'], 'n219')

    def test_closing_and_devotional_text_remain_accounted_for(self):
        for locale in ingest.LOCALES:
            directory = ROOT / 'content/source' / locale
            corpus = ingest.load(directory / 'corpus.json')
            structure = ingest.load(directory / 'structure.json')
            blocks = {b['id']: b for b in read_document((directory / 'official.html').read_bytes())}
            for number in (228, 243, 244, 245):
                paragraph = corpus['paragraphs'][number - 1]
                original = blocks[paragraph['sourceBlockIds'][0]]['text'].split('.', 1)[1].lstrip()
                self.assertEqual(paragraph['text'], original)
            self.assertEqual(sum(item['role'] == 'closing' for item in structure['inventory']), 2)
            self.assertEqual(sum(item['role'] == 'closing' for item in corpus['ancillary']), 2)


if __name__ == '__main__':
    unittest.main()

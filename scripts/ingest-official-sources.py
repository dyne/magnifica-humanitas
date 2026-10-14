#!/usr/bin/env python3
"""Deterministic offline ingestion of the reviewed additional official editions."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess

from official_source import extract, require, sha

ROOT = Path(__file__).resolve().parent.parent
LOCALES = ('ar', 'be', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'ru')
SAMPLE_NUMBERS = (1, 52, 99, 176, 197, 198, 199, 200, 228, 245)


def load(path):
    return json.loads(path.read_text())


def compare_pdf(directory, corpus):
    version = subprocess.run(['pdftotext', '-v'], capture_output=True, text=True, check=True).stderr.splitlines()[0]
    text = subprocess.check_output(['pdftotext', '-layout', str(directory / 'comparison.pdf'), '-']).decode('utf-8')
    def key(value):
        return re.sub(r'\s+', '', value.replace('ﬁ', 'fi').replace('ﬂ', 'fl'))
    pdf_key = key(text)
    return {'sourceHtmlSha256': corpus['sourceHtmlSha256'],
            'pdfSha256': hashlib.sha256((directory / 'comparison.pdf').read_bytes()).hexdigest(),
            'tool': version, 'extractedTextSha256': sha(text),
            'method': 'Compare first/last 100 characters of HTML paragraphs 1, 123, 245 against full PDF layout text; ignore whitespace and fi/fl print ligatures only. Matches establish boundary witnesses, not complete edition equality.',
            'samples': [{'paragraphId': p['id'], 'sha256': p['sha256'],
                         'openingMatchesPdf': key(p['text'][:100]) in pdf_key,
                         'closingMatchesPdf': key(p['text'][-100:]) in pdf_key}
                        for p in corpus['paragraphs'] if p['number'] in (1, 123, 245)]}


def link_anomalies(corpus):
    anomalies = []
    for paragraph in corpus['paragraphs']:
        for link in paragraph['sourceLinks']:
            name = link.get('name', link.get('id', ''))
            match = re.fullmatch(r'_ftnref(\d+)', name)
            if match:
                number = int(match[1])
                if link['text'] != f'[{number}]' or link.get('href') != f'#_ftn{number}':
                    anomalies.append({'recordId': paragraph['id'], 'type': 'reference-anchor', 'sourceLink': link})
    if corpus['language'] != 'be':
        for note in corpus['footnotes']:
            expected_name = f'_ftn{note["number"]}'
            candidates = [link for link in note['sourceLinks']
                          if link.get('name', link.get('id', '')).startswith('_ft')]
            if (len(candidates) != 1 or candidates[0].get('name', candidates[0].get('id')) != expected_name
                    or candidates[0].get('href') != f'#_ftnref{note["number"]}'):
                anomalies.append({'recordId': note['id'], 'type': 'note-anchor', 'sourceLinks': candidates})
    return anomalies


def alignment(corpus, structure, english):
    english_notes = {note['id']: note for note in english['footnotes']}
    mappings = []
    for note in corpus['footnotes']:
        english_id = structure['englishNoteMapping'][note['id']]
        require(english_id in english_notes, 'Invalid English note correspondence')
        expected = english_notes[english_id]['paragraphIds']
        mappings.append({'noteId': note['id'], 'sourceNumber': note['number'],
                         'englishNoteId': english_id, 'sha256': note['sha256'],
                         'paragraphIds': note['paragraphIds'], 'englishParagraphIds': expected,
                         'referenceDifference': note['paragraphIds'] != expected})
    require(len(structure['englishNoteMapping']) == len(mappings), 'Unaccounted note correspondence')
    return {'editionId': corpus['editionId'], 'sourceHtmlSha256': corpus['sourceHtmlSha256'],
            'method': 'Numbered paragraph correspondence, source heading positions and per-note marker/reference audit. This records structural correspondence, not identical translated wording or semantic certification.',
            'paragraphs': [{'paragraphId': p['id'], 'sourceNumber': p['number'],
                            'englishParagraphId': p['id'], 'sha256': p['sha256']} for p in corpus['paragraphs']],
            'notes': mappings,
            'headings': [{'headingId': h['id'], 'start': h['start'],
                          'englishHeadingIds': h['alignedEnglishHeadingIds']} for h in structure['headings']],
            'officialLinkAnomalies': link_anomalies(corpus),
            'differences': structure['editionDifferences']}


def verification(corpus, structure):
    inventory = structure['inventory']
    witnesses = []
    for p in corpus['paragraphs']:
        if p['number'] in SAMPLE_NUMBERS:
            witnesses.append({'paragraphId': p['id'], 'sourceBlockIds': p['sourceBlockIds'],
                              'sha256': p['sha256'], 'opening': p['text'][:180], 'closing': p['text'][-180:],
                              'previousItem': inventory[int(p['sourceBlockIds'][0][1:]) - 1]['role'],
                              'nextItem': inventory[int(p['sourceBlockIds'][-1][1:]) + 1]['role']})
    return {'editionId': corpus['editionId'], 'sourceHtmlSha256': corpus['sourceHtmlSha256'],
            'method': 'Block inventory and exact-text boundary comparison against saved official HTML; opening and closing witnesses for all requested paragraph samples and every note. Automated structural evidence, not native-speaker proofreading.',
            'sourceBlockCount': len(inventory), 'accountedBlockCount': sum(Counter(item['role'] for item in inventory).values()),
            'blockRoles': dict(sorted(Counter(item['role'] for item in inventory).items())),
            'pdfBoundaryReview': structure['pdfBoundaryReview'],
            'paragraphSamples': witnesses,
            'noteBoundaries': [{'noteId': n['id'], 'sourceBlockIds': n['sourceBlockIds'],
                                'sourceMarker': n['sourceMarker'], 'opening': n['text'][:100],
                                'closing': n['text'][-100:], 'sha256': n['sha256']} for n in corpus['footnotes']]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare frozen outputs without writing')
    parser.add_argument('--compare-pdf', action='store_true', help='Also reproduce the optional Poppler PDF comparison witnesses')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('snapshots', ROOT / 'scripts/check-official-snapshots.py')
    snapshots = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(snapshots)
    snapshots.check()
    english = load(ROOT / 'content/source/en/corpus.json')
    for locale in LOCALES:
        directory = ROOT / 'content/source' / locale
        structure = load(directory / 'structure.json')
        corpus = extract((directory / 'official.html').read_bytes(), structure)
        if args.compare_pdf:
            require(compare_pdf(directory, corpus) == structure['pdfBoundaryReview'], f'{locale}: PDF comparison differs; check Poppler version and artifacts')
        result = alignment(corpus, structure, english)
        require(result['officialLinkAnomalies'] == structure['reviewedLinkAnomalies'], 'Unreviewed source link anomaly')
        require([note['noteId'] for note in result['notes'] if note['referenceDifference']] == structure['reviewedReferenceDifferenceIds'],
                'Unreviewed paragraph/note correspondence difference')
        for name, value in [('corpus.json', corpus), ('alignment.json', result),
                            ('verification.json', verification(corpus, structure))]:
            target = directory / name
            if args.check:
                require(load(target) == value, f'{locale}/{name} is stale')
            else:
                target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        print(f'{locale}: {len(corpus["paragraphs"])} paragraphs; {len(corpus["footnotes"])} notes; '
              f'{len(structure["headings"])} heading blocks; all {len(structure["inventory"])} source blocks accounted; deterministic check={args.check}')


if __name__ == '__main__':
    main()

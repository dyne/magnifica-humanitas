#!/usr/bin/env python3
"""Rebuild the authoritative PDF corpus; compare, never replace, its text with HTML."""
import argparse
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'content/source/en'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

class HtmlBlocks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.current = None
        self.bold = False
    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.current = ''
            self.bold = False
        if tag == 'b' and self.current is not None:
            self.bold = True
    def handle_data(self, data):
        if self.current is not None:
            self.current += data
    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            self.blocks.append((' '.join(self.current.split()), self.bold))
            self.current = None

def html_corpus(raw):
    parser = HtmlBlocks()
    parser.feed(raw)
    records, headings, current = {}, [], None
    active = False
    for text, bold in parser.blocks:
        if text.startswith('1. Humanity'):
            active = True
        if not active or not text:
            continue
        if text.startswith('Given in Rome,'):
            break
        match = re.match(r'^(\d+)\. (.*)', text)
        if match:
            current = int(match[1])
            records[current] = match[2]
        elif bold:
            headings.append({'title': text, 'afterParagraph': current})
        elif current:
            records[current] += ' ' + text
    return records, headings

def join_lines(lines):
    # Keep printed hyphens, but remove only the layout space following them.
    result = ''
    for line in lines:
        if result.endswith('-'):
            result += line
        else:
            result += (' ' if result else '') + line
    return result

def parse_pdf(raw, structure):
    lines = []
    for page, body in enumerate(raw.split('\f'), 1):
        for line in body.splitlines():
            s = line.strip()
            if not s or s.startswith(('22/07/26, 13:46', 'https://www.vatican.va/')):
                continue
            lines.append((s, page))
    start = next(i for i, (s, _) in enumerate(lines) if s.startswith('1. Humanity'))
    end = next(i for i, (s, _) in enumerate(lines) if s.startswith('Given in Rome,'))
    heading_titles = {h['title'] for h in structure['headings']}
    # A heading can occupy several print lines, including across a page break.
    heading_lines, seen = set(), []
    i = start
    while i < end:
        for count in range(1, 5):
            title = ' '.join(s for s, _ in lines[i:i+count])
            if title in heading_titles:
                heading_lines.update(range(i, i+count))
                seen.append(title)
                i += count - 1
                break
        i += 1
    if seen != [h['title'] for h in structure['headings']]:
        raise ValueError('PDF headings differ from the verified structure: ' + repr(seen))
    paragraphs, current, parts, pages = [], None, [], set()
    def flush():
        if current is None:
            return
        text = join_lines(parts)
        chapter = next(c for c in structure['chapters'] if c['start'] <= current <= c['end'])
        sections = [h['id'] for h in structure['sections'] if h['start'] <= current <= h['end']]
        paragraphs.append({'id': f'p{current:03}', 'number': current, 'chapterId': chapter['id'],
                           'sectionIds': sections, 'text': text, 'pages': sorted(pages),
                           'footnoteIds': list(dict.fromkeys(f'n{int(n):03}' for n in re.findall(r'\[(\d+)\]', text))),
                           'sha256': digest(text.encode())})
    for i in range(start, end):
        if i in heading_lines:
            continue
        text, page = lines[i]
        match = re.match(r'^(\d+)\. (.*)', text)
        if match:
            flush()
            current, parts, pages = int(match[1]), [match[2]], {page}
        else:
            parts.append(text)
            pages.add(page)
    flush()
    notes, number, parts, pages = [], None, [], set()
    note_start = next(i for i, (s, _) in enumerate(lines) if s.startswith('[1] '))
    def flush_note():
        if number is not None:
            text = join_lines(parts)
            notes.append({'id': f'n{number:03}', 'number': number, 'text': text, 'pages': sorted(pages), 'sha256': digest(text.encode()),
                          'paragraphIds': [p['id'] for p in paragraphs if f'n{number:03}' in p['footnoteIds']]})
    for text, page in lines[note_start:]:
        if text.startswith('Copyright ©'):
            break
        match = re.match(r'^\[(\d+)\]\s*(.*)', text)
        if match:
            flush_note()
            number, parts, pages = int(match[1]), [match[2]], {page}
        else:
            parts.append(text)
            pages.add(page)
    flush_note()
    assert [p['number'] for p in paragraphs] == list(range(1,246))
    assert [n['number'] for n in notes] == list(range(1,225))
    return paragraphs, notes

def compare_key(text):
    # Whitespace and typographic ligatures are print-layout artifacts. Preserve
    # punctuation, lexical choices and all other characters for difference review.
    return re.sub(r'\s+', '', text.replace('ﬁ','fi').replace('ﬂ','fl'))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', type=Path, help='Explicit owner PDF; verified hash required before pdftotext')
    ap.add_argument('--check', action='store_true', help='Check deterministic corpus without writing')
    args = ap.parse_args()
    raw = (SOURCE / 'pdf-layout.txt').read_text()
    if args.pdf:
        expected = json.loads((ROOT/'research/source-manifest.json').read_text())['inputs'][0]['sha256']
        if digest(args.pdf.read_bytes()) != expected:
            raise ValueError('Supplied PDF does not match the owner edition')
        extracted = subprocess.check_output(['pdftotext','-layout',str(args.pdf),'-']).decode()
        if extracted != raw:
            raise ValueError('Extraction differs from frozen Poppler 25.03.0 output; review before changing source')
    structure = json.loads((SOURCE/'structure.json').read_text())
    paragraphs, notes = parse_pdf(raw, structure)
    corpus = {'editionId': 'mh-en-owner-2026', 'paragraphs': paragraphs, 'footnotes': notes}
    html = (SOURCE/'official-2026-10-13.html').read_text()
    online, _ = html_corpus(html)
    differences = [{'paragraphId': p['id'], 'pdfText': p['text'], 'officialHtmlText': online.get(p['number']), 'status': 'PDF authoritative; difference requires explicit review before adopting web wording'} for p in paragraphs if compare_key(p['text']) != compare_key(online.get(p['number'],''))]
    comparison = {'comparedOn':'2026-10-13','method':'All 245 numbered bodies; ignore whitespace and fi/fl print ligatures only. PDF wording never replaced.', 'officialHtmlSha256':digest((SOURCE/'official-2026-10-13.html').read_bytes()), 'paragraphsCompared':len(online), 'differences':differences}
    for name, value in [('corpus.json',corpus),('comparison.json',comparison)]:
        target = SOURCE/name
        if args.check:
            assert json.loads(target.read_text()) == value, f'{name} is stale'
        else:
            write_json(target,value)
    print(f'245 paragraphs; 224 notes; {len(structure["headings"])} verified headings; {len(differences)} explicit web differences; deterministic check={args.check}')

if __name__ == '__main__':
    main()

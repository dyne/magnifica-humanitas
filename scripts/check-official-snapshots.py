#!/usr/bin/env python3
"""Offline integrity and edition witnesses; no network or PDF tool required."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES = ('ar', 'be', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'ru')


class Snapshot(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.language = None
        self.canonical = None
        self.blocks = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.language = attrs.get('lang')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'p':
            if self.current is not None:
                raise ValueError('Nested/unclosed source paragraph')
            self.current = ''
        if tag == 'br' and self.current is not None:
            self.current += ' '

    def handle_data(self, data):
        if self.current is not None:
            self.current += data

    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            self.blocks.append(' '.join(self.current.split()))
            self.current = None


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def inspect(raw):
    text = raw.decode('utf-8', errors='strict')
    if '\ufffd' in text:
        raise ValueError('Replacement character in source')
    parsed = Snapshot()
    parsed.feed(text)
    if parsed.current is not None:
        raise ValueError('Unclosed source paragraph')
    paragraphs = [block for block in parsed.blocks if re.match(r'^\d+\.', block)]
    numbers = [int(re.match(r'^(\d+)\.', block)[1]) for block in paragraphs]
    if numbers != list(range(1, 246)):
        raise ValueError('Missing, duplicate or unordered paragraph numbers')
    samples = {}
    for number in (1, 123, 245):
        body = paragraphs[number - 1]
        samples[f'p{number:03}'] = {'sha256': sha(body.encode()), 'opening': body[:180], 'closing': body[-180:]}
    opening = parsed.blocks.index(paragraphs[0])
    samples['openingHeading'] = parsed.blocks[opening - 1]
    notes = [(int(match[1]), block) for block in parsed.blocks
             if (match := re.match(r'^\[\s*(\d+)\s*\]', block))]
    if not notes or [number for number, _ in notes] != sorted(set(number for number, _ in notes)):
        raise ValueError('Missing, duplicate or unordered note markers')
    for number, note in (notes[0], notes[-1]):
        samples[f'n{number:03}'] = {'sha256': sha(note.encode()), 'opening': note[:180], 'closing': note[-180:]}
    return parsed, samples


def check():
    for locale in LOCALES:
        directory = ROOT / 'content/source' / locale
        manifest = json.loads((directory / 'manifest.json').read_text())
        require(manifest['locale'] == locale, f'{locale}: manifest edition')
        require(manifest['sourceLanguage']['code'] == locale, f'{locale}: manifest language')
        require(manifest['selectedFormat'] == 'HTML', f'{locale}: unsupported source format')
        for artifact in manifest['artifacts']:
            raw = (directory / artifact['path']).read_bytes()
            require(len(raw) == artifact['bytes'], f'{locale}: artifact byte count')
            require(sha(raw) == artifact['sha256'], f'{locale}: artifact checksum')
            require(artifact['httpStatus'] == 200, f'{locale}: HTTP failure')
            require(artifact['retrievedAt'], f'{locale}: missing retrieval date')
            require(artifact['finalUrl'].startswith('https://www.vatican.va/'), f'{locale}: unofficial final URL')
            if artifact['path'].endswith('.pdf'):
                require(raw.startswith(b'%PDF-'), f'{locale}: invalid PDF signature')
        parsed, samples = inspect((directory / 'official.html').read_bytes())
        require(parsed.language == locale, f'{locale}: HTML language')
        require(parsed.canonical == manifest['canonicalUrl'], f'{locale}: canonical URL differs')
        require(f'/{locale}/encyclicals/documents/20260515-magnifica-humanitas.html' in parsed.canonical,
                f'{locale}: canonical document differs')
        require(manifest['sourceLanguage']['openingWitness'] in samples['p001']['opening'], f'{locale}: language witness differs')
        require(samples == manifest['inspection']['htmlSamples'], f'{locale}: source witnesses changed')
        require(manifest['inspection']['selectionReason'], f'{locale}: missing selection review')
        require(manifest['copyright'].endswith('Libreria Editrice Vaticana'), f'{locale}: missing attribution')
        print(f'{locale}: artifact hashes, language witnesses, §§1/123/245, heading and first/final notes verified')


if __name__ == '__main__':
    check()

#!/usr/bin/env python3
"""Explicit network acquisition; normal source checks use only frozen inputs."""
import concurrent.futures
import hashlib
import json
import platform
import re
import runpy
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENTRY = 'https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html'
LOCALES = ('ar', 'be', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'ru')
LANGUAGES = {'ar': ('Arabic', 'Arabic'), 'be': ('Belarusian', 'Cyrillic'),
             'de': ('German', 'Latin'), 'es': ('Spanish', 'Latin'),
             'fr': ('French', 'Latin'), 'it': ('Italian', 'Latin'),
             'pl': ('Polish', 'Latin'), 'pt': ('Portuguese', 'Latin'),
             'ru': ('Russian', 'Cyrillic')}


def inspection(locale, directory, html):
    """Record review inputs; automatic extraction does not certify language fidelity."""
    checker = runpy.run_path(str(ROOT / 'scripts/check-official-snapshots.py'))
    parsed, samples = checker['inspect'](html)
    pdf = subprocess.check_output(['pdftotext', '-layout', str(directory / 'comparison.pdf'), '-']).decode('utf-8')
    version = subprocess.run(['pdftotext', '-v'], capture_output=True, text=True, check=True).stderr.splitlines()[0]
    reason = ('HTML preserves native Unicode text, numbered blocks, explicit heading markup and '
              'note/reference anchors without PDF running headers, page breaks and wrapped lines. '
              'The linked PDF is retained for comparison, not used for extraction.')
    if locale == 'be':
        reason = 'The linked PDF is English, not Belarusian. Reject it as a Belarusian source; choose the structured Belarusian HTML.'
    if locale == 'ar':
        reason = ('HTML preserves Arabic in logical Unicode order and intact combining marks. '
                  'PDF layout adds directional controls, visual line arrangement and detached diacritics; choose HTML.')
    return {'sourceLanguage': {'code': locale, 'name': LANGUAGES[locale][0],
                               'script': LANGUAGES[locale][1], 'htmlLang': parsed.language,
                               'openingWitness': samples['p001']['opening'][3:60]},
            'inspection': {'method': 'Acquired comparison samples; inspect language, heading, note and body witnesses before freezing. Not native-speaker proofreading.',
                           'htmlSamples': samples, 'selectionReason': reason,
                           'pdfComparison': {'tool': 'pdftotext -layout', 'version': version,
                                             'textSha256': checker['sha'](pdf.encode()),
                                             'characters': len(pdf), 'replacementCharacters': pdf.count('\ufffd'),
                                             'directionalControls': sum(pdf.count(c) for c in '\u202a\u202b\u202c'),
                                             'opening': pdf.strip()[:350],
                                             'actualLanguage': 'en' if locale == 'be' else locale}}}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')


def download(url):
    quoted = urllib.parse.quote(url, safe=':/%?=&')
    with urllib.request.urlopen(quoted, timeout=90) as response:
        data = response.read()
        return data, {'requestedUrl': url, 'finalUrl': response.url,
                      'httpStatus': response.status,
                      'retrievedAt': datetime.now(timezone.utc).isoformat(),
                      'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                      'contentType': response.headers.get('Content-Type')}


def acquire(locale, url):
    directory = ROOT / 'content/source' / locale
    if directory.exists():
        raise ValueError(f'Refusing to overwrite frozen edition: {locale}')
    html, artifact = download(url)
    text = html.decode('utf-8', errors='strict')
    links = Links()
    links.feed(text)
    if not links.canonical or f'/{locale}/encyclicals/' not in links.canonical:
        raise ValueError(f'Wrong canonical edition: {locale}')
    if '20260515-magnifica-humanitas' not in text or len(html) < 100000:
        raise ValueError(f'Not a complete document: {locale}')
    pdf_links = [urllib.parse.urljoin(url, href) for href in links.links
                 if '/content/dam/leo-xiv/pdf/encyclicals/' in href and href.lower().endswith('.pdf')]
    directory.mkdir()
    (directory / 'official.html').write_bytes(html)
    artifact['path'] = 'official.html'
    manifest = {'schemaVersion': 1, 'locale': locale, 'document': 'Magnifica Humanitas',
                'author': 'Leo XIV', 'documentDate': '2026-05-15',
                'discoveredFrom': ENTRY, 'canonicalUrl': links.canonical,
                'copyright': 'Copyright © Dicastery for Communication – Libreria Editrice Vaticana',
                'selectedFormat': 'HTML', 'artifacts': [artifact],
                'acquisitionTool': {'name': 'Python urllib.request', 'version': platform.python_version()},
                'extractionTool': {'name': 'Python html.parser.HTMLParser', 'version': platform.python_version()},
                'linkedPdfUrls': list(dict.fromkeys(pdf_links))}
    for index, pdf_url in enumerate(manifest['linkedPdfUrls']):
        pdf, pdf_artifact = download(pdf_url)
        if not pdf.startswith(b'%PDF-'):
            raise ValueError(f'Linked PDF is not PDF: {locale}')
        name = 'comparison.pdf' if index == 0 else f'comparison-{index}.pdf'
        (directory / name).write_bytes(pdf)
        pdf_artifact['path'] = name
        manifest['artifacts'].append(pdf_artifact)
    manifest.update(inspection(locale, directory, html))
    (directory / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return locale, len(html), len(pdf_links)


def main():
    entry, _ = download(ENTRY)
    links = Links()
    links.feed(entry.decode('utf-8'))
    urls = {locale: [urllib.parse.urljoin(ENTRY, href) for href in links.links
                     if re.fullmatch(rf'/content/leo-xiv/{locale}/encyclicals/documents/20260515-magnifica-humanitas.html', href)]
            for locale in LOCALES}
    if any(len(value) != 1 for value in urls.values()):
        raise ValueError('Official language links missing or duplicated')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(acquire, locale, urls[locale][0]) for locale in LOCALES]
        for future in futures:
            locale, size, pdfs = future.result()
            print(f'{locale}: saved HTML {size} bytes; {pdfs} linked PDFs')


if __name__ == '__main__':
    main()

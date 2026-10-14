"""Read official HTML blocks without guessing headings from translated wording."""
import hashlib
import re
from html.parser import HTMLParser


def normalize(text):
    # Decode entities in HTMLParser; collapse Unicode whitespace only. Preserve
    # spelling, punctuation, combining marks, diacritics, hyphens and bidi data.
    return ' '.join(text.split())


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.divs = []
        self.blocks = []
        self.current = None
        self.link = None
        self.orphan = ''

    @property
    def scope(self):
        return next((value for value in reversed(self.divs) if value), None)

    def flush_orphan(self):
        if normalize(self.orphan):
            self.blocks.append({'tag': 'text', 'scope': self.scope,
                                'text': normalize(self.orphan), 'links': []})
        self.orphan = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            classes = attrs.get('class', '').split()
            self.divs.append(('abstract' if 'abstract' in classes else 'document')
                             if 'vaticanrichtext' in classes else None)
        if not self.scope:
            return
        if tag == 'p':
            require(self.current is None, 'Nested or unclosed HTML paragraph')
            self.flush_orphan()
            self.current = {'tag': tag, 'scope': self.scope, 'text': '', 'links': []}
        if tag == 'br' and self.current is not None:
            self.current['text'] += '\n'
        if tag == 'a' and self.current is not None:
            require(self.link is None, 'Nested source link')
            self.link = {**attrs, 'text': ''}

    def handle_data(self, data):
        if not self.scope:
            return
        if self.current is not None:
            self.current['text'] += data
            if self.link is not None:
                self.link['text'] += data
        else:
            self.orphan += data

    def handle_endtag(self, tag):
        if self.scope:
            if tag == 'a' and self.link is not None:
                self.link['text'] = normalize(self.link['text'])
                self.current['links'].append(self.link)
                self.link = None
            if tag == 'p' and self.current is not None:
                require(self.link is None, 'Unclosed source link')
                self.current['text'] = normalize(self.current['text'])
                self.blocks.append(self.current)
                self.current = None
            if tag == 'div':
                self.flush_orphan()
        if tag == 'div':
            require(bool(self.divs), 'Unbalanced source div')
            self.divs.pop()


def read_document(raw):
    text = raw.decode('utf-8', errors='strict')
    require('\ufffd' not in text, 'Corrupt Unicode replacement character')
    doc = Document()
    doc.feed(text)
    doc.close()
    require(doc.current is None and doc.link is None and not doc.divs,
            'Unclosed source markup')
    require(doc.blocks, 'Missing official document container')
    for index, block in enumerate(doc.blocks):
        block['id'] = f'b{index:04}'
        block['sha256'] = sha(block['text'])
    return doc.blocks


PARAGRAPH = re.compile(r'^(\d+)\.\s*(.*)$', re.S)
NOTE = re.compile(r'^\[\s*(\d+)\s*\]\s*(.*)$', re.S)
REFERENCE = re.compile(r'\[\s*(\d+)\s*\]')


def extract(raw, structure):
    """The reviewed inventory assigns every block; unexpected blocks fail closed."""
    require(hashlib.sha256(raw).hexdigest() == structure['sourceHtmlSha256'], 'HTML does not match reviewed edition')
    blocks = read_document(raw)
    inventory = structure['inventory']
    require(len(blocks) == len(inventory), 'Source block inventory length changed')
    for block, expected in zip(blocks, inventory):
        require(all(block[key] == expected[key] for key in ('id', 'tag', 'scope', 'sha256')),
                f'Source block boundary/hash changed: {block["id"]}')
        require(block['links'] == expected['links'], f'Source links changed: {block["id"]}')
    by_id = {block['id']: block for block in blocks}
    require(len({item['id'] for item in inventory}) == len(inventory), 'Duplicate inventory ID')
    paragraphs, notes, ancillary = [], [], []
    headings = structure['headings']
    require(structure['sections'] == [{key: h[key] for key in ('id', 'title', 'chapterId', 'start', 'end')}
                                     for h in headings], 'Sections differ from reviewed source headings')
    coverage = [number for chapter in structure['chapters'] for number in range(chapter['start'], chapter['end'] + 1)]
    require(coverage == list(range(1, 246)), 'Chapter ranges have gaps or overlaps')
    for chapter in structure['chapters']:
        opening = [h for h in headings if h['start'] == chapter['start']]
        require(chapter['title'] == ' '.join(h['title'] for h in opening), 'Chapter title differs from source headings')
    require(len(headings) == sum(item['role'] == 'heading' for item in inventory), 'Heading inventory differs')
    require(len({h['id'] for h in headings}) == len(headings), 'Duplicate heading ID')
    allowed_roles = {'front-matter', 'heading', 'paragraph', 'paragraph-continuation',
                     'note', 'note-continuation', 'closing', 'separator', 'blank', 'copyright'}
    phase = 'front'
    for item in inventory:
        require(item['role'] in allowed_roles, 'Unknown source block role')
        block = by_id[item['id']]
        text = block['text']
        role = item['role']
        if role == 'paragraph':
            require(phase in ('front', 'body'), 'Paragraph after closing or notes')
            phase = 'body'
            match = PARAGRAPH.fullmatch(text)
            require(match is not None, 'Missing paragraph marker')
            number, body = int(match[1]), match[2]
            require(number == item['number'], 'Paragraph numbering changed')
            chapter = next(c for c in structure['chapters'] if c['start'] <= number <= c['end'])
            paragraphs.append({'id': f'p{number:03}', 'number': number,
                               'chapterId': chapter['id'],
                               'sectionIds': [h['id'] for h in headings if h['start'] <= number <= h['end']],
                               'text': body, 'pages': [], 'sourceBlockIds': [block['id']],
                               'sourceLinks': block['links'][:]})
        elif role == 'paragraph-continuation':
            require(phase == 'body', 'Paragraph continuation outside body')
            require(paragraphs and paragraphs[-1]['id'] == item['paragraphId'], 'Orphan paragraph continuation')
            require(not PARAGRAPH.match(text) and not NOTE.match(text), 'Marker in paragraph continuation')
            paragraphs[-1]['text'] += ' ' + text
            paragraphs[-1]['sourceBlockIds'].append(block['id'])
            paragraphs[-1]['sourceLinks'].extend(block['links'])
        elif role == 'note':
            require(paragraphs and paragraphs[-1]['number'] == 245 and phase in ('body', 'closing', 'notes'), 'Note before body ends')
            phase = 'notes'
            match = NOTE.fullmatch(text)
            require(match is not None, 'Missing note marker')
            number, body = int(match[1]), match[2]
            require(number == item['number'], 'Note numbering changed')
            notes.append({'id': f'n{number:03}', 'number': number, 'text': body,
                          'sourceMarker': text[:match.start(2)].rstrip(),
                          'pages': [], 'sourceBlockIds': [block['id']], 'sourceLinks': block['links'][:]})
        elif role == 'note-continuation':
            require(phase == 'notes', 'Note continuation outside notes')
            require(notes and notes[-1]['id'] == item['noteId'], 'Orphan note continuation')
            require(not NOTE.match(text) and not PARAGRAPH.match(text), 'Marker in note continuation')
            notes[-1]['text'] += ' ' + text
            notes[-1]['sourceBlockIds'].append(block['id'])
            notes[-1]['sourceLinks'].extend(block['links'])
        elif role == 'heading':
            require(phase in ('front', 'body'), 'Heading after body')
            heading = next((h for h in headings if h['sourceBlockIds'] == [block['id']]), None)
            require(heading and heading['title'] == text and heading['sha256'] == sha(text), 'Heading boundary mismatch')
        else:
            require(bool(text) == (role != 'blank'), 'Nonempty blank or empty ancillary block')
            if role == 'front-matter':
                require(phase == 'front', 'Front matter inside source body')
            if role in ('closing', 'separator'):
                require(paragraphs and paragraphs[-1]['number'] == 245 and phase in ('body', 'closing'), 'Closing inside paragraph body or notes')
                phase = 'closing'
            ancillary.append({'role': role, 'sourceBlockId': block['id'], 'text': text,
                              'sourceLinks': block['links'], 'sha256': sha(text)})
    numbers = [p['number'] for p in paragraphs]
    require(numbers == list(range(1, 246)), 'Missing, duplicate or unordered source paragraphs')
    observed_notes = [n['number'] for n in notes]
    require(observed_notes == structure['noteNumbers'], 'Missing, duplicate or unordered edition notes')
    require(observed_notes == sorted(set(observed_notes)), 'Duplicate/unordered note identity')
    for heading in headings:
        starts = [item['number'] for item in inventory
                  if item['role'] == 'paragraph' and item['id'] > heading['sourceBlockIds'][0]]
        require(starts and starts[0] == heading['start'], 'Heading assigned to wrong paragraph boundary')
        require(heading['start'] <= heading['end'] <= 245, 'Invalid heading range')
    note_ids = {n['id'] for n in notes}
    for paragraph in paragraphs:
        text = paragraph['text']
        references = [f'n{int(n):03}' for n in REFERENCE.findall(text)]
        require(set(references) <= note_ids, f'Dangling note in {paragraph["id"]}')
        paragraph['footnoteIds'] = list(dict.fromkeys(references))
        paragraph['sha256'] = sha(text)
        paragraph['noteReferences'] = []
        for match in REFERENCE.finditer(text):
            # These are UTF-16 code-unit indices, matching JavaScript substring.
            start = len(text[:match.start()].encode('utf-16-le')) // 2
            end = len(text[:match.end()].encode('utf-16-le')) // 2
            paragraph['noteReferences'].append({'noteId': f'n{int(match[1]):03}',
                                                'start': start, 'end': end, 'text': match[0]})
    for note in notes:
        note['paragraphIds'] = [p['id'] for p in paragraphs if note['id'] in p['footnoteIds']]
        require(note['text'] and note['paragraphIds'], f'Empty or unreferenced note {note["id"]}')
        note['sha256'] = sha(note['text'])
    return {'editionId': structure['editionId'], 'language': structure['locale'],
            'sourceHtmlSha256': hashlib.sha256(raw).hexdigest(),
            'paragraphs': paragraphs, 'footnotes': notes, 'ancillary': ancillary}

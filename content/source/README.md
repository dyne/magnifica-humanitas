# Authoritative English source

`en/corpus.json` addresses every numbered paragraph (`p001`–`p245`) and every
endnote (`n001`–`n224`) in the owner's saved English PDF. Paragraph IDs are stable
across future editions and languages; alignment must be verified for each
language's official translation. The full original is available at the
[Holy See](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html).

Source attribution: Leo XIV, *Magnifica Humanitas*, 15 May 2026.
Copyright © Dicastery for Communication – Libreria Editrice Vaticana.
This attribution applies to the source text and snapshots. It does not grant a
license to that text or describe the license of original code/commentary.

## Reproduction

Requires Node 22+ and Python 3. No network access, dependencies or owner's external
files are needed to validate a clean clone:

```sh
npm test
npm run source:check
```

`npm run source:ingest` rebuilds JSON from the frozen `en/pdf-layout.txt`, the
verified `en/structure.json` and the dated official HTML snapshot. For independent
re-extraction, install Poppler 25.03.0 and explicitly supply the owner's PDF:

```sh
python3 scripts/ingest-source.py --pdf '/explicit/path/to/owner.pdf' --check
```

The PDF hash must match before extraction. A different Poppler output is an
explicit failure requiring review; the script never silently updates the raw
snapshot. Source input checksums and output hashes are in
`research/source-manifest.json`. The saved mojibake text remains an original
input, not a source for repaired reader copy.

## Structure and normalization

Print headers/URLs and blank lines are layout artifacts. The parser recognizes
81 exact intervening headings, including headings split across print lines,
before assembling numbered bodies. Endnotes are parsed separately after the
terminal date/signature; note 158 has no space after its marker. Retain printed
hyphens when joining wrapped lines. No spellings or doctrinal claims are repaired.
All note references have backlinks and all paragraph bodies have chapter,
section, print page and SHA-256 metadata.

`structure.json` preserves printed headings and their source order. Sections
labelled `editorialLabel: true` name chapter openings which have no printed
subheading. These labels must never be represented as source quotations.
Chapter headings are separate from source paragraph bodies. The date/signature
and source copyright remain in the frozen original, outside numbered paragraphs.

## Edition comparison

`official-2026-10-13.html` is a dated comparison snapshot, not the authority for
this corpus. All 245 bodies were compared ignoring whitespace and fi/fl print
ligatures only. Paragraph 82 has one extra `[10]` marker in the web edition,
after `[110]`. `comparison.json` records both complete versions. The PDF's
`[110]` remains unchanged. All other bodies match under that limited comparison.
This does not assert byte equality, historical identity of editions, or a full
comparison of endnote wording. Headings and notes are verified against the PDF.

`research/source-verification.json` records opening/closing samples from every
chapter. Verification concerns extracted content and structural boundaries;
it makes no claim to have reviewed PDF typography visually.

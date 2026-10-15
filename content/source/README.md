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

## Official additional editions (14 October 2026)

The directories `ar`, `be`, `de`, `es`, `fr`, `it`, `pl`, `pt` and `ru` freeze
the official language links followed from the English Vatican document. `be`
means Belarusian. Each contains untouched response bytes in `official.html`,
the document's linked `comparison.pdf`, and a `manifest.json` with requested,
canonical and final URLs, UTC retrieval time, byte counts, SHA-256, language,
tool versions, attribution and bounded inspection witnesses. The Vatican's
canonical metadata uses HTTP; actual retrieval and final URLs use HTTPS.
The English directory and its authority remain unchanged.

All nine select HTML for deterministic ingestion. It provides logical Unicode
text and explicit paragraph, heading and note anchors without print headers,
page breaks or wrapped lines. Latin PDFs were compared with the corresponding
HTML at the opening, middle and end; Arabic and Russian were separately checked
for their script extraction. Poppler 25.03.0's Arabic layout output introduces
13,720 bidi controls and detached diacritics. Russian PDF text is Cyrillic but
adds page and line layout. Belarusian's linked PDF is **English** and is retained
only as evidence of the official link; it must never supply Belarusian text.
Each manifest records its specific selection and PDF extraction fingerprint.

Acquisition inspection checks numbered paragraphs 1, 123 and 245, the opening
heading, first and final notes, and distinctive native-language wording. These
witnesses reject errors and misdirected editions; they are not native-speaker
proofreading or complete semantic review. The structural checks below separately
account for the complete document and every note boundary.

Offline acquisition integrity checks (no network, PDF tool or external inputs):

```sh
python3 scripts/check-official-snapshots.py
python3 tests/official-snapshots.py
```

`python3 scripts/acquire-official-sources.py` is an explicit network operation
requiring Python 3 and Poppler. It follows the official language and PDF links,
refuses to overwrite an existing edition, and records comparison inputs for
review before freezing. It is not run during ordinary builds or verification.
Source copyright remains the Vatican notice above; no source-text license is
inferred from access or from the application's dependencies.

## Additional-edition structure and reproduction

Each additional edition has a reviewed `structure.json`, deterministic
`corpus.json`, `alignment.json` and `verification.json`. No frontend locale is
enabled by the existence of these source files.

```sh
npm run source:ingest:official  # Reconstruct outputs from frozen HTML/inventory
npm run source:check            # Check English and all nine editions offline
node --test tests/official-source.test.mjs
```

The normal checks need Node and Python, without network, Poppler, external PDF
files or third-party parsing packages. To independently repeat the saved PDF
comparison with Poppler **25.03.0**:

```sh
python3 scripts/ingest-official-sources.py --check --compare-pdf
```

That bounded comparison finds the opening and closing 100 characters of §§1,
123 and 245 in the PDF extraction for all seven Latin/Russian editions, ignoring
only whitespace and fi/fl print ligatures. Arabic matches none under that
limited normalization because its PDF layout extraction rearranges the script;
Belarusian matches none because its PDF is English. The fingerprints and exact
results are in `verification.json`. These witnesses do not establish full
HTML/PDF equality.

The HTML reader inventories every paragraph and text item inside both official
richtext containers, including abstract and contents material. All 5,351 blocks
have one role: numbered paragraph, heading, note, explicit continuation, front
matter, closing, separator or blank. Source links are preserved as metadata,
including defects. Unrecognized changes to counts, block boundaries, text hashes,
links, roles or numbering fail closed. Headings are reviewed source inputs,
not inferred from a translated word or a bold-text heuristic. No current edition
has a separate unnumbered body/note continuation, but Arabic and Cyrillic
fixtures exercise them along with line breaks and boundary damage.

Every edition independently has paragraphs 1–245 and note labels 1–224 in these
snapshots. `alignment.json` explicitly maps each to stable paragraph identities
and its English note correspondence; it does not substitute English text or
quotation coordinates. Local heading IDs belong to their own edition. They
include the opening introduction heading omitted from English's heading list:
Arabic/French have 82 heading blocks, Belarusian/Italian 81 and the others 80.
Some chapter titles occupy one local block where English uses two. Group
alignment records that difference without inventing a local line split.
`structure.sections` and paragraph `sectionIds` reference actual local headings,
including chapter openings, without synthetic translated opening labels.

Visible note labels determine local references and backlinks. Belarusian has
plain text markers and an extra `[84]` in §215, so note 84 links to §§64 and 215.
Arabic §66 has an empty duplicate `_ftnref71` anchor, which creates no visible
note reference. Polish note 33 has `_ft33`; note 219 wrongly repeats `_ftn210`
and its backlink. Preserve these official defects in `sourceLinks` and the
alignment audit; generated local identities remain `n033` and `n219`. Do not
guess official fragment URLs. Italian note 124's `[ 124]` marker is recognized
with its internal space retained in `sourceMarker`. Paragraph markers with no
following space (German §102, Spanish §23, Portuguese §§68/69/77/79) are valid.

Normalization decodes HTML entities, replaces `<br>` with whitespace, collapses
Unicode whitespace to U+0020 and trims block edges. Remove only the numbered
paragraph/note prefix and join explicitly inventoried continuations with one
space. Preserve spelling, punctuation, combining marks, diacritics, hyphens,
bidi characters and every substantive word. There is no NFC/NFKC normalization
or meaning repair. All quotation/reference offsets use **UTF-16 code units**
into final corpus `text`, with an exclusive end; never reuse English offsets.
The JavaScript contract tests check the actual `text.slice(start, end)` result.

Source prayers and other devotional text remain complete, including §§228 and
243–245. Devotional exclusions belong to later editorial adaptations. Date and
signature are separate `ancillary` closing records; separators, contents and
abstract are also retained there. The site's copyright footer remains in the
untouched HTML artifact and its attribution is recorded in the manifest.

For all nine editions, `verification.json` records §§1, 52, 99, 176, 197–200,
228 and 245 plus opening/closing witnesses and hashes for **every** note.
An independent HTML reader compares complete sampled bodies and all note bodies
against the corpus. Negative fixtures reject missing/duplicate paragraphs,
changed/missing headings, dangling notes, damaged note boundaries, Unicode
corruption and malformed markup. These are structural fidelity checks; they do
not claim native-speaker proofreading or semantic review of adaptations.

## Current multilingual release evidence

All ten source editions now have complete local adaptations and interfaces.
Their quotations remain exact spans from their own frozen corpus. The nine
localized alignment, semantic and interface records live under
`content/editorial/<locale>/`; their hashes identify the compared inputs, not
independent native-speaker approval. English retains its original Markdown
review documents and owner-PDF authority. Source reproduction remains offline.

Run `node scripts/audit-release.mjs dist` after the sequential release gates to
verify source snapshot hashes, current reading/review bindings, locale chunks,
font provenance and byte-identical notices in the actual static artifact.
It also verifies the owner's original PDF/text hashes when those workspace
files are present; a clean clone does not require those external originals.
The report is generated under `output/release/`. See
[multilingual release evidence](../../verification/MULTILINGUAL-RELEASE.md)
for the browser/visual scope and publication status.

Preserve the edition-specific witnesses, including Belarusian's English linked
PDF and extra §215 note-84 reference, Arabic's empty §66 anchor and source note
133's bibliographic classification, and Polish note-anchor defects. These are
not reasons to substitute another edition or silently repair official text.

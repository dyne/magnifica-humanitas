# Italian source alignment and authoring handoff

`alignment-review.json` is internal editorial evidence for L3.1, not a public
reading bundle. It is bound to the frozen Italian edition and its HTML hash.
All 245 complete Italian paragraphs were read. Notes relevant to the terminology,
protected qualifications and exclusions were compared in full; the 224-note
mapping records structural correspondence and hashes, not completed public note
commentary. L3.2 must separately review every authored reading block and note.
No native-speaker proofreading, reader study or independent historical,
scientific, clinical or legal verification is claimed.

The 27 concept identities and nine directed relation types keep the accepted
model. Display labels are editorial Italian; each has an exact local source
anchor and a terminology qualification. Relationship verbs are interpretations
of reasoning, not quotations or empirical associations. Italian site prose uses
**IA**; the official loanword **accountability** is explained by **rendere conto**
(§105), including reasons, scrutiny, contestability and remedy.

The coverage map accounts for 137 retain, 66 adapt and 42 optional-context
paragraphs. None is wholly devotional or omitted. Its internal English review
instructions preserve the accepted policy; they must not be rendered as Italian
public content. Their source hashes are Italian. This map is an authoring
constraint, not a substitute for the `coverage.json` and public prose to be
completed in L3.2.

Eighteen exclusions were individually located in the Italian text. Full paragraph
review contexts keep the surrounding argument visible. They are review bounds,
not instructions to concatenate the remaining fragments into a quotation.
Sixty-four protected local spans include additional explicit anchors for the
rights positions (§55), restricted/rapidly changing IA discussion (§§97–99),
strict legitimate defence (§192) and non-delegation of irreversible decisions
(§198). Source text and quote coordinates are never translated or repaired.

Review of the argument retained these paired constraints:

- §§48–89: four meanings of dignity; unconditional worth; contested rights
  positions attributed to the Church; property recognized and socially limited;
  subsidiarity with public support; solidarity as chosen responsibility;
  migrants' rights to safe movement and to remain; Church transparency,
  participation, victim listening, reparation and prevention.
- §§90–130: beneficial technical capabilities and attributed anthropological
  claims; design responsibility and community participation; diverse enhancement
  currents; a duty to relieve suffering alongside acceptance of finitude; grace
  as an optional theological premise rather than technical self-enhancement.
- §§131–181: truth and verification; journalism exposing Church abuse; educational
  time and public protection of children; emergency aid and relief from dangerous
  work; unequal transitions and participation without employment; justice within
  production; the attributed man–woman family definition; hidden labour,
  trafficking and data extraction; Church slaveholding, legitimation, delayed
  condemnation, request for pardon and present prevention. Notes 174–175 retain
  the named bulls, political/economic pressures and the 1866 qualification.
- §§182–228: hybrid conflict, propaganda, arms incentives and institutional
  weakness; strictly bounded last-resort defence; no delegation of lethal or
  irreversible decisions; the affirmative values/judgement sentence in §198;
  identifiable responsibility, judgement time, civilians and effective human
  control; unequal ordinary responsibilities, victims, realism, negotiation and
  institutional reform. Note 182 narrows defence and warns against preventive
  justifications. Excluding §228's blessing does not remove its ethical ideal of
  unarmed, disarming, humble, persevering peace or its practical commitment.
- §§229–245: Incarnation, Eucharist and Christian unity remain optional attributed
  premises with social consequences. Practical action, physical care, hidden
  workers, education, the victims named in §244 and everyday sharing in §245
  survive the liturgical exclusions. Nehemiah's and Frankl's reported prayers,
  Benedict's prayer/work history and the institutional request for pardon are
  not performed prayers for the reader.

The edition-difference records document local spacing anomalies in §§28 and 119,
Italian note 124's `[ 124]` marker and the absence of the English comparison-HTML
extra note marker at §82. Preserve them in source quotations. These observations
do not establish complete Italian/English or HTML/PDF semantic equality.

Focused evidence:

```sh
node --test tests/italian-alignment.test.mjs
node --test tests/official-source.test.mjs
npm run source:check
```

The alignment tests cover all identities, local UTF-16 spans and hashes,
intentional note correspondence, preservation boundaries and negative cases for
English offsets, spliced quotations, missing coverage/notes, stale hashes and
whole-paragraph omissions. Source reconstruction checks English and all nine
frozen official editions offline. These checks enforce review anchors; they do
not prove semantic fidelity of future public prose. Italian remains unavailable
until its complete reading and interface review pass.

## L3.2 public reading comparison

The Italian public reading now lives in `content/reading/it.json`, with its own
revision `it-2026-10-15-reading-1`. Local `coverage.json`, `concepts.json` and
`relations.json` supply the executable editorial contract. Unlike the L3.1
internal handoff, all display prose in those records is Italian. Source spans
are copied from the Italian corpus. The faith-premise and exclusion review
contexts deliberately use whole paragraphs as conservative boundaries; these
annotations never authorize slicing or recombining source fragments.

All 245 complete official Italian paragraphs and all 224 notes were read.
`semantic-review.json` binds each of 762 public explanatory blocks to its authored
hash, exact local source hashes, stable identity and content group. The record
also binds the four authored JSON artifacts and all 224 screened notes. These
hashes make later unreviewed changes detectable; they do not establish semantic
accuracy independently of the comparison described here.

### Source-ordered reading and contexts

There are 203 main entries and 42 labelled optional-context entries in source
order, plus an individual explanation for every paragraph. Historical and
Christian foundations remain reachable. Main prose is authored separately from
explicit theological context additions where necessary; no English explanation
or translated source quotation is used as filler. Each coverage rationale names
its own paragraph's substance. The internal L3.1 English instructions are not
public copy.

The comparison followed facts, agency, causation, polarity, certainty, scope and
exceptions through the complete source. In particular:

- §§1–16 retain both construction images as argumentative metaphors, the
  non-neutrality of designed systems, limited predictability and shared work.
  They separate performed invocations from the account of Nehemiah's prayer.
- §§17–45 retain the particular contribution of each historical stage, autonomy
  of civil realities and institutions, limits of technical competence and
  dialogue with sciences. They do not turn the source's account of development
  into an independent historical certification or a claim of seamless progress.
- §§46–89 preserve the four dignity meanings, inviolability, practical rights,
  the Church's positions on life and family, property and its social limits,
  public support in subsidiarity, solidarity as a choice and institutional
  self-examination. Victims and the different forms of abuse remain named.
- §§90–130 distinguish legitimate technical help from technocracy, capabilities
  from the author's anthropological claims, alignment from choosing values,
  appeal from participation and recognition of finitude from refusing care.
  All claims about experience and conscience are attributed. The discussion's
  limited scope and rapid obsolescence remain visible. Grace and Incarnation
  are not recast as self-enhancement. The source's generalizations about IA are
  not updated through outside evidence.
- §§131–181 preserve fact verification and relational trust, the three school
  challenges, protection of children as a shared responsibility, the goods of
  work beyond wages and dignity before employment. Emergency support, relief
  from dangerous tasks, locally different transitions and participation without
  occupation remain explicit. The family definition is attributed. GDP needs
  complementary metrics; credit retains a social function; redistribution
  does not excuse injustice within production. The Church's slaveholding,
  legitimation, delayed condemnation, pardon and present prevention stay in
  the main reader. Hidden work, mineral extraction, trafficking and data
  colonialism remain different linked arguments.
- §§182–228 preserve dual-use ambiguity, economic interests, memory and the
  cultural preparation of conflict, restricted legitimate defence, no delegation
  of lethal/irreversible decisions, the positive final sentence on values and
  prudent judgement in §198, responsibility chains, time and civilian
  protections. A nominal confirmation is insufficient for effective control.
  Negotiation and multilateral reform are possible practical routes, not
  guarantees. Neutral humanitarian care in §123 is distinct from the moral
  indifference criticized in §216. The ethical meaning of disarmed peace and
  the commitment to realize it survive the blessing exclusions in §228.
- §§229–245 retain social consequences of sacramental belonging, truthful
  assent, action rather than spiritual withdrawal, bodily presence, hidden
  labour and all the groups of sufferers in §244. §243 retains both unchanged
  oppression and the attributed meaning of God's siding with the lowly,
  without reciting the canticle. §245 keeps everyday sharing while removing
  the final Marian entrustment.

### Concept and relationship groups

All 27 concepts retain stable IDs and their 86 reasoning-block IDs. Definitions
and necessary distinctions are Italian and match the local editorial model.
Reasoning deliberately reuses selected, individually authored paragraph
explanations with their actual references; it does not substitute a repeated
generic statement for source-specific argument. Optional foundations have
separate attributed prose. Every concept quotation is one exact local span from
the L3.1 term map, with recalculated UTF-16 coordinates.

All 44 relationships preserve directed endpoints, type and placement. Each has
its own Italian explanation. Grounds, support, qualification, application and
test are normative/editorial readings, not empirical causes or measurements.
The four foundation relationships remain optional. No line or translated label
changes the identity or direction of a relationship.

### Trail and reflection groups

The six trails retain 32 stable steps and all reflection identities. Each has
its own introduction, guiding question, qualification, transitions, ending and
related destinations:

- `worth-not-reward`: four dignity meanings → rights → limits → care → work;
  the reflection retrieves distinctions without testing theological agreement.
- `ai-purpose`: infrastructure → goods → subsidiarity → governance →
  accountability → justice; the fictional hiring case distinguishes appeal
  from participation before objectives are set.
- `work-and-a-future`: work → care → distribution → exploitation → family;
  the fictional automation case distinguishes urgent income support from the
  other goods of work, without ranking unemployed people.
- `forming-judgment`: truth → power → freedom → education → institutional
  accountability; reflection distinguishes accuracy from selection,
  amplification and the conditions for informed judgement.
- `justice-in-structures`: shared goods → solidarity → justice → memory →
  institutional accountability; the fictional institution case distinguishes
  acknowledgement from repair and prevention.
- `peace-and-responsibility`: power → IA governance → accountability → memory
  → dialogue → peace; the fictional confirmation-button case explains effective
  control, judgement time, civilian protection and non-delegation.

All four scenarios are explicitly invented and carry no named event,
measurement or probability. Reflection is optional and unscored; endings offer
stopping and return, never claim mastery. Reading estimates were recalculated
from the actual Italian concept, relation and trail prose with the accepted
200-word-per-minute method. They are estimates, not measured reading times.

### Notes and preserved anomalies

All 224 notes were screened in full. Notes 132, 174, 175 and 182 contain argument
as well as citation; the others are bibliographic. The exact Italian bodies,
foreign-language publication titles, spacing and source markers remain source
text. Preceding-note links explicitly resolve abbreviated bibliographic context
rather than relying on an English UI regex. The spaced note 124 marker remains
`[ 124]`; the local note identity and backlinks remain `n124` and §101.
The bibliographic title in note 223 names a prayer vigil; it is not a performed
prayer and must remain available. Likewise, bibliographic references to blessings
are titles, not recitations of the excluded blessing text.

The accepted validator correction records `matchScope: source-location` only for
the reviewed incomplete fragment `preghiera e` in §241. It still rejects that
fragment in authored blocks citing §241 and notes linked to §241. The unrelated
note 223 title remains available. All other Italian exclusions retain the global
default, including complete invocations, blessings and responses; grammatical
`scope: clause` alone never makes an exclusion local. Exact source coordinates
and protected-span intersection checks are unchanged. This metadata correction
does not change source text, exclusion boundaries or public Italian prose.

The local source and English authored edition remain unchanged. Italian is still
unpublished while its interface and integrated review are pending. Automated
contracts and semantic comparison do not constitute native-speaker proofreading,
physical-device testing, learning-effectiveness evidence or independent factual
verification of source claims.

### L3.2 focused verification after dependency integration

Against accepted validator correction `a40916d`, on 15 October 2026:

```sh
node --test tests/editorial.test.mjs tests/reading-content.test.mjs tests/italian-alignment.test.mjs tests/italian-reading.test.mjs
node --input-type=module -e 'import {loadReadingInputs,validateReading,buildReadingIndex} from "./scripts/reading-content.mjs";const i=loadReadingInputs("it");const errors=validateReading(i);const x=buildReadingIndex(i);console.log(JSON.stringify({errors,paragraphs:x.paragraphs.length,notes:x.notes.length,editionId:x.editionId}));process.exitCode=errors.length?1:0'
npm run source:check
git diff --check
```

Results: 31 focused tests passed, zero failed/cancelled/skipped. The independent
Italian validation returned zero errors and built 245 contexts with 224 notes
for `mh-it-official-html-2026-10-14`. All ten frozen editions reconstructed
successfully; whitespace verification passed. The 762-block semantic evidence
and all four artifact hashes match current prose. The local note-title case
passes with only §241's reviewed incomplete fragment scoped by source location.
No browser or interface acceptance is claimed at this child boundary.

## L3.3 interface and integrated review

The complete 291-key Italian catalog and its current hash are recorded in
`interface-review.json`. It uses the reviewed relationship terminology, preserves
all placeholder occurrences and names the actual Italian edition. The integrated
production review passed 26 Italian journeys plus four English layout cases at
each hosting base. All nine required surfaces were captured at both viewports
and text sizes, with real Syne/Inter glyph evidence, keyboard/reduced-motion
checks, 18 clean automated accessibility scans and additional dark captures.
`verification/ITALIAN.md` gives the exact scope, reproduction commands, bounded
Impeccable review and limitations. The eight unfinished locales remain disabled.
Italian source-led editorial comparison is not native-speaker proofreading.

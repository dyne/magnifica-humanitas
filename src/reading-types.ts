export interface Prose { id?: string; kind: string; text: string; sourceRefs: string[] }
export interface Quotation { kind: string; text: string; paragraphId: string; start: number; end: number }
export interface Concept {
  id: string; title: string; definition: Prose; necessaryDistinction: Prose; reasoning: Prose[];
  foundation?: Prose; foundationRefs: string[]; sourceQuotation?: Quotation;
}
export interface Relation { id: string; from: string; to: string; type: string; explanation: Prose; placement: string }
export interface ReadingEstimate {
  kind: string; label: string; words: number; wordsPerMinute: number; minutes: number; method: string;
}
export interface Reflection {
  id: string; kind: string; optional: boolean; responseFormat: string;
  prompt: Prose; feedback: Prose; scenario?: Prose;
}
export interface Trail {
  id: string; title: string; question: string; introduction: Prose; qualification: Prose;
  steps: { id: string; conceptId: string; transition: Prose }[]; reflection: Reflection;
  ending: Prose; relatedTrailIds: string[]; optionalConceptIds: string[]; readingEstimate: ReadingEstimate;
}
export interface ContextParagraph {
  paragraphId: string; number: number; pages: number[]; footnoteIds: string[]; sourceSha256: string;
  explanation: Prose; disposition: string; placementExplanation: string; exclusionCount: number; quotations: Quotation[];
}
export interface ContextNote { id: string; number: number; text: string; pages: number[]; paragraphIds: string[]; kind: string; classification: string; previousNoteId?: string }
export interface ReadingContextIndex { editionId: string; paragraphs: ContextParagraph[]; notes: ContextNote[] }
export interface Caller { route: string; label: string; focusId: string; top: number }
export interface ReadingEntry {
  id: string; title: string; contextId: string; placement: string; conceptIds: string[];
  sourceRefs: string[]; explanation?: Prose; foundationContextId?: string; contextLinkLabel: string;
}

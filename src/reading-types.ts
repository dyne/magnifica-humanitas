export interface Prose { id?: string; kind: string; text: string; sourceRefs: string[] }
export interface Quotation { kind: string; text: string; paragraphId: string; start: number; end: number }
export interface Concept {
  id: string; title: string; definition: Prose; necessaryDistinction: Prose; reasoning: Prose[];
  foundation?: Prose; foundationRefs: string[]; sourceQuotation?: Quotation;
}
export interface Relation { id: string; from: string; to: string; type: string; explanation: Prose; placement: string }
export interface Trail { id: string; title: string; introduction: Prose; steps: { id: string; conceptId: string; transition: Prose }[]; ending: Prose }
export interface ContextParagraph {
  paragraphId: string; number: number; pages: number[]; footnoteIds: string[]; sourceSha256: string;
  explanation: Prose; disposition: string; placementExplanation: string; exclusionCount: number; quotations: Quotation[];
}
export interface ContextNote { id: string; number: number; text: string; pages: number[]; paragraphIds: string[]; kind: string }
export interface ReadingContextIndex { editionId: string; paragraphs: ContextParagraph[]; notes: ContextNote[] }
export interface Caller { route: string; label: string; focusId: string; top: number }

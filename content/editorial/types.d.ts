import type { ParagraphId } from '../source/types';
export type Disposition = 'retain' | 'adapt' | 'context' | 'omit-devotional';
export interface SourceQuotation {
  kind: 'quotation';
  paragraphId: ParagraphId;
  /** UTF-16 offsets in the frozen corpus text; end is exclusive. */
  start: number;
  end: number;
  text: string;
}
export interface EditorialText {
  kind: 'paraphrase' | 'editorial-interpretation' | 'editorial-instruction';
  text: string;
  sourceRefs: ParagraphId[];
}
export interface FaithPremise {
  kind: 'source-annotation';
  description: string;
  sourceSpan: SourceQuotation;
  placement: 'optional-foundations';
  sourceRefs: ParagraphId[];
}
export interface EditorialExclusion {
  id: string;
  sourceSpan: SourceQuotation;
  scope: 'clause' | 'sentence' | 'liturgical-formula' | 'ceremonial-address';
  /** Default global. Source-location requires review as an incomplete clause
   * fragment; grammatical clause scope alone does not authorize this setting. */
  matchScope?: 'global' | 'source-location';
  reason: string;
  preserve: EditorialText;
  /** Full sentences containing the exact excluded span; never publish by splicing. */
  sentenceContexts: SourceQuotation[];
}
export interface EditorialRecord {
  paragraphId: ParagraphId;
  sourceSha256: string;
  kind: 'editorial-decision';
  sourceRefs: ParagraphId[];
  disposition: Disposition;
  rationale: string;
  conceptIds: string[];
  authority: {
    author: 'Leo XIV'; document: 'Magnifica Humanitas'; documentDate: '2026-05-15';
    claimStatus: 'attributed-source-argument' | 'source-normative-position' | 'source-anthropological-claim' | 'source-institutional-self-criticism';
    scientificConsensusClaim: false;
  };
  necessaryQualifications: EditorialText[];
  faithPremises: FaithPremise[];
  exclusions: EditorialExclusion[];
  contextSpans: { sourceSpan: SourceQuotation; purpose: 'theological-premise'; placement: 'optional-foundations' }[];
  protectedSpans: { sourceSpan: SourceQuotation; reason: string }[];
  reviewStatus: 'pending-supervisor-review';
}
export interface ConceptDefinition {
  id: string;
  locale: 'en';
  title: string;
  definition: EditorialText;
  necessaryDistinction: EditorialText;
  foundationRefs: ParagraphId[];
  sourceQuotation?: SourceQuotation;
}
export type RelationType = 'grounds' | 'requires' | 'supports' | 'qualifies' | 'applies-to' | 'puts-in-tension' | 'provides-test-for' | 'provides-source-foundation-for' | 'has-source-foundation-in';
export interface ConceptRelation {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  directed: true;
  explanation: EditorialText;
  placement: 'main' | 'optional-foundations';
}

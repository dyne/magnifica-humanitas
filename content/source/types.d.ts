/** Original quotations only. Adapted/editorial prose must use its own model. */
export type ParagraphId = `p${string}`;
export type FootnoteId = `n${string}`;
export type ChapterId = 'introduction' | 'chapter-1' | 'chapter-2' | 'chapter-3' | 'chapter-4' | 'chapter-5' | 'conclusion';
export interface SourceParagraph {
  id: ParagraphId;
  number: number;
  chapterId: ChapterId;
  sectionIds: string[];
  /** Source wording after documented layout normalization; never an adaptation. */
  text: string;
  pages: number[];
  footnoteIds: FootnoteId[];
  sha256: string;
}
export interface SourceFootnote {
  id: FootnoteId;
  number: number;
  text: string;
  pages: number[];
  paragraphIds: ParagraphId[];
  sha256: string;
}
export interface SourceCorpus {
  editionId: string;
  paragraphs: SourceParagraph[];
  footnotes: SourceFootnote[];
}
export interface SourceSection {
  id: string;
  title: string;
  chapterId: ChapterId;
  start: number;
  end: number;
  /** Synthetic opening label; it is not a printed source heading. */
  editorialLabel?: true;
}

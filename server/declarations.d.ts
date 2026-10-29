declare module 'word-extractor' {
  class WordExtractor {
    extract(buffer: Buffer): Promise<{
      getBody(): string;
      getFootnotes(): string;
      getHeaders(): string;
      getAnnotations(): string;
    }>;
  }
  export default WordExtractor;
}

declare module 'pdf-parse' {
  export class PDFParse {
    constructor(options?: { data: Buffer | Uint8Array });
    load(): Promise<void>;
    getText(): Promise<{ text: string } | string>;
    destroy(): Promise<void>;
    getPageTables?(): Promise<any>;
  }
  const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}

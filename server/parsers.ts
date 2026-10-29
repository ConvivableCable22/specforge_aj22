import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import WordExtractor from 'word-extractor';

export interface ExtractedDocument {
  filename: string;
  extension: string;
  text: string;
  tables?: string[];
  pageCount?: number;
}

export async function extractDocumentText(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<ExtractedDocument> {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || '';

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error(`The uploaded file "${originalFilename}" is empty (0 bytes).`);
  }

  try {
    switch (ext) {
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value.trim();
        if (!text) {
          throw new Error(`No extractable text found in .docx file "${originalFilename}".`);
        }
        return {
          filename: originalFilename,
          extension: 'docx',
          text,
        };
      }

      case 'pdf': {
        // Handle pdf-parse v2 PDFParse class or default function
        const pdfModule = await import('pdf-parse');
        let text = '';
        let pageCount = 1;

        if (pdfModule.PDFParse) {
          const parser = new pdfModule.PDFParse({ data: fileBuffer });
          await parser.load();
          const raw = await parser.getText();
          if (typeof raw === 'string') {
            text = raw.trim();
          } else if (raw && typeof raw === 'object' && 'text' in raw) {
            text = (raw.text || '').trim();
          }
          await parser.destroy();
        } else if (typeof pdfModule.default === 'function') {
          const parsed = await pdfModule.default(fileBuffer);
          text = parsed.text ? parsed.text.trim() : '';
          pageCount = parsed.numpages || 1;
        }

        if (!text) {
          throw new Error(`No extractable text found in .pdf file "${originalFilename}".`);
        }

        return {
          filename: originalFilename,
          extension: 'pdf',
          text,
          pageCount,
        };
      }

      case 'html':
      case 'htm': {
        const rawHtml = fileBuffer.toString('utf-8');
        const $ = cheerio.load(rawHtml);

        // Remove script and style tags
        $('script, style, noscript').remove();

        // Extract tables specifically to preserve tabular context
        const tables: string[] = [];
        $('table').each((_, elem) => {
          const rows: string[] = [];
          $(elem).find('tr').each((_, tr) => {
            const cells: string[] = [];
            $(tr).find('th, td').each((_, cell) => {
              cells.push($(cell).text().trim().replace(/\s+/g, ' '));
            });
            if (cells.length > 0) {
              rows.push(cells.join(' | '));
            }
          });
          if (rows.length > 0) {
            tables.push(rows.join('\n'));
          }
        });

        const text = $('body').text().replace(/\s+/g, ' ').trim();
        if (!text) {
          throw new Error(`No extractable text found in HTML file "${originalFilename}".`);
        }

        return {
          filename: originalFilename,
          extension: ext,
          text: tables.length > 0 ? `${text}\n\n[Extracted Tables]:\n${tables.join('\n---\n')}` : text,
          tables,
        };
      }

      case 'doc': {
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(fileBuffer);
        const text = extracted.getBody() ? extracted.getBody().trim() : '';
        if (!text) {
          throw new Error(`No extractable text found in .doc file "${originalFilename}".`);
        }
        return {
          filename: originalFilename,
          extension: 'doc',
          text,
        };
      }

      default:
        throw new Error(
          `Unsupported file format ".${ext}" for file "${originalFilename}". Supported formats are: .docx, .pdf, .html, .doc.`
        );
    }
  } catch (err: any) {
    throw new Error(`Failed to extract text from "${originalFilename}": ${err.message || String(err)}`);
  }
}

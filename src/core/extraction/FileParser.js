/**
 * File Parser
 * 
 * Extracts text content from PDF, Excel, and Word documents
 */

const fs = require('fs').promises;
const path = require('path');

class FileParser {
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Parse uploaded file and extract text content
   * @param {string} filePath - Path to uploaded file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async parseFile(filePath, mimeType) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      this.logger.info('Parsing file', { filePath, mimeType, ext });

      let result;

      if (mimeType === 'application/pdf' || ext === '.pdf') {
        result = await this.parsePDF(filePath);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        ext === '.xlsx' || ext === '.xls'
      ) {
        result = await this.parseExcel(filePath);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword' ||
        ext === '.docx' || ext === '.doc'
      ) {
        result = await this.parseWord(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType || ext}`);
      }

      return {
        success: true,
        text: result.text,
        metadata: {
          ...result.metadata,
          filePath,
          mimeType,
          extension: ext
        }
      };

    } catch (error) {
      this.logger.error('File parsing failed', {
        filePath,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Parse PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<Object>} Extracted text
   */
  async parsePDF(filePath) {
    try {
      // Use pdf-parse library
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info || {},
          type: 'pdf'
        }
      };
    } catch (error) {
      // Fallback: Try pdfjs-dist if pdf-parse fails
      try {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const dataBuffer = await fs.readFile(filePath);
        const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }

        return {
          text: fullText,
          metadata: {
            pages: pdf.numPages,
            type: 'pdf'
          }
        };
      } catch (fallbackError) {
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Parse Excel file
   * @param {string} filePath - Path to Excel file
   * @returns {Promise<Object>} Extracted text
   */
  async parseExcel(filePath) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      
      let fullText = '';
      const sheets = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Convert sheet to text
        const sheetText = sheetData
          .map(row => Array.isArray(row) ? row.join(' | ') : String(row))
          .join('\n');
        
        fullText += `\n=== Sheet: ${sheetName} ===\n${sheetText}\n`;
        sheets.push({
          name: sheetName,
          rows: sheetData.length,
          columns: sheetData[0]?.length || 0
        });
      });

      return {
        text: fullText.trim(),
        metadata: {
          sheets: sheets,
          totalSheets: workbook.SheetNames.length,
          type: 'excel'
        }
      };
    } catch (error) {
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse Word document
   * @param {string} filePath - Path to Word file
   * @returns {Promise<Object>} Extracted text
   */
  async parseWord(filePath) {
    try {
      // Try mammoth for .docx files
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.docx') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        
        return {
          text: result.value,
          metadata: {
            messages: result.messages || [],
            type: 'word'
          }
        };
      } else if (ext === '.doc') {
        // For .doc files, try textract or docx-converter
        // Note: .doc parsing is more complex and may require additional libraries
        throw new Error('Legacy .doc format not fully supported. Please convert to .docx');
      } else {
        throw new Error(`Unsupported Word format: ${ext}`);
      }
    } catch (error) {
      // Fallback: Try docx-converter
      try {
        const docxConverter = require('docx-converter');
        const text = await docxConverter.convert(filePath, 'txt');
        
        return {
          text: text,
          metadata: {
            type: 'word'
          }
        };
      } catch (fallbackError) {
        throw new Error(`Word parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Clean extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Remove special characters that might interfere
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned;
  }
}

module.exports = FileParser;


/**
 * File Streaming Utilities
 * Provides streaming capabilities for large file processing
 */

const fs = require('fs');
const { Readable } = require('stream');

class FileStreamer {
  /**
   * Stream file in chunks to avoid loading entire file into memory
   * @param {string} filePath - Path to file
   * @param {Object} options - Streaming options
   * @returns {Readable} - Readable stream
   */
  static createReadStream(filePath, options = {}) {
    const {
      chunkSize = 64 * 1024, // 64KB default
      encoding = 'utf8',
      highWaterMark = 16 * 1024 // 16KB buffer
    } = options;

    return fs.createReadStream(filePath, {
      encoding,
      highWaterMark,
      flags: 'r'
    });
  }

  /**
   * Process file in chunks with callback
   * @param {string} filePath - Path to file
   * @param {Function} chunkProcessor - Function to process each chunk
   * @param {Object} options - Processing options
   * @returns {Promise} - Promise that resolves when processing is complete
   */
  static async processInChunks(filePath, chunkProcessor, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        chunkSize = 64 * 1024,
        encoding = 'utf8'
      } = options;

      const stream = this.createReadStream(filePath, { encoding, chunkSize });
      let totalProcessed = 0;
      let chunkCount = 0;

      stream.on('data', async (chunk) => {
        try {
          chunkCount++;
          totalProcessed += chunk.length;
          
          // Process chunk (can be async)
          const result = await chunkProcessor(chunk, {
            chunkNumber: chunkCount,
            totalProcessed,
            isLast: false
          });
          
          // If processor returns false, stop processing
          if (result === false) {
            stream.destroy();
            resolve({ processed: totalProcessed, chunks: chunkCount, stopped: true });
          }
        } catch (error) {
          stream.destroy();
          reject(error);
        }
      });

      stream.on('end', () => {
        resolve({
          processed: totalProcessed,
          chunks: chunkCount,
          stopped: false
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stream PDF text extraction (for large PDFs)
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {Function} textProcessor - Function to process extracted text chunks
   * @returns {Promise} - Promise that resolves with extracted text
   */
  static async streamPdfExtraction(pdfBuffer, textProcessor) {
    // For now, pdf-parse doesn't support streaming
    // This is a placeholder for future implementation
    // In production, you might use a streaming PDF parser
    
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    
    // Process text in chunks if it's large
    const text = data.text;
    const chunkSize = 10000; // 10KB chunks
    
    if (text.length > chunkSize) {
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize);
        await textProcessor(chunk, {
          chunkNumber: Math.floor(i / chunkSize) + 1,
          totalProcessed: Math.min(i + chunkSize, text.length),
          isLast: i + chunkSize >= text.length
        });
      }
    } else {
      await textProcessor(text, {
        chunkNumber: 1,
        totalProcessed: text.length,
        isLast: true
      });
    }
    
    return {
      text,
      pages: data.numpages,
      info: data.info
    };
  }

  /**
   * Stream Excel file processing (for large Excel files)
   * @param {string} filePath - Path to Excel file
   * @param {Function} rowProcessor - Function to process each row
   * @returns {Promise} - Promise that resolves when processing is complete
   */
  static async streamExcelProcessing(filePath, rowProcessor) {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    const results = {
      sheets: [],
      totalRows: 0,
      totalCells: 0
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      const sheetResult = {
        name: sheetName,
        rows: 0,
        processed: 0
      };

      // Process rows in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          await rowProcessor(row, {
            sheet: sheetName,
            rowNumber: i + batch.indexOf(row) + 1,
            totalRows: rows.length,
            isLastRow: i + batch.indexOf(row) === rows.length - 1
          });
          sheetResult.processed++;
        }
        
        // Allow event loop to process other tasks
        if (i % (batchSize * 10) === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      sheetResult.rows = rows.length;
      results.totalRows += rows.length;
      results.sheets.push(sheetResult);
    }

    return results;
  }

  /**
   * Get file size without loading into memory
   * @param {string} filePath - Path to file
   * @returns {number} - File size in bytes
   */
  static getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * Check if file should be streamed based on size
   * @param {string} filePath - Path to file
   * @param {number} threshold - Size threshold in bytes (default: 10MB)
   * @returns {boolean} - True if file should be streamed
   */
  static shouldStream(filePath, threshold = 10 * 1024 * 1024) {
    const size = this.getFileSize(filePath);
    return size > threshold;
  }
}

module.exports = FileStreamer;


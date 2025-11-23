/**
 * Word Exporter
 * 
 * Exports project scope data to Word format (.docx)
 * Similar structure to PDF but editable
 */

const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs').promises;
const path = require('path');

class WordExporter {
  constructor(logger = null) {
    this.logger = logger || console;
    this.outputDir = path.join(process.cwd(), 'generated');
  }

  /**
   * Export scope data to Word
   * @param {Object} data - Project data
   * @param {string} type - Document type: 'cost', 'business', 'technical'
   * @param {string} level - Level: 'L1', 'L2', 'L3', 'L4', 'L5'
   * @returns {Promise<Object>} Export result with file path
   */
  async exportScope(data, type, level) {
    try {
      const doc = new Document({
        sections: [
          {
            children: [
              // Title
              new Paragraph({
                text: `${this.getDocumentTitle(type)} - ${level}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              
              // Project name
              new Paragraph({
                children: [
                  new TextRun({
                    text: data.projectName || 'Project',
                    size: 32,
                    color: '667eea',
                    bold: true
                  })
                ],
                spacing: { after: 400 }
              }),
              
              // Summary section
              ...this.addSummarySection(data),
              
              // Features section
              ...this.addFeaturesSection(data, level),
              
              // Cost breakdown
              ...this.addCostBreakdown(data),
              
              // AMC (if included)
              ...(data.amcPackages ? this.addAMCSection(data.amcPackages) : [])
            ]
          }
        ]
      });
      
      // Save to file
      await fs.mkdir(this.outputDir, { recursive: true });
      const fileName = `${type}_${level}_${Date.now()}.docx`;
      const filePath = path.join(this.outputDir, fileName);
      
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filePath, buffer);
      
      this.logger.info('Word export completed', { filePath });
      
      const fileSize = (await fs.stat(filePath)).size;
      
      return {
        fileName,
        filePath,
        url: `/downloads/${fileName}`,
        size: fileSize,
        format: 'docx'
      };
      
    } catch (error) {
      this.logger.error('Word export failed', {
        type,
        level,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get document title
   */
  getDocumentTitle(type) {
    const titles = {
      'cost': 'Cost Proposal',
      'business': 'Business Document',
      'technical': 'Technical Blueprint'
    };
    return titles[type] || 'Document';
  }

  /**
   * Add summary section
   */
  addSummarySection(data) {
    return [
      new Paragraph({
        text: 'Executive Summary',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Total Cost')] }),
              new TableCell({ children: [new Paragraph(`₹${(data.cost?.totalCost || 0).toLocaleString('en-IN')}`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Timeline')] }),
              new TableCell({ children: [new Paragraph(`${data.technical?.timeline?.recommendedDays || 0} days`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Team Size')] }),
              new TableCell({ children: [new Paragraph(`${data.technical?.teamSize || 0} developers`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Total Features')] }),
              new TableCell({ children: [new Paragraph(String(data.scope?.modules?.length || 0))] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Total Hours')] }),
              new TableCell({ children: [new Paragraph(String(data.technical?.totalHours || 0))] })
            ]
          })
        ]
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    ];
  }

  /**
   * Add features section
   */
  addFeaturesSection(data, level) {
    const sections = [
      new Paragraph({
        text: 'Features & Modules',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      })
    ];

    const modules = data.scope?.modules || [];
    modules.forEach((module, index) => {
      const moduleName = module.name || module.moduleName || module;
      sections.push(
        new Paragraph({
          text: `${index + 1}. ${moduleName}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 100, after: 50 }
        })
      );
      
      if (module.description) {
        sections.push(
          new Paragraph({
            text: module.description,
            spacing: { after: 50 }
          })
        );
      }
      
      const details = [];
      if (module.hours) details.push(`${module.hours} hours`);
      if (module.complexity) details.push(`Complexity: ${module.complexity}/5`);
      if (module.category) details.push(`Category: ${module.category}`);
      
      if (details.length > 0) {
        sections.push(
          new Paragraph({
            text: details.join(' • '),
            spacing: { after: 100 }
          })
        );
      }
    });

    return sections;
  }

  /**
   * Add cost breakdown section
   */
  addCostBreakdown(data) {
    const totalCost = data.cost?.totalCost || 0;
    const development = Math.round(totalCost * 0.7);
    const testing = Math.round(totalCost * 0.15);
    const projectMgmt = Math.round(totalCost * 0.1);
    const gst = Math.round(totalCost * 0.18);

    return [
      new Paragraph({
        text: 'Cost Breakdown',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Development')] }),
              new TableCell({ children: [new Paragraph(`₹${development.toLocaleString('en-IN')}`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Testing')] }),
              new TableCell({ children: [new Paragraph(`₹${testing.toLocaleString('en-IN')}`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Project Management')] }),
              new TableCell({ children: [new Paragraph(`₹${projectMgmt.toLocaleString('en-IN')}`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('GST (18%)')] }),
              new TableCell({ children: [new Paragraph(`₹${gst.toLocaleString('en-IN')}`)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ text: 'Total Cost', bold: true })]
              }),
              new TableCell({ 
                children: [new Paragraph({ text: `₹${totalCost.toLocaleString('en-IN')}`, bold: true })]
              })
            ]
          })
        ]
      })
    ];
  }

  /**
   * Add AMC section
   */
  addAMCSection(amcPackages) {
    const sections = [
      new Paragraph({
        text: 'Annual Maintenance & Support (AMC)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      })
    ];

    if (Array.isArray(amcPackages)) {
      amcPackages.forEach((pkg, index) => {
        sections.push(
          new Paragraph({
            text: `${index + 1}. ${pkg.name || 'AMC Package'}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 50 }
          })
        );
        
        sections.push(
          new Paragraph({
            text: `Annual Cost: ₹${(pkg.annualCost || 0).toLocaleString('en-IN')}`,
            spacing: { after: 50 }
          })
        );
        
        if (pkg.features && pkg.features.length > 0) {
          sections.push(
            new Paragraph({
              text: `Features: ${pkg.features.join(', ')}`,
              spacing: { after: 100 }
            })
          );
        }
      });
    }

    return sections;
  }
}

module.exports = WordExporter;


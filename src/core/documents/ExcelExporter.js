/**
 * Excel Exporter
 * 
 * Exports project scope data to Excel format (.xlsx)
 * Creates multiple sheets: Summary, Features & Costs, Timeline, Team Composition, AMC Packages
 */

const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');

class ExcelExporter {
  constructor(logger = null) {
    this.logger = logger || console;
    this.outputDir = path.join(process.cwd(), 'generated');
  }

  /**
   * Export scope data to Excel
   * @param {Object} data - Project data
   * @param {string} type - Document type: 'cost', 'business', 'technical'
   * @param {string} level - Level: 'L1', 'L2', 'L3', 'L4', 'L5'
   * @returns {Promise<Object>} Export result with file path
   */
  async exportScope(data, type, level) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      this.addSummarySheet(summarySheet, data);
      
      // Sheet 2: Features & Costs
      const featuresSheet = workbook.addWorksheet('Features & Costs');
      this.addFeaturesSheet(featuresSheet, data);
      
      // Sheet 3: Timeline (if level >= L3)
      if (this.isLevel3OrAbove(level)) {
        const timelineSheet = workbook.addWorksheet('Timeline');
        this.addTimelineSheet(timelineSheet, data);
      }
      
      // Sheet 4: Team Composition
      const teamSheet = workbook.addWorksheet('Team Composition');
      this.addTeamSheet(teamSheet, data);
      
      // Sheet 5: AMC Packages (if included)
      if (data.amcPackages) {
        const amcSheet = workbook.addWorksheet('AMC Packages');
        this.addAMCSheet(amcSheet, data.amcPackages);
      }
      
      // Save to file
      await fs.mkdir(this.outputDir, { recursive: true });
      const fileName = `${type}_${level}_${Date.now()}.xlsx`;
      const filePath = path.join(this.outputDir, fileName);
      
      await workbook.xlsx.writeFile(filePath);
      
      this.logger.info('Excel export completed', { filePath });
      
      const fileSize = (await fs.stat(filePath)).size;
      
      return {
        fileName,
        filePath,
        url: `/downloads/${fileName}`,
        size: fileSize,
        format: 'xlsx'
      };
      
    } catch (error) {
      this.logger.error('Excel export failed', {
        type,
        level,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check if level is L3 or above
   */
  isLevel3OrAbove(level) {
    return ['L3', 'L4', 'L5'].includes(level);
  }

  /**
   * Add summary sheet
   */
  addSummarySheet(sheet, data) {
    // Styling
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 30;
    
    // Header
    sheet.mergeCells('A1:B1');
    const headerCell = sheet.getCell('A1');
    headerCell.value = 'Project Summary';
    headerCell.font = { size: 16, bold: true };
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF667eea' }
    };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.font.color = { argb: 'FFFFFFFF' };
    
    // Data rows
    const summary = [
      ['Project Name', data.projectName || 'Project'],
      ['Total Cost', `₹${(data.cost?.totalCost || 0).toLocaleString('en-IN')}`],
      ['Timeline', `${data.technical?.timeline?.recommendedDays || 0} days`],
      ['Team Size', `${data.technical?.teamSize || 0} developers`],
      ['Total Features', data.scope?.modules?.length || 0],
      ['Total Hours', data.technical?.totalHours || 0]
    ];
    
    summary.forEach((row, idx) => {
      const rowNum = idx + 3;
      const labelCell = sheet.getCell(`A${rowNum}`);
      const valueCell = sheet.getCell(`B${rowNum}`);
      
      labelCell.value = row[0];
      labelCell.font = { bold: true };
      
      valueCell.value = row[1];
    });
  }

  /**
   * Add features and costs sheet
   */
  addFeaturesSheet(sheet, data) {
    // Headers
    sheet.columns = [
      { header: 'Feature Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Complexity', key: 'complexity', width: 12 },
      { header: 'Cost (₹)', key: 'cost', width: 15 }
    ];
    
    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add features
    const modules = data.scope?.modules || [];
    modules.forEach(feature => {
      const cost = this.calculateFeatureCost(feature);
      sheet.addRow({
        name: feature.name || feature.moduleName || feature,
        category: feature.category || 'N/A',
        description: feature.description || '',
        hours: feature.hours || 0,
        complexity: feature.complexity || 'N/A',
        cost: cost
      });
    });
    
    // Total row
    const totalRow = sheet.addRow({
      name: 'TOTAL',
      hours: data.technical?.totalHours || 0,
      cost: data.cost?.totalCost || 0
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' }
    };
  }

  /**
   * Add timeline sheet
   */
  addTimelineSheet(sheet, data) {
    sheet.columns = [
      { header: 'Phase', key: 'phase', width: 20 },
      { header: 'Duration (Days)', key: 'duration', width: 15 },
      { header: 'Start Date', key: 'start', width: 15 },
      { header: 'End Date', key: 'end', width: 15 },
      { header: 'Description', key: 'description', width: 40 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // Add timeline phases (if available)
    const timeline = data.technical?.timeline;
    if (timeline && timeline.phases) {
      timeline.phases.forEach(phase => {
        sheet.addRow({
          phase: phase.name || 'Phase',
          duration: phase.duration || 0,
          start: phase.startDate || 'TBD',
          end: phase.endDate || 'TBD',
          description: phase.description || ''
        });
      });
    } else {
      // Fallback: single phase
      sheet.addRow({
        phase: 'Development',
        duration: timeline?.recommendedDays || 0,
        start: 'TBD',
        end: 'TBD',
        description: 'Complete project development'
      });
    }
  }

  /**
   * Add team composition sheet
   */
  addTeamSheet(sheet, data) {
    sheet.columns = [
      { header: 'Role', key: 'role', width: 25 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Hourly Rate (₹)', key: 'rate', width: 15 },
      { header: 'Total Cost (₹)', key: 'total', width: 15 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // Add team members (simplified)
    const team = data.technical?.team || {};
    const roles = [
      { role: 'Backend Developer', count: team.backend || 0, rate: 2000 },
      { role: 'Frontend Developer', count: team.frontend || 0, rate: 1800 },
      { role: 'QA Engineer', count: team.qa || 0, rate: 1500 },
      { role: 'Project Manager', count: team.pm || 0, rate: 2500 }
    ];
    
    roles.forEach(role => {
      if (role.count > 0) {
        const totalHours = (data.technical?.totalHours || 0) / role.count;
        sheet.addRow({
          role: role.role,
          count: role.count,
          rate: role.rate,
          total: Math.round(totalHours * role.rate)
        });
      }
    });
  }

  /**
   * Add AMC packages sheet
   */
  addAMCSheet(sheet, amcPackages) {
    sheet.columns = [
      { header: 'Package Name', key: 'name', width: 25 },
      { header: 'Annual Cost (₹)', key: 'cost', width: 20 },
      { header: 'Features', key: 'features', width: 50 },
      { header: 'Support Hours', key: 'hours', width: 15 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // Add AMC packages
    if (Array.isArray(amcPackages)) {
      amcPackages.forEach(pkg => {
        sheet.addRow({
          name: pkg.name || 'AMC Package',
          cost: pkg.annualCost || 0,
          features: (pkg.features || []).join(', '),
          hours: pkg.supportHours || 0
        });
      });
    }
  }

  /**
   * Calculate feature cost
   */
  calculateFeatureCost(feature) {
    const hours = feature.hours || 0;
    const complexity = feature.complexity || 2;
    const baseRate = 2000;
    return Math.round(hours * baseRate * (complexity / 2) * 1.2);
  }
}

module.exports = ExcelExporter;


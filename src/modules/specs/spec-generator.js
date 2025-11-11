const SQLGenerator = require('./sql-generator');
const APIGenerator = require('./api-generator');
const FileWriter = require('./file-writer');

class SpecGenerator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.sqlGen = new SQLGenerator(library, logger);
    this.apiGen = new APIGenerator(library, logger);
    this.fileWriter = new FileWriter(null, logger);
  }

  async generate(plan, modules, domainContext, level = 'standard') {
    try {
      this.logger.info('Starting spec generation', { level, moduleCount: modules.length });

      // Generate SQL schema
      const sqlSchema = this.sqlGen.generateSchema(modules, domainContext);
      const migrations = this.sqlGen.generateMigrations(sqlSchema);

      // Generate API specs
      const openAPISpec = this.apiGen.generateOpenAPI(modules, domainContext);
      const apiYAML = this.apiGen.generateYAML(openAPISpec);
      const apiMarkdown = this.apiGen.generateMarkdown(openAPISpec);

      // Extract pseudocode from plan
      const pseudocode = this.extractPseudocode(plan, level);

      // Prepare specs object
      const specs = {
        sql: {
          schema: sqlSchema,
          migrations: migrations
        },
        api: {
          openapi: openAPISpec,
          yaml: apiYAML,
          markdown: apiMarkdown
        },
        pseudocode: pseudocode
      };

      // Generate project name
      const projectName = this.generateProjectName(domainContext);

      // Write all files
      const writeResult = this.fileWriter.writeSpecs(projectName, specs);

      this.logger.info('Spec generation complete', { 
        outputDir: writeResult.projectDir,
        filesWritten: writeResult.filesWritten.length
      });

      return {
        specs: specs,
        outputDir: writeResult.projectDir,
        filesWritten: writeResult.filesWritten
      };

    } catch (error) {
      this.logger.error('Spec generation failed', { error: error.message, stack: error.stack });
      // Return null instead of throwing - let chain continue
      return null;
    }
  }

  extractPseudocode(plan, level) {
    const pseudocode = {};

    if (!plan || !plan.plan || !plan.plan.modules) {
      return pseudocode;
    }

    for (const module of plan.plan.modules) {
      if (module.pseudocode) {
        let code = '';
        
        if (level === 'jugaad') {
          // Minimal: just high-level
          code = module.pseudocode.high_level || '';
        } else if (level === 'standard') {
          // Standard: high-level + partial detailed
          code = module.pseudocode.high_level || '';
          if (module.pseudocode.detailed) {
            code += '\n\n// Detailed implementation:\n';
            code += module.pseudocode.detailed.split('\n').slice(0, 20).join('\n');
            if (module.pseudocode.detailed.split('\n').length > 20) {
              code += '\n  // ... (truncated)';
            }
          }
        } else {
          // Enterprise: full detailed pseudocode
          code = module.pseudocode.high_level || '';
          if (module.pseudocode.detailed) {
            code += '\n\n' + module.pseudocode.detailed;
          }
        }

        if (code) {
          pseudocode[module.name] = code;
        }
      }
    }

    return pseudocode;
  }

  generateProjectName(domainContext) {
    const useCase = (domainContext.useCase || 'application').toLowerCase().replace(/\s+/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${useCase}-${timestamp}`;
  }
}

module.exports = SpecGenerator;

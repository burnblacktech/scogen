const fs = require('fs');
const path = require('path');
const os = require('os');

class FileWriter {
  constructor(baseDir, logger) {
    this.baseDir = baseDir || path.join(os.homedir(), 'Desktop', 'project-specs');
    this.logger = logger;
  }

  createStructure(projectName) {
    const projectDir = path.join(this.baseDir, projectName);

    // Create directory structure
    const dirs = [
      '01-assessment',
      '02-architecture',
      '03-database',
      '03-database/migrations',
      '04-api',
      '05-business-logic',
      '06-frontend',
      '07-edge-cases',
      '08-testing',
      '09-deployment',
      '10-cursor-prompts'
    ];

    try {
      // Create base directory
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      // Create project directory
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Create subdirectories
      dirs.forEach(dir => {
        const fullPath = path.join(projectDir, dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      });

      this.logger?.info('Directory structure created', { projectDir });
      return projectDir;
    } catch (error) {
      this.logger?.error('Failed to create directory structure', { error: error.message });
      throw error;
    }
  }

  writeFile(projectDir, relativePath, content) {
    try {
      const fullPath = path.join(projectDir, relativePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      this.logger?.debug('File written', { path: relativePath });
      return fullPath;
    } catch (error) {
      this.logger?.error('Failed to write file', { path: relativePath, error: error.message });
      throw error;
    }
  }

  writeSpecs(projectName, specs) {
    const projectDir = this.createStructure(projectName);

    const writtenFiles = [];

    try {
      // Write SQL schema
      if (specs.sql && specs.sql.schema) {
        const sqlPath = this.writeFile(projectDir, '03-database/schema.sql', specs.sql.schema);
        writtenFiles.push(sqlPath);
      }

      // Write migrations
      if (specs.sql && specs.sql.migrations) {
        const migrations = specs.sql.migrations;
        for (const [name, migration] of Object.entries(migrations)) {
          // Write UP migration
          if (migration.up && migration.up.length > 0) {
            const upContent = migration.up.join('\n');
            const upPath = this.writeFile(
              projectDir,
              `03-database/migrations/${name}_up.sql`,
              upContent
            );
            writtenFiles.push(upPath);
          }

          // Write DOWN migration
          if (migration.down && migration.down.length > 0) {
            const downContent = migration.down.join('\n');
            const downPath = this.writeFile(
              projectDir,
              `03-database/migrations/${name}_down.sql`,
              downContent
            );
            writtenFiles.push(downPath);
          }
        }
      }

      // Write API YAML
      if (specs.api && specs.api.yaml) {
        const yamlPath = this.writeFile(projectDir, '04-api/endpoints.yaml', specs.api.yaml);
        writtenFiles.push(yamlPath);
      }

      // Write API Markdown
      if (specs.api && specs.api.markdown) {
        const mdPath = this.writeFile(projectDir, '04-api/README.md', specs.api.markdown);
        writtenFiles.push(mdPath);
      }

      // Write pseudocode files
      if (specs.pseudocode) {
        for (const [moduleName, code] of Object.entries(specs.pseudocode)) {
          const codePath = this.writeFile(
            projectDir,
            `05-business-logic/${moduleName.toLowerCase()}.js`,
            code
          );
          writtenFiles.push(codePath);
        }
      }

      // Write OpenAPI JSON (optional, for reference)
      if (specs.api && specs.api.openapi) {
        const jsonPath = this.writeFile(
          projectDir,
          '04-api/openapi.json',
          JSON.stringify(specs.api.openapi, null, 2)
        );
        writtenFiles.push(jsonPath);
      }

      this.logger?.info('Specs written successfully', { 
        projectDir, 
        filesWritten: writtenFiles.length 
      });

      return {
        projectDir,
        filesWritten: writtenFiles
      };
    } catch (error) {
      this.logger?.error('Failed to write specs', { error: error.message });
      throw error;
    }
  }
}

module.exports = FileWriter;

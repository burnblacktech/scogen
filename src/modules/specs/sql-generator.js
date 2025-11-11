const path = require('path');
const fs = require('fs');

class SQLGenerator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    try {
      const templatePath = path.join(__dirname, '../../../templates/specs/sql-templates.json');
      const data = fs.readFileSync(templatePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to load SQL templates', { error: error.message });
      return {};
    }
  }

  generateSchema(modules, domainContext) {
    const domain = domainContext.industry || 'generic';
    const allTables = [];
    const dedupedTables = new Map();

    // Collect tables from all modules
    for (const module of modules) {
      const moduleName = module.name || module.displayName;
      const template = this.templates[domain]?.[moduleName] || 
                       this.templates.generic?.[moduleName];

      if (template && template.tables) {
        for (const table of template.tables) {
          if (!dedupedTables.has(table.name)) {
            dedupedTables.set(table.name, table);
          }
        }
      }
    }

    // Generate SQL
    let sql = "-- Database Schema\n";
    sql += `-- Generated for: ${domainContext.useCase || 'Application'}\n`;
    sql += `-- Domain: ${domain}\n`;
    sql += `-- Date: ${new Date().toISOString()}\n\n`;

    // CREATE TABLE statements
    for (const [tableName, table] of dedupedTables) {
      sql += this.generateCreateTable(table);
      sql += '\n';
    }

    // CREATE INDEX statements
    for (const [tableName, table] of dedupedTables) {
      if (table.indexes && table.indexes.length > 0) {
        sql += this.generateIndexes(table);
        sql += '\n';
      }
    }

    return sql;
  }

  generateCreateTable(table) {
    let sql = `CREATE TABLE ${table.name} (\n`;

    const fieldDefs = [];

    for (const field of table.fields) {
      let def = `  ${field.name} ${field.type}`;

      if (field.primary) def += ' PRIMARY KEY';
      if (field.required) def += ' NOT NULL';
      if (field.unique) def += ' UNIQUE';
      if (field.default) def += ` DEFAULT ${field.default}`;

      fieldDefs.push(def);
    }

    // Foreign keys
    for (const field of table.fields) {
      if (field.foreign_key) {
        const [refTable, refField] = field.foreign_key.split('.');
        fieldDefs.push(
          `  FOREIGN KEY (${field.name}) REFERENCES ${refTable}(${refField}) ON DELETE CASCADE`
        );
      }
    }

    sql += fieldDefs.join(',\n');
    sql += '\n);\n';

    return sql;
  }

  generateIndexes(table) {
    let sql = '';

    for (const indexField of table.indexes) {
      sql += `CREATE INDEX idx_${table.name}_${indexField} ON ${table.name}(${indexField});\n`;
    }

    return sql;
  }

  generateMigrations(schema) {
    // Split schema into versioned migrations
    const lines = schema.split('\n');
    const migrations = {
      '001_initial': { up: [], down: [] },
      '002_indexes': { up: [], down: [] }
    };

    let currentSection = 'tables';

    for (const line of lines) {
      if (line.trim().startsWith('CREATE TABLE')) {
        currentSection = 'tables';
        migrations['001_initial'].up.push(line);
      } else if (line.trim().startsWith('CREATE INDEX')) {
        currentSection = 'indexes';
        migrations['002_indexes'].up.push(line);
      } else if (currentSection === 'tables' && line.trim()) {
        migrations['001_initial'].up.push(line);
      } else if (currentSection === 'indexes' && line.trim()) {
        migrations['002_indexes'].up.push(line);
      }
    }

    // Generate DOWN migrations (DROP statements)
    const tableNames = [];
    for (const line of migrations['001_initial'].up) {
      const match = line.match(/CREATE TABLE (\w+)/);
      if (match) tableNames.push(match[1]);
    }

    migrations['001_initial'].down = tableNames.reverse().map(
      name => `DROP TABLE IF EXISTS ${name} CASCADE;`
    );

    const indexNames = [];
    for (const line of migrations['002_indexes'].up) {
      const match = line.match(/CREATE INDEX (\w+)/);
      if (match) indexNames.push(match[1]);
    }

    migrations['002_indexes'].down = indexNames.map(
      name => `DROP INDEX IF EXISTS ${name};`
    );

    return migrations;
  }
}

module.exports = SQLGenerator;

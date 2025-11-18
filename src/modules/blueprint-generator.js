/**
 * Blueprint Generator
 * 
 * Generates technical blueprints including:
 * - Folder structure
 * - Database schema SQL
 * - API endpoint specifications
 * - Pseudocode for components
 * - Deployment configuration
 */

class BlueprintGenerator {
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Generate complete blueprint for a project
   * @param {Object} project - Project data with technical breakdown
   * @param {string} depth - Depth level: 'executive', 'detailed', 'comprehensive'
   * @returns {Object} Blueprint object
   */
  generateBlueprint(project, depth = 'detailed') {
    try {
      const blueprint = {
        folderStructure: this.generateFolderStructure(project),
        databaseSchema: this.generateDatabaseSQL(project),
        apiEndpoints: this.generateAPISpec(project),
        pseudocode: this.generatePseudocode(project),
        deploymentConfig: this.generateDeploymentConfig(project)
      };

      if (depth === 'comprehensive') {
        blueprint.codeStructure = this.generateCodeStructure(project);
        blueprint.testingStrategy = this.generateTestingStrategy(project);
        blueprint.ciCdConfig = this.generateCiCdConfig(project);
      }

      return blueprint;
    } catch (error) {
      this.logger.error('Blueprint generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate folder structure
   * @param {Object} project - Project data
   * @returns {string} Folder structure as text
   */
  generateFolderStructure(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    
    if (!technicalBreakdown || !technicalBreakdown.technicalBreakdowns) {
      return this.getDefaultFolderStructure();
    }

    const structure = {
      'src/': {
        'models/': [],
        'services/': [],
        'controllers/': [],
        'routes/': [],
        'middleware/': [],
        'utils/': []
      },
      'frontend/': {
        'components/': [],
        'pages/': [],
        'hooks/': [],
        'utils/': [],
        'styles/': []
      },
      'tests/': {
        'unit/': [],
        'integration/': [],
        'e2e/': []
      },
      'config/': [],
      'docs/': [],
      'scripts/': []
    };

    // Extract components from technical breakdown
    technicalBreakdown.technicalBreakdowns.forEach(breakdown => {
      if (breakdown.technicalComponents) {
        breakdown.technicalComponents.forEach(component => {
          if (component.files) {
            component.files.forEach(file => {
              const parts = file.split('/');
              const fileName = parts[parts.length - 1];
              
              if (file.includes('models/')) {
                structure['src/']['models/'].push(fileName);
              } else if (file.includes('services/')) {
                structure['src/']['services/'].push(fileName);
              } else if (file.includes('controllers/')) {
                structure['src/']['controllers/'].push(fileName);
              } else if (file.includes('routes/')) {
                structure['src/']['routes/'].push(fileName);
              } else if (file.includes('components/')) {
                structure['frontend/']['components/'].push(fileName);
              } else if (file.includes('pages/')) {
                structure['frontend/']['pages/'].push(fileName);
              }
            });
          }
        });
      }
    });

    // Format as tree structure
    return this.formatFolderTree(structure);
  }

  /**
   * Get default folder structure
   * @returns {string} Default structure
   */
  getDefaultFolderStructure() {
    return `project-root/
├── src/
│   ├── models/
│   ├── services/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── utils/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── config/
├── docs/
└── scripts/`;
  }

  /**
   * Format folder structure as tree
   * @param {Object} structure - Structure object
   * @param {number} indent - Indentation level
   * @returns {string} Formatted tree
   */
  formatFolderTree(structure, indent = 0) {
    let output = '';
    const prefix = '  '.repeat(indent);
    const isLast = indent === 0;

    Object.entries(structure).forEach(([name, content], index, arr) => {
      const isLastItem = index === arr.length - 1;
      const connector = isLastItem ? '└── ' : '├── ';
      
      if (typeof content === 'object' && !Array.isArray(content)) {
        output += `${prefix}${connector}${name}\n`;
        output += this.formatFolderTree(content, indent + 1);
      } else if (Array.isArray(content)) {
        output += `${prefix}${connector}${name}\n`;
        if (content.length > 0) {
          content.slice(0, 10).forEach((item, i) => {
            const itemConnector = (i === content.slice(0, 10).length - 1 && content.length <= 10) ? '└── ' : '├── ';
            output += `${prefix}  ${itemConnector}${item}\n`;
          });
          if (content.length > 10) {
            output += `${prefix}  └── ... and ${content.length - 10} more files\n`;
          }
        }
      } else {
        output += `${prefix}${connector}${name}\n`;
      }
    });

    return output;
  }

  /**
   * Generate database schema SQL
   * @param {Object} project - Project data
   * @returns {string} SQL schema
   */
  generateDatabaseSQL(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    const modules = project.refinedScope?.modules || project.refined_scope?.modules || [];
    
    let sql = '-- Database Schema\n';
    sql += '-- Generated from project modules\n\n';
    sql += 'PRAGMA foreign_keys = ON;\n\n';

    // Generate tables based on modules
    modules.forEach((module, index) => {
      const moduleName = typeof module === 'string' ? module : (module.name || module.displayName || `module_${index + 1}`);
      const tableName = this.toSnakeCase(moduleName);
      
      sql += `-- Table: ${tableName}\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      sql += `    id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
      sql += `    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
      sql += `    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
      sql += `);\n\n`;
    });

    // Add common tables
    sql += `-- Common tables\n`;
    sql += `CREATE TABLE IF NOT EXISTS users (\n`;
    sql += `    id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `    email TEXT UNIQUE NOT NULL,\n`;
    sql += `    password_hash TEXT NOT NULL,\n`;
    sql += `    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS sessions (\n`;
    sql += `    id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `    user_id INTEGER REFERENCES users(id),\n`;
    sql += `    token TEXT UNIQUE NOT NULL,\n`;
    sql += `    expires_at DATETIME NOT NULL,\n`;
    sql += `    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    return sql;
  }

  /**
   * Generate API endpoint specifications
   * @param {Object} project - Project data
   * @returns {string} API spec as markdown
   */
  generateAPISpec(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    const modules = project.refinedScope?.modules || project.refined_scope?.modules || [];
    
    let spec = '# API Endpoints\n\n';
    spec += '## Base URL\n';
    spec += '`/api/v1`\n\n';

    // Generate endpoints for each module
    modules.forEach((module, index) => {
      const moduleName = typeof module === 'string' ? module : (module.name || module.displayName || `module_${index + 1}`);
      const resourceName = this.toKebabCase(moduleName);
      
      spec += `## ${moduleName} Module\n\n`;
      spec += `### GET /${resourceName}\n`;
      spec += `- Description: List all ${moduleName.toLowerCase()} items\n`;
      spec += `- Response: Array of ${moduleName.toLowerCase()} objects\n\n`;
      
      spec += `### GET /${resourceName}/:id\n`;
      spec += `- Description: Get single ${moduleName.toLowerCase()} by ID\n`;
      spec += `- Response: ${moduleName} object\n\n`;
      
      spec += `### POST /${resourceName}\n`;
      spec += `- Description: Create new ${moduleName.toLowerCase()}\n`;
      spec += `- Request Body: ${moduleName} object\n`;
      spec += `- Response: Created ${moduleName.toLowerCase()} object\n\n`;
      
      spec += `### PUT /${resourceName}/:id\n`;
      spec += `- Description: Update ${moduleName.toLowerCase()}\n`;
      spec += `- Request Body: ${moduleName} object\n`;
      spec += `- Response: Updated ${moduleName.toLowerCase()} object\n\n`;
      
      spec += `### DELETE /${resourceName}/:id\n`;
      spec += `- Description: Delete ${moduleName.toLowerCase()}\n`;
      spec += `- Response: Success message\n\n`;
    });

    return spec;
  }

  /**
   * Generate pseudocode for components
   * @param {Object} project - Project data
   * @returns {Array} Array of pseudocode objects
   */
  generatePseudocode(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    
    if (!technicalBreakdown || !technicalBreakdown.technicalBreakdowns) {
      return [];
    }

    const pseudocode = [];

    technicalBreakdown.technicalBreakdowns.forEach(breakdown => {
      if (breakdown.technicalComponents) {
        breakdown.technicalComponents.forEach(component => {
          pseudocode.push({
            component: component.name || component.type || 'Component',
            setup: this.getSetupCode(component),
            implementation: this.getImplementationCode(component),
            tests: this.getTestCode(component)
          });
        });
      }
    });

    return pseudocode;
  }

  /**
   * Get setup code pseudocode
   * @param {Object} component - Component object
   * @returns {string} Setup pseudocode
   */
  getSetupCode(component) {
    return `// Setup for ${component.name || 'component'}
FUNCTION setup() {
    // Initialize dependencies
    // Configure environment variables
    // Set up database connections
    // Register routes/middleware
    RETURN initialized
}`;
  }

  /**
   * Get implementation code pseudocode
   * @param {Object} component - Component object
   * @returns {string} Implementation pseudocode
   */
  getImplementationCode(component) {
    const componentName = component.name || component.type || 'Component';
    const componentType = component.type || 'service';
    
    if (componentType === 'service') {
      return `// ${componentName} Service Implementation
CLASS ${componentName}Service {
    FUNCTION create(data) {
        VALIDATE data
        SAVE to database
        RETURN created entity
    }
    
    FUNCTION getById(id) {
        FETCH from database WHERE id = id
        IF not found RETURN error
        RETURN entity
    }
    
    FUNCTION update(id, data) {
        FETCH entity WHERE id = id
        IF not found RETURN error
        UPDATE entity with data
        SAVE to database
        RETURN updated entity
    }
    
    FUNCTION delete(id) {
        FETCH entity WHERE id = id
        IF not found RETURN error
        DELETE from database
        RETURN success
    }
}`;
    } else if (componentType === 'controller') {
      return `// ${componentName} Controller Implementation
CLASS ${componentName}Controller {
    FUNCTION handleRequest(req, res) {
        EXTRACT parameters from req
        CALL service method
        IF error RETURN error response
        RETURN success response with data
    }
}`;
    } else {
      return `// ${componentName} Implementation
FUNCTION ${componentName}() {
    // Component logic here
    RETURN result
}`;
    }
  }

  /**
   * Get test code pseudocode
   * @param {Object} component - Component object
   * @returns {string} Test pseudocode
   */
  getTestCode(component) {
    const componentName = component.name || component.type || 'Component';
    
    return `// Tests for ${componentName}
DESCRIBE ${componentName} {
    TEST "should create ${componentName.toLowerCase()}" {
        GIVEN valid input data
        WHEN create method is called
        THEN entity should be created in database
        AND return created entity
    }
    
    TEST "should get ${componentName.toLowerCase()} by id" {
        GIVEN existing entity with id
        WHEN getById method is called
        THEN return entity with matching id
    }
    
    TEST "should handle errors gracefully" {
        GIVEN invalid input
        WHEN method is called
        THEN return appropriate error message
    }
}`;
  }

  /**
   * Generate deployment configuration
   * @param {Object} project - Project data
   * @returns {string} Deployment config as YAML
   */
  generateDeploymentConfig(project) {
    let config = `# Docker Compose Configuration
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=dbname
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  db_data:
`;

    return config;
  }

  /**
   * Generate code structure details
   * @param {Object} project - Project data
   * @returns {Object} Code structure object
   */
  generateCodeStructure(project) {
    const technicalBreakdown = project.technicalBreakdown || project.technical_breakdown;
    
    if (!technicalBreakdown || !technicalBreakdown.codeStructure) {
      return {
        models: [],
        services: [],
        controllers: [],
        routes: []
      };
    }

    return technicalBreakdown.codeStructure;
  }

  /**
   * Generate testing strategy
   * @param {Object} project - Project data
   * @returns {string} Testing strategy as markdown
   */
  generateTestingStrategy(project) {
    return `# Testing Strategy

## Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Target: 80% code coverage

## Integration Tests
- Test API endpoints
- Test database operations
- Test service interactions

## E2E Tests
- Test complete user flows
- Test critical paths
- Test error scenarios

## Test Tools
- Framework: Jest
- E2E: Playwright
- Coverage: Istanbul`;
  }

  /**
   * Generate CI/CD configuration
   * @param {Object} project - Project data
   * @returns {string} CI/CD config as YAML
   */
  generateCiCdConfig(project) {
    return `# GitHub Actions CI/CD
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          echo "Deploy to production server"
`;
  }

  /**
   * Convert string to snake_case
   * @param {string} str - Input string
   * @returns {string} Snake case string
   */
  toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Convert string to kebab-case
   * @param {string} str - Input string
   * @returns {string} Kebab case string
   */
  toKebabCase(str) {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[^a-z0-9-]/g, '-');
  }
}

module.exports = BlueprintGenerator;


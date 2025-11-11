const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

class APIGenerator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    try {
      const templatePath = path.join(__dirname, '../../../templates/specs/api-templates.json');
      const data = fs.readFileSync(templatePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to load API templates', { error: error.message });
      return {};
    }
  }

  generateOpenAPI(modules, domainContext) {
    const domain = domainContext.industry || 'generic';
    const allEndpoints = [];

    // Collect endpoints from all modules
    for (const module of modules) {
      const moduleName = module.name || module.displayName;
      const template = this.templates[domain]?.[moduleName] || 
                       this.templates.generic?.[moduleName];

      if (template && Array.isArray(template)) {
        allEndpoints.push(...template);
      }
    }

    // Build OpenAPI 3.0 spec
    const spec = {
      openapi: '3.0.0',
      info: {
        title: `${domainContext.useCase || 'Application'} API`,
        version: '1.0.0',
        description: `API specification for ${domain} domain`
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
        { url: 'https://api.example.com', description: 'Production' }
      ],
      paths: {},
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };

    // Add endpoints to paths
    for (const endpoint of allEndpoints) {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      const method = endpoint.method.toLowerCase();
      spec.paths[endpoint.path][method] = {
        summary: endpoint.summary,
        tags: endpoint.tags || [],
        security: endpoint.auth ? [{ bearerAuth: [] }] : [],
        requestBody: endpoint.requestBody ? {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: this.convertToSchema(endpoint.requestBody),
                required: this.getRequiredFields(endpoint.requestBody)
              }
            }
          }
        } : undefined,
        parameters: endpoint.queryParams ? 
          Object.entries(endpoint.queryParams).map(([name, param]) => ({
            name,
            in: 'query',
            description: param.description || param,
            schema: this.getParamSchema(param),
            required: param.required || false
          })) : undefined,
        responses: this.convertResponses(endpoint.responses)
      };
    }

    return spec;
  }

  convertToSchema(obj) {
    const schema = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        schema[key] = {
          type: value.type || 'string',
          format: value.format,
          description: value.description,
          minLength: value.minLength,
          enum: value.enum,
          default: value.default,
          items: value.items ? { type: value.items } : undefined
        };
      } else {
        schema[key] = {
          type: 'string',
          description: value
        };
      }
    }
    return schema;
  }

  getRequiredFields(obj) {
    const required = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value.required === true) {
        required.push(key);
      }
    }
    return required;
  }

  getParamSchema(param) {
    if (typeof param === 'object' && param !== null) {
      return {
        type: param.type || 'string',
        format: param.format,
        enum: param.enum,
        default: param.default
      };
    }
    return { type: 'string' };
  }

  convertResponses(responses) {
    const converted = {};
    for (const [code, response] of Object.entries(responses)) {
      converted[code] = {
        description: this.getResponseDescription(code),
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: this.convertToSchema(response.schema || response)
            }
          }
        }
      };
    }
    return converted;
  }

  getResponseDescription(code) {
    const descriptions = {
      '200': 'Success',
      '201': 'Created',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '404': 'Not Found',
      '409': 'Conflict',
      '500': 'Internal Server Error'
    };
    return descriptions[code] || 'Response';
  }

  generateYAML(spec) {
    try {
      return yaml.dump(spec, { indent: 2, lineWidth: 120 });
    } catch (error) {
      this.logger.error('Failed to generate YAML', { error: error.message });
      return '';
    }
  }

  generateMarkdown(spec) {
    let md = `# API Documentation\n\n`;
    md += `**Version**: ${spec.info.version}\n\n`;
    md += `${spec.info.description}\n\n`;
    md += `---\n\n`;

    // Group by tags
    const endpointsByTag = {};
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, details] of Object.entries(methods)) {
        const tags = details.tags || ['General'];
        for (const tag of tags) {
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = [];
          }
          endpointsByTag[tag].push({ path, method, details });
        }
      }
    }

    // Generate sections by tag
    for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
      md += `## ${tag}\n\n`;
      
      for (const { path, method, details } of endpoints) {
        md += `### ${method.toUpperCase()} ${path}\n\n`;
        md += `**Summary**: ${details.summary}\n\n`;

        if (details.security && details.security.length > 0) {
          md += `**Auth**: Bearer token required\n\n`;
        }

        if (details.requestBody) {
          md += `**Request Body**:\n\`\`\`json\n`;
          const schema = details.requestBody.content['application/json'].schema;
          md += JSON.stringify(schema.properties, null, 2);
          md += `\n\`\`\`\n\n`;
        }

        if (details.parameters && details.parameters.length > 0) {
          md += `**Query Parameters**:\n`;
          for (const param of details.parameters) {
            md += `- \`${param.name}\`: ${param.description || ''} ${param.required ? '(required)' : '(optional)'}\n`;
          }
          md += `\n`;
        }

        md += `**Responses**:\n`;
        for (const [code, response] of Object.entries(details.responses)) {
          md += `- **${code}**: ${response.description}\n`;
        }
        md += `\n---\n\n`;
      }
    }

    return md;
  }
}

module.exports = APIGenerator;

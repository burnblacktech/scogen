const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.defaultsPath = path.join(__dirname, '../../config/defaults.json');
    this.userConfigPath = path.join(os.homedir(), '.scogen', 'config.json');
    
    this.defaults = this.loadDefaults();
    this.userConfig = this.loadUserConfig();
    this.env = this.loadEnv();
    
    // Merge priority: env > userConfig > defaults
    this.config = this.deepMerge(this.defaults, this.userConfig, this.env);
  }

  loadDefaults() {
    try {
      return JSON.parse(fs.readFileSync(this.defaultsPath, 'utf8'));
    } catch (error) {
      throw new Error(`Cannot load defaults.json: ${error.message}`);
    }
  }

  loadUserConfig() {
    try {
      if (fs.existsSync(this.userConfigPath)) {
        return JSON.parse(fs.readFileSync(this.userConfigPath, 'utf8'));
      }
      return {};
    } catch (error) {
      console.warn(`Cannot load user config: ${error.message}`);
      return {};
    }
  }

  loadEnv() {
    try {
      require('dotenv').config();
    } catch (e) {
      // dotenv not installed, skip
    }
    
    const env = {};
    
    // Map environment variables to config structure
    if (process.env.OPENAI_API_KEY) {
      env.llm = { ...env.llm, apiKey: process.env.OPENAI_API_KEY };
    }
    
    if (process.env.LOG_LEVEL) {
      env.logging = { ...env.logging, level: process.env.LOG_LEVEL };
    }

    if (process.env.SCOGEN_DB_PATH) {
      env.database = { ...env.database, path: process.env.SCOGEN_DB_PATH };
    }
    
    return env;
  }

  deepMerge(...objects) {
    const isObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj);
    
    return objects.reduce((merged, obj) => {
      Object.keys(obj).forEach(key => {
        const mergedValue = merged[key];
        const objValue = obj[key];
        
        if (isObject(mergedValue) && isObject(objValue)) {
          merged[key] = this.deepMerge(mergedValue, objValue);
        } else {
          merged[key] = objValue;
        }
      });
      
      return merged;
    }, {});
  }

  get(key) {
    // Support dot notation: config.get('llm.model')
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }

  set(key, value, persist = true) {
    // Set in-memory
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;

    // Persist to user config if requested
    if (persist) {
      this.saveUserConfig();
    }
  }

  saveUserConfig() {
    try {
      const dir = path.dirname(this.userConfigPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save only user overrides (not defaults)
      fs.writeFileSync(
        this.userConfigPath,
        JSON.stringify(this.userConfig, null, 2)
      );
    } catch (error) {
      console.error(`Cannot save user config: ${error.message}`);
    }
  }

  validate() {
    const errors = [];

    // Validate database path is writable
    const dbPath = this.get('database.path');
    const dbDir = path.dirname(dbPath);
    
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (e) {
      errors.push(`Cannot create database directory: ${dbDir}`);
    }

    // Validate log path is writable
    const logPath = this.get('logging.file');
    const logDir = path.dirname(logPath);
    
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (e) {
      errors.push(`Cannot create log directory: ${logDir}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getAll() {
    return this.config;
  }
}

module.exports = ConfigManager;


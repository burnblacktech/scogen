module.exports = {
  DB_INIT_FAILED: {
    message: "Couldn't start database. Check file permissions.",
    recovery: "Try running with sudo or check data/ directory permissions.",
    technical: "Database initialization failed"
  },
  
  DB_SAVE_FAILED: {
    message: "Couldn't save scope. Your work is safe in memory.",
    recovery: "Try again, or export to JSON manually.",
    technical: "Database write operation failed"
  },

  LLM_API_KEY_MISSING: {
    message: "OpenAI API key not found.",
    recovery: "Add OPENAI_API_KEY to .env file. Get key at platform.openai.com/api-keys",
    technical: "Environment variable OPENAI_API_KEY not set"
  },

  LLM_API_TIMEOUT: {
    message: "AI response taking too long (>30s).",
    recovery: "Check internet connection. Try again.",
    technical: "LLM API request timeout"
  },

  LLM_API_ERROR: {
    message: "AI service unavailable right now.",
    recovery: "Try again in a minute, or use manual mode.",
    technical: "LLM API request failed"
  },

  INPUT_TOO_SHORT: {
    message: "Need more details to scope this.",
    recovery: "Tell me more about what you're building. Example: 'payroll app for 3 coffee shops'",
    technical: "Input validation failed: minimum length not met"
  },

  INPUT_INVALID: {
    message: "Couldn't understand that input.",
    recovery: "Try describing the app in plain English.",
    technical: "Input parsing failed"
  },

  SCOPE_NOT_FOUND: {
    message: "Couldn't find that scope.",
    recovery: "Check the scope ID or list recent scopes.",
    technical: "Scope ID not in database"
  },

  SCOPE_GENERATION_FAILED: {
    message: "Couldn't generate scope from that input.",
    recovery: "Try rephrasing, or contact support.",
    technical: "Scope generation pipeline failed"
  },

  FEEDBACK_INVALID: {
    message: "Feedback data incomplete.",
    recovery: "Make sure actual days and cost are filled in.",
    technical: "Feedback validation failed"
  },

  FILE_WRITE_FAILED: {
    message: "Couldn't save file.",
    recovery: "Check disk space and permissions.",
    technical: "File system write operation failed"
  },

  BACKUP_FAILED: {
    message: "Auto-backup failed (your data is still safe).",
    recovery: "Check backup directory permissions.",
    technical: "Backup operation failed"
  },

  UNKNOWN_ERROR: {
    message: "Something unexpected happened.",
    recovery: "Check logs/scogen.log for details, or restart app.",
    technical: "Unhandled exception"
  }
};


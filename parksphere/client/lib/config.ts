// Centralized configuration management
// This ensures all environment variables are validated and typed

interface AppConfig {
  api: {
    groqKey: string;
  };
  features: {
    enableMascot: boolean;
    enableEnhancedInfo: boolean;
    enableProgressiveLoading: boolean;
  };
  performance: {
    batchSize: number;
    maxParksToLoad: number;
    debounceDelay: number;
  };
}

class ConfigurationError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = 'ConfigurationError';
  }
}

function validateConfig(): AppConfig {
  // Validate required environment variables
  const groqKey = process.env.GROQ_API_KEY;
  
  if (!groqKey && typeof window === 'undefined') {
    // Only validate on server-side
    console.warn('GROQ_API_KEY is not set. AI features will be disabled.');
  }

  return {
    api: {
      groqKey: groqKey || '',
    },
    features: {
      enableMascot: true,
      enableEnhancedInfo: true,
      enableProgressiveLoading: true,
    },
    performance: {
      batchSize: 3,
      maxParksToLoad: 50,
      debounceDelay: 300,
    },
  };
}

// Singleton configuration instance
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = validateConfig();
  }
  return configInstance;
}

// Type-safe configuration hooks for React components
export function useConfig() {
  return getConfig();
}

// Export configuration types
export type { AppConfig };
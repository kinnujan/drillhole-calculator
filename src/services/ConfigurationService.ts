import { createTheme } from '@mui/material/styles';

export interface AppConfig {
  darkMode: boolean;
  // Add more configuration options here as needed
}

const defaultConfig: AppConfig = {
  darkMode: false,
};

class ConfigurationService {
  private static instance: ConfigurationService;
  private config: AppConfig;

  private constructor() {
    // Load config from localStorage or use default
    const savedConfig = localStorage.getItem('quicklogger-config');
    this.config = savedConfig ? JSON.parse(savedConfig) : { ...defaultConfig };
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    localStorage.setItem('quicklogger-config', JSON.stringify(this.config));
  }

  public getTheme() {
    return createTheme({
      palette: {
        mode: this.config.darkMode ? 'dark' : 'light',
      },
    });
  }
}

export default ConfigurationService;

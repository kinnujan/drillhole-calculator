import { createTheme, Theme } from '@mui/material/styles';

export interface AppConfig {
  darkMode: boolean;
  // Add more configuration options here as needed
}

const defaultConfig: AppConfig = {
  darkMode: false,
};

export class ConfigurationService {
  private config: AppConfig;

  constructor() {
    console.log('[CONFIG] Creating ConfigurationService instance');
    // Load config from localStorage or use default
    const savedConfig = localStorage.getItem('quicklogger-config');
    this.config = savedConfig ? JSON.parse(savedConfig) : { ...defaultConfig };
    console.log('[CONFIG] Loaded configuration:', this.config);
  }

  public getConfig(): AppConfig {
    console.log('[CONFIG] Getting current configuration:', this.config);
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AppConfig>): void {
    console.log('[CONFIG] Updating configuration:', newConfig);
    this.config = {
      ...this.config,
      ...newConfig,
    };
    localStorage.setItem('quicklogger-config', JSON.stringify(this.config));
    console.log('[CONFIG] New configuration saved:', this.config);
  }

  public getTheme(): Theme {
    console.log('[CONFIG] Getting theme with darkMode:', this.config.darkMode);
    return createTheme({
      palette: {
        mode: this.config.darkMode ? 'dark' : 'light',
      },
    });
  }

  public resetConfig(): void {
    console.log('[CONFIG] Resetting configuration to defaults');
    this.config = { ...defaultConfig };
    localStorage.setItem('quicklogger-config', JSON.stringify(this.config));
    console.log('[CONFIG] Configuration reset complete');
  }
}

// Create and export singleton instance
const configurationService = new ConfigurationService();
Object.freeze(configurationService);
export default configurationService;

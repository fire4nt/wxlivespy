import * as fs from 'fs';

// Step 1: Define an interface for your configuration
export interface ConfigProps {
  debug: boolean;
  spy_url: string;
  forward_url?: string;
  gzip_forward_data: boolean;
  chrome_path?: string;
  chrome_userdata_path?: string;
  log_path: string;
  gift_and_comments_only: boolean;
  http_server_port: number;
  // Add other properties as needed
}

class SpyConfig {
  private configFilePath: string;

  private defaultConfig: ConfigProps = {
    debug: false,
    spy_url: 'https://channels.weixin.qq.com/platform/live/liveBuild',
    forward_url: 'http://localhost:8000/forward',
    gzip_forward_data: false,
    log_path: './logs',
    gift_and_comments_only: false,
    http_server_port: 21201,
  };

  private config: ConfigProps;

  constructor(configFilePath: string) {
    this.configFilePath = configFilePath;
    this.config = { ...this.defaultConfig };
  }

  public load(): void {
    if (fs.existsSync(this.configFilePath)) {
      const data = fs.readFileSync(this.configFilePath, 'utf8');
      const loadedConfig = JSON.parse(data);
      this.config = { ...this.defaultConfig, ...loadedConfig };
    }
  }

  public save(): void {
    const data = JSON.stringify(this.config, null, 2);
    fs.writeFileSync(this.configFilePath, data);
  }

  // Step 2: Implement generic getProp and setProp methods
  public getProp<K extends keyof ConfigProps>(key: K): ConfigProps[K] {
    return this.config[key];
  }

  public setProp<K extends keyof ConfigProps>(key: K, value: ConfigProps[K]): void {
    this.config[key] = value;
  }

  public getAllConfigs(): ConfigProps {
    return this.config;
  }
}

export default SpyConfig;

export interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
}

export class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(`Error: ${message}`);
  }

  warn(message: string): void {
    console.warn(`Warning: ${message}`);
  }

  info(message: string): void {
    console.info(`Info: ${message}`);
  }
}

export class SilentLogger implements Logger {
  log(message: string): void {
  }

  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  info(message: string): void {
  }
}
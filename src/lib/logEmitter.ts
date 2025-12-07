import { EventEmitter } from "events";

/**
 * Global event emitter for real-time log streaming.
 * Used to notify SSE clients when new logs are added.
 */
class LogEmitter extends EventEmitter {
  private static instance: LogEmitter;

  private constructor() {
    super();
    // Increase max listeners to handle many SSE connections
    this.setMaxListeners(100);
  }

  public static getInstance(): LogEmitter {
    if (!LogEmitter.instance) {
      LogEmitter.instance = new LogEmitter();
    }
    return LogEmitter.instance;
  }
}

export const logEmitter = LogEmitter.getInstance();




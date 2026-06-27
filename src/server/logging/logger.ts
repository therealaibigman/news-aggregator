type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

const REDACTED = '[redacted]';
const REDACT_KEYS = ['apikey', 'api_key', 'authorization', 'cookie', 'password', 'secret', 'token'];

function isSensitiveKey(key: string) {
  const lower = key.toLowerCase();
  return REDACT_KEYS.some((sensitive) => lower.includes(sensitive));
}

function normalizeValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return REDACTED;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'string') {
    return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item, idx) => normalizeValue(String(idx), item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        normalizeValue(childKey, childValue),
      ]),
    );
  }

  return value;
}

function normalizeFields(fields: LogFields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, normalizeValue(key, value)]));
}

function write(level: LogLevel, component: string, event: string, fields?: LogFields) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    event,
    ...normalizeFields(fields),
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(component: string) {
  return {
    debug: (event: string, fields?: LogFields) => write('debug', component, event, fields),
    info: (event: string, fields?: LogFields) => write('info', component, event, fields),
    warn: (event: string, fields?: LogFields) => write('warn', component, event, fields),
    error: (event: string, fields?: LogFields) => write('error', component, event, fields),
  };
}

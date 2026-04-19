type ErrorContext = Record<string, unknown>;

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatContext(context?: ErrorContext): string {
  if (!context) return "";

  const pairs = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`);

  return pairs.length > 0 ? ` | ${pairs.join(" ")}` : "";
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : String(error);
}

export function logError(
  operation: string,
  error: unknown,
  context?: ErrorContext
): void {
  const prefix = `[AI-NEWS ERROR] ${operation}${formatContext(context)}`;
  const message = errorMessage(error);

  console.error(`${prefix}: ${message}`);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}


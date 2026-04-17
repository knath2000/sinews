function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getAppBaseUrl(request?: Request): string {
  const configuredBaseUrl = process.env.APP_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl && vercelProductionUrl.trim().length > 0) {
    return normalizeBaseUrl(vercelProductionUrl);
  }

  const vercelPreviewUrl = process.env.VERCEL_URL;
  if (vercelPreviewUrl && vercelPreviewUrl.trim().length > 0) {
    return normalizeBaseUrl(vercelPreviewUrl);
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

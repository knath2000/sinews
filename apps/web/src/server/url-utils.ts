const PRIVATE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

export function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (PRIVATE_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (isPrivateIPv4(normalized)) return true;

  return false;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function normalizePublicUrl(
  rawUrl: string,
  allowedHosts?: string[]
): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const hostname = normalizeHost(url.hostname);
    if (isPrivateHostname(hostname)) {
      return null;
    }

    if (allowedHosts && allowedHosts.length > 0) {
      const allowed = new Set(allowedHosts.map((host) => normalizeHost(host)));
      if (!allowed.has(hostname)) {
        return null;
      }
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizePublicImageUrl(
  rawUrl: string,
  baseUrl?: string | null
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const resolvedUrl = trimmed.startsWith("//")
      ? `https:${trimmed}`
      : trimmed;
    const url = baseUrl ? new URL(resolvedUrl, baseUrl) : new URL(resolvedUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const hostname = normalizeHost(url.hostname);
    if (isPrivateHostname(hostname)) {
      return null;
    }

    url.hash = "";
    url.username = "";
    url.password = "";

    return url.toString();
  } catch {
    return null;
  }
}

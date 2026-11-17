import Constants from 'expo-constants';

/**
 * Backend origin.
 * A phone cannot reach the PC via localhost. In Expo Go the packager host is
 * already the PC's LAN address, so the API uses that host on port 8080.
 * Set EXPO_PUBLIC_API_BASE_URL to override (Android emulator: http://10.0.2.2:8080).
 */
const API_PORT = 8080;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostFromUri(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const withoutScheme = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const hostPort = withoutScheme.split('/')[0]?.trim();
  if (!hostPort) {
    return undefined;
  }

  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    return end > 1 ? hostPort.slice(1, end) : undefined;
  }

  const host = hostPort.split(':')[0]?.trim();
  return host || undefined;
}

function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

/** Expo tunnel hosts proxy Metro only. They do not forward the API port. */
function isTunnelHost(host: string): boolean {
  const name = host.toLowerCase();
  return (
    name.endsWith('.exp.direct') ||
    name.endsWith('.exp.host') ||
    name.endsWith('.ngrok.io') ||
    name.endsWith('.ngrok-free.app')
  );
}

function packagerHost(): string | undefined {
  const fromConfig = hostFromUri(Constants.expoConfig?.hostUri);
  if (fromConfig) {
    return fromConfig;
  }

  return hostFromUri(Constants.experienceUrl);
}

function parseConfiguredBaseUrl(value: string | undefined): { url: string; host: string } | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const host = new URL(value).hostname;
    if (!host) {
      return undefined;
    }
    return { url: value, host };
  } catch {
    return undefined;
  }
}

function resolveApiBaseUrl(): string {
  const configured = parseConfiguredBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, ''),
  );
  if (configured && !isLoopback(configured.host)) {
    return configured.url;
  }

  const host = packagerHost();
  if (host && !isLoopback(host) && !isTunnelHost(host)) {
    return `http://${host}:${API_PORT}`;
  }

  return configured?.url ?? `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_TIMEOUT_MS = 15000;

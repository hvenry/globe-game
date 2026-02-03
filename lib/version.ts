/**
 * Get the current app version from environment variable
 * This is injected at build time by GitHub Actions
 */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
}

/**
 * Check if running in development mode
 */
export function isDevVersion(): boolean {
  return getAppVersion() === 'dev';
}

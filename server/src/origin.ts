/**
 * Which origins may talk to a room.
 *
 * The check exists to stop another *site* driving a visitor's browser at these
 * rooms. It is not a defence against scripted abuse — a non-browser client
 * sends whatever `Origin` it likes, which is what the rate limiter is for.
 *
 * Loopback and private-network origins are always allowed. A page served from
 * the developer's own machine or LAN is not the cross-site attacker this
 * guards against, and hand-maintaining a list of every local address
 * (`localhost`, `127.0.0.1`, `[::1]`, whatever Next prints as its Network URL)
 * is a reliable source of "why doesn't it work on my machine".
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

/** RFC 1918 ranges plus link-local, i.e. addresses that cannot come from the internet. */
function isPrivateHost(host: string): boolean {
  if (LOOPBACK_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return true;

  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * An absent `Origin` is allowed: browsers always send one, so its absence means
 * a non-browser client, which this check cannot meaningfully restrict anyway.
 */
export function isAllowedOrigin(origin: string | null, allowlist: readonly string[]): boolean {
  if (origin === null) return true;
  if (allowlist.includes(origin)) return true;

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  return isPrivateHost(host);
}

export const parseAllowlist = (raw: string): string[] =>
  raw.split(",").map((o) => o.trim()).filter(Boolean);

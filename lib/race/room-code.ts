/**
 * Room codes: the alphabet and how to read one out of whatever a user pastes.
 *
 * Shared by the server (which mints and validates codes) and the join form
 * (which cleans up input), so both sides agree on what a code looks like.
 */

/** Crockford-style alphabet: no I, L, O or U, so codes survive being read aloud. */
export const ROOM_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ROOM_CODE_LENGTH = 6;

/** Letters that are not in the alphabet but are what people type for ones that are. */
const LOOKALIKES: Record<string, string> = { O: "0", I: "1", L: "1" };

export function isRoomCode(value: string): boolean {
  return (
    value.length === ROOM_CODE_LENGTH && [...value].every((char) => ROOM_ALPHABET.includes(char))
  );
}

/**
 * Turn user input into the code it most plausibly means. Accepts a bare code
 * in any case, an invite link (`…/race?room=ABC123`), and the common
 * lookalike letters. Never longer than a code; may be shorter while typing.
 */
export function normalizeRoomCode(raw: string): string {
  // A pasted invite link: the code is the `room` query value, not the URL.
  const match = raw.match(/[?&]room=([^&#\s]*)/i);
  const source = match ? match[1] : raw;

  let code = "";
  for (const char of source.toUpperCase()) {
    const mapped = LOOKALIKES[char] ?? char;
    if (ROOM_ALPHABET.includes(mapped)) code += mapped;
    if (code.length === ROOM_CODE_LENGTH) break;
  }
  return code;
}

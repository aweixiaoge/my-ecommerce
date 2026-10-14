import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/** 16 bytes of salt and a 64-byte derived key. */
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** Bounds on what a stored hash may ask us to derive, so a corrupt row cannot pin the CPU. */
const MIN_KEY_BYTES = 16;
const MAX_KEY_BYTES = 1024;

/**
 * Password hashing for the mock admin store, on `node:crypto` alone.
 *
 * scrypt is a memory-hard KDF and is already in the runtime, so the mock store
 * can hold real hashes instead of plaintext without adding a dependency. The
 * real API uses bcrypt (plan.md, stack table) and this module goes away with
 * the rest of the mock — which is why the parameters here are the defaults
 * rather than something tuned: none of this is meant to outlive the mock.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  return encode(salt, derived);
}

/**
 * Constant-time verification against a stored `salt:key` hash.
 *
 * Returns `false` — never throws — for anything malformed. A corrupt or
 * truncated row has to read as "wrong password", not as a 500, or a single bad
 * record becomes a crash and, worse, a way to tell a corrupt row apart from a
 * valid one.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parsed = decode(storedHash);
  if (!parsed) return false;

  // Derive to the stored key's length so the two buffers are always the same
  // size; `timingSafeEqual` throws on a length mismatch rather than returning
  // false.
  const derived = (await scryptAsync(
    password,
    parsed.salt,
    parsed.key.length,
  )) as Buffer;

  return timingSafeEqual(derived, parsed.key);
}

function encode(salt: Buffer, key: Buffer): string {
  return `${salt.toString("base64")}:${key.toString("base64")}`;
}

function decode(storedHash: string): { salt: Buffer; key: Buffer } | null {
  const [saltPart, keyPart, ...rest] = storedHash.split(":");
  // More than one separator means this is not a hash we wrote.
  if (rest.length > 0 || !saltPart || !keyPart) return null;

  const salt = Buffer.from(saltPart, "base64");
  const key = Buffer.from(keyPart, "base64");

  // `Buffer.from(_, "base64")` silently drops invalid characters instead of
  // throwing, so a garbage string decodes to a short or empty buffer rather
  // than an error. Length is the only signal that decoding actually worked.
  if (salt.length < SALT_BYTES) return null;
  if (key.length < MIN_KEY_BYTES || key.length > MAX_KEY_BYTES) return null;

  return { salt, key };
}

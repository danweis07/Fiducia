/**
 * Shim for Deno's std/encoding/base64.ts
 * Maps the Deno API to Node.js Buffer equivalents for vitest.
 */

export function encodeBase64(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return Buffer.from(data, "utf-8").toString("base64");
  }
  return Buffer.from(data).toString("base64");
}

export function decodeBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

import { Buffer } from 'node:buffer';
const { createHmac, timingSafeEqual } = await import('node:crypto');

const SIGNED_DOWNLOAD_TTL_SECONDS = 5 * 60;

export function createSignedDownloadPath(
  signingKey: Buffer,
  fileId: number,
  nowSeconds: number = currentUnixTime(),
): string {
  const expires = nowSeconds + SIGNED_DOWNLOAD_TTL_SECONDS;
  const signature = signDownload(signingKey, fileId, expires);
  return `/files/${fileId}/signed-download?expires=${expires}&signature=${signature}`;
}

export function verifySignedDownload(
  signingKey: Buffer,
  fileId: number,
  expiresValue: string,
  signature: string,
  nowSeconds: number = currentUnixTime(),
): boolean {
  if (!/^\d+$/.test(expiresValue) || !/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }

  const expires = Number(expiresValue);
  if (!Number.isSafeInteger(expires) || expires <= nowSeconds) {
    return false;
  }

  const givenBuffer = Buffer.alloc(64, signature);
  const expectedSignature = signDownload(signingKey, fileId, Number(expiresValue));
  const expectedBuffer = Buffer.alloc(64, expectedSignature);
  return givenBuffer.equals(expectedBuffer);
}

function signDownload(
  signingKey: Buffer,
  fileId: number,
  expires: number,
): string {
  const payload = `GET\n/files/${fileId}/signed-download\n${expires}`;
  const signature = createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex");
  return signature;
}

function currentUnixTime(): number {
  return Math.floor(Date.now() / 1000);
}

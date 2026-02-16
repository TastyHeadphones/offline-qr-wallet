import type { SignaturePayload, SignatureVerifier } from "../../domain/services/signature-verifier.js";

// Placeholder verifier to keep scaffolding executable.
// Swap with platform-backed Ed25519/ECDSA verification before production.
export class BasicSignatureVerifier implements SignatureVerifier {
  async verify(payload: SignaturePayload): Promise<boolean> {
    return payload.publicKey.length > 16 && payload.signature.length > 16 && payload.messageDigest.length > 8;
  }
}

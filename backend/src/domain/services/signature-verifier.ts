export interface SignaturePayload {
  publicKey: string;
  signature: string;
  messageDigest: string;
}

export interface SignatureVerifier {
  verify(payload: SignaturePayload): Promise<boolean>;
}

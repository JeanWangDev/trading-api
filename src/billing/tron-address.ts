/** BIP44 Tron account-level xpub → external address index */
export async function deriveTronAddressFromXpub(
  xpub: string,
  index: number,
): Promise<string> {
  const [{ default: BIP32Factory }, eccModule, bs58Module, sha3Module] = await Promise.all([
    import("bip32"),
    import("tiny-secp256k1"),
    import("bs58check"),
    import("js-sha3"),
  ]);

  const bip32 = BIP32Factory(eccModule);
  const account = bip32.fromBase58(xpub.trim());
  const child = deriveExternalAddressNode(account, index);
  const publicKey = Buffer.from(child.publicKey);

  const uncompressed = eccModule.pointCompress(publicKey, false);
  if (!uncompressed) {
    throw new Error("Failed to decompress public key");
  }

  const hashHex = sha3Module.keccak256(Buffer.from(uncompressed.subarray(1, 65)));
  const hash = Buffer.from(hashHex, "hex");
  const payload = Buffer.concat([Buffer.from([0x41]), hash.subarray(-20)]);
  return bs58Module.default.encode(payload);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveExternalAddressNode(account: any, index: number) {
  if (!account.isNeutered()) {
    throw new Error("TRON_DEPOSIT_XPUB must be an extended PUBLIC key (xpub)");
  }

  if (account.depth === 4) {
    return account.derive(index);
  }

  if (account.depth === 3) {
    return account.derive(0).derive(index);
  }

  throw new Error("TRON_DEPOSIT_XPUB depth unsupported — export m/44'/195'/0' or m/44'/195'/0'/0");
}

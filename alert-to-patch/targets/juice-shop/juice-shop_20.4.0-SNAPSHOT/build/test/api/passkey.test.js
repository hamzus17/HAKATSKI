"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("./helpers/setup");
const auth_1 = require("./helpers/auth");
const helpers_1 = require("@simplewebauthn/server/helpers");
const passkey_1 = require("./helpers/passkey");
const passkey_2 = require("../../models/passkey");
const datacache_1 = require("../../data/datacache");
const security = __importStar(require("../../lib/insecurity"));
// The relying party is derived from the request, so pin the Host the crafted payloads are bound to.
const jsonHeader = { 'content-type': 'application/json', host: 'localhost:3000' };
const VICTIM = { email: 'passkey-user@juice-sh.op', password: 'FeuLJY3w9zXsGas9HeDNK2aDYARxc42HaKinEyZnqLcdqi8E' };
const JIM = { email: 'jim@juice-sh.op', password: 'ncc-1701' };
let app;
let victim;
const bearer = (token) => ({ Authorization: 'Bearer ' + token, ...jsonHeader });
const randomCredentialID = () => helpers_1.isoBase64URL.fromBuffer(node_crypto_1.default.randomBytes(32));
// The library rejects sign counters that do not increase, so every assertion gets a fresh one.
let signCount = 0;
function sign(credential, challenge, options = {}) {
    return (0, passkey_1.buildAssertion)(credential, challenge, { tamper: false, counter: ++signCount, ...options });
}
async function loginOptions(body = { email: VICTIM.email }, headers = jsonHeader) {
    const res = await (0, supertest_1.default)(app)
        .post('/rest/passkey/login-options')
        .set(headers)
        .send(body);
    return { challenge: res.body.options.challenge, authToken: res.body.authToken };
}
function loginVerify(body, headers = jsonHeader) {
    return (0, supertest_1.default)(app)
        .post('/rest/passkey/login-verify')
        .set(headers)
        .send(body);
}
async function registerOptions(token) {
    const res = await (0, supertest_1.default)(app)
        .get('/rest/passkey/register-options')
        .set(bearer(token));
    return { challenge: res.body.options.challenge, regToken: res.body.regToken };
}
function registerVerify(token, body) {
    return (0, supertest_1.default)(app)
        .post('/rest/passkey/register-verify')
        .set(bearer(token))
        .send(body);
}
async function registerPasskey(token, credentialID = randomCredentialID(), options) {
    const { challenge, regToken } = await registerOptions(token);
    const forged = (0, passkey_1.buildAttestation)(credentialID, challenge, options);
    const res = await registerVerify(token, { attestation: forged.attestation, regToken });
    return { ...forged, credentialID, res };
}
function listCredentials(token) {
    return (0, supertest_1.default)(app)
        .get('/rest/passkey/credentials')
        .set(bearer(token));
}
(0, node_test_1.before)(async () => {
    const result = await (0, setup_1.createTestApp)();
    app = result.app;
    victim = await (0, passkey_1.loadVictimCredential)();
}, { timeout: 60000 });
void (0, node_test_1.describe)('/rest/passkey/login-options', () => {
    void (0, node_test_1.it)('POST leaks the matching credential IDs when an email is supplied', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/rest/passkey/login-options')
            .set(jsonHeader)
            .send({ email: VICTIM.email });
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(typeof res.body.authToken, 'string');
        strict_1.default.equal(typeof res.body.options.challenge, 'string');
        const ids = res.body.options.allowCredentials.map((c) => c.id);
        strict_1.default.ok(ids.includes(victim.credentialID));
    });
    void (0, node_test_1.it)('POST omits allowCredentials in discoverable mode (no email)', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/rest/passkey/login-options')
            .set(jsonHeader)
            .send({});
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(res.body.options.allowCredentials, undefined);
    });
    void (0, node_test_1.it)('POST ignores an email that is not a string', async () => {
        for (const email of [[VICTIM.email, JIM.email], { foo: 1 }]) {
            const res = await (0, supertest_1.default)(app)
                .post('/rest/passkey/login-options')
                .set(jsonHeader)
                .send({ email });
            strict_1.default.equal(res.status, 200);
            strict_1.default.equal(res.body.options.allowCredentials, undefined);
        }
    });
    void (0, node_test_1.it)('POST returns an authToken that is not accepted as a session token', async () => {
        const { authToken } = await loginOptions({});
        const res = await (0, supertest_1.default)(app)
            .get('/api/Users')
            .set({ Authorization: 'Bearer ' + authToken });
        strict_1.default.equal(res.status, 401);
    });
});
void (0, node_test_1.describe)('/rest/passkey/login-verify', () => {
    void (0, node_test_1.it)('POST signs the user in for a genuine assertion without solving any challenge', async () => {
        datacache_1.challenges.passkeySignatureChallenge.solved = false;
        datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved = false;
        const { challenge, authToken } = await loginOptions();
        const assertion = sign(victim, challenge);
        const res = await loginVerify({ assertion, authToken });
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(typeof res.body.authentication.token, 'string');
        strict_1.default.equal(res.body.authentication.umail, VICTIM.email);
        strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false);
        strict_1.default.equal(datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST stores the sign counter of a genuine assertion and rejects a replayed one', async () => {
        const first = await loginOptions();
        await loginVerify({ assertion: sign(victim, first.challenge), authToken: first.authToken }).expect(200);
        const row = await passkey_2.PasskeyModel.findOne({ where: { credentialID: victim.credentialID } });
        strict_1.default.equal(row?.counter, signCount);
        const second = await loginOptions();
        const replayed = (0, passkey_1.buildAssertion)(victim, second.challenge, { tamper: false, counter: signCount });
        const res = await loginVerify({ assertion: replayed, authToken: second.authToken });
        strict_1.default.equal(res.status, 500);
        strict_1.default.equal(res.body.authentication, undefined);
    });
    void (0, node_test_1.it)('POST accepts an invalid signature and solves passkeySignatureChallenge', async () => {
        const invalidSignatures = {
            'signed with a different key': (challenge) => sign(victim, challenge, { tamper: true }),
            // The last byte belongs to the DER-encoded `s` integer, so the signature stays well-formed.
            'single flipped bit': (challenge) => {
                const assertion = sign(victim, challenge);
                assertion.response.signature = (0, passkey_1.flipBit)(assertion.response.signature, -1);
                return assertion;
            }
        };
        for (const [name, forge] of Object.entries(invalidSignatures)) {
            datacache_1.challenges.passkeySignatureChallenge.solved = false;
            const { challenge, authToken } = await loginOptions();
            const res = await loginVerify({ assertion: forge(challenge), authToken });
            strict_1.default.equal(res.status, 200, name);
            strict_1.default.equal(res.body.authentication.umail, VICTIM.email, name);
            strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, true, name);
        }
    });
    void (0, node_test_1.it)('POST accepts a forged signature for a non-victim passkey without solving passkeySignatureChallenge', async () => {
        datacache_1.challenges.passkeySignatureChallenge.solved = false;
        const { token } = await (0, auth_1.login)(app, JIM);
        const { credentialID } = await registerPasskey(token);
        const { challenge, authToken } = await loginOptions({});
        const res = await loginVerify({ assertion: sign({ ...victim, credentialID }, challenge, { tamper: true }), authToken });
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(res.body.authentication.umail, JIM.email);
        strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST signs in with a newly added victim passkey without solving passkeyCredentialOverwriteChallenge', async () => {
        datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved = false;
        const { token } = await (0, auth_1.login)(app, VICTIM);
        const { credentialID, privateKeyPem } = await registerPasskey(token);
        const { challenge, authToken } = await loginOptions({});
        const res = await loginVerify({ assertion: sign({ ...victim, credentialID, privateKeyPem }, challenge), authToken });
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(res.body.authentication.umail, VICTIM.email);
        strict_1.default.equal(datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST rejects a signature whose DER structure is broken without solving the challenge', async () => {
        datacache_1.challenges.passkeySignatureChallenge.solved = false;
        const { challenge, authToken } = await loginOptions();
        const assertion = sign(victim, challenge);
        // 0x30 (SEQUENCE) -> 0x31: the library cannot parse the signature at all and throws.
        assertion.response.signature = (0, passkey_1.flipBit)(assertion.response.signature, 0);
        const res = await loginVerify({ assertion, authToken });
        strict_1.default.equal(res.status, 500);
        strict_1.default.equal(res.body.authentication, undefined);
        strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST accepts a genuine assertion without the user-verification flag', async () => {
        datacache_1.challenges.passkeySignatureChallenge.solved = false;
        const { challenge, authToken } = await loginOptions();
        const res = await loginVerify({ assertion: sign(victim, challenge, { flags: 0x01 }), authToken }); // UP only
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST verifies a genuine assertion on whatever origin the shop is served from', async () => {
        const origins = {
            'http://shop.example.com:8080': { host: 'shop.example.com:8080' },
            'https://juice.example.org': { host: 'internal:3000', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'juice.example.org' }
        };
        for (const [origin, originHeaders] of Object.entries(origins)) {
            datacache_1.challenges.passkeySignatureChallenge.solved = false;
            const headers = { ...jsonHeader, ...originHeaders };
            const { challenge, authToken } = await loginOptions(undefined, headers);
            const res = await loginVerify({ assertion: sign(victim, challenge, { origin }), authToken }, headers);
            strict_1.default.equal(res.status, 200, origin);
            strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false, origin);
        }
    });
    void (0, node_test_1.it)('POST rejects an assertion created for a different origin', async () => {
        const { challenge, authToken } = await loginOptions();
        const res = await loginVerify({ assertion: sign(victim, challenge, { origin: 'http://evil.example:3000' }), authToken });
        strict_1.default.equal(res.status, 500);
        strict_1.default.equal(res.body.authentication, undefined);
    });
    void (0, node_test_1.it)('POST returns 401 for a missing or unacceptable authToken or assertion', async () => {
        const { challenge, authToken } = await loginOptions();
        const assertion = sign(victim, challenge);
        const { token } = await (0, auth_1.login)(app, JIM);
        const { regToken } = await registerOptions(token);
        const bodies = {
            'missing authToken': { assertion },
            'authToken signed like a session token': { assertion, authToken: security.authorize({ challenge, type: 'passkey_auth' }) },
            'regToken instead of an authToken': { assertion, authToken: regToken },
            'missing assertion': { authToken }
        };
        for (const [name, body] of Object.entries(bodies)) {
            const res = await loginVerify(body);
            strict_1.default.equal(res.status, 401, name);
        }
    });
    void (0, node_test_1.it)('POST returns 401 for an expired authToken', async (t) => {
        const { challenge, authToken } = await loginOptions();
        const assertion = sign(victim, challenge);
        node_test_1.mock.timers.enable({ apis: ['Date'], now: Date.now() + 6 * 60 * 1000 });
        t.after(() => { node_test_1.mock.timers.reset(); });
        const res = await loginVerify({ assertion, authToken });
        strict_1.default.equal(res.status, 401);
    });
    void (0, node_test_1.it)('POST returns 401 for an unknown credential ID', async () => {
        const { challenge, authToken } = await loginOptions();
        const assertion = sign(victim, challenge);
        assertion.id = 'this-credential-does-not-exist';
        const res = await loginVerify({ assertion, authToken });
        strict_1.default.equal(res.status, 401);
        strict_1.default.equal(res.text, 'No account found for this passkey.');
    });
});
void (0, node_test_1.describe)('/rest/passkey/register-options', () => {
    void (0, node_test_1.it)('GET offers only classic algorithms and preferred user verification', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const res = await (0, supertest_1.default)(app)
            .get('/rest/passkey/register-options')
            .set(bearer(token));
        strict_1.default.equal(res.status, 200);
        strict_1.default.deepEqual(res.body.options.pubKeyCredParams.map((p) => p.alg), [-8, -7, -257]); // EdDSA, ES256, RS256
        strict_1.default.equal(res.body.options.authenticatorSelection.userVerification, 'preferred');
        strict_1.default.equal(res.body.options.rp.id, 'localhost');
    });
    void (0, node_test_1.it)('GET excludes the passkeys the user has already registered', async () => {
        const { token } = await (0, auth_1.login)(app, VICTIM);
        const res = await (0, supertest_1.default)(app)
            .get('/rest/passkey/register-options')
            .set(bearer(token));
        strict_1.default.equal(res.status, 200);
        const ids = res.body.options.excludeCredentials.map((c) => c.id);
        strict_1.default.ok(ids.includes(victim.credentialID));
    });
    void (0, node_test_1.it)('GET returns 401 when not logged in', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/rest/passkey/register-options')
            .set(jsonHeader);
        strict_1.default.equal(res.status, 401);
    });
});
void (0, node_test_1.describe)('/rest/passkey/register-verify', () => {
    void (0, node_test_1.it)('POST overwrites the victim credential and signing in with the attacker key solves passkeyCredentialOverwriteChallenge', async (t) => {
        datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved = false;
        datacache_1.challenges.passkeySignatureChallenge.solved = false;
        t.after(async () => { await passkey_2.PasskeyModel.update({ publicKey: victim.publicKeyCose }, { where: { credentialID: victim.credentialID } }); });
        const { token } = await (0, auth_1.login)(app, JIM);
        const { res, publicKey, privateKeyPem } = await registerPasskey(token, victim.credentialID);
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(res.body.verified, true);
        const row = await passkey_2.PasskeyModel.findOne({ where: { credentialID: victim.credentialID } });
        strict_1.default.equal(row?.publicKey, publicKey);
        strict_1.default.equal(datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved, false);
        // The stored public key now belongs to the attacker, so a genuinely signed login succeeds.
        const { challenge, authToken } = await loginOptions();
        const loginRes = await loginVerify({ assertion: sign({ ...victim, privateKeyPem }, challenge), authToken });
        strict_1.default.equal(loginRes.status, 200);
        strict_1.default.equal(loginRes.body.authentication.umail, VICTIM.email);
        strict_1.default.equal(datacache_1.challenges.passkeyCredentialOverwriteChallenge.solved, true);
        strict_1.default.equal(datacache_1.challenges.passkeySignatureChallenge.solved, false);
    });
    void (0, node_test_1.it)('POST registers a new passkey without the user-verification flag', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const { res } = await registerPasskey(token, undefined, { flags: 0x41 }); // UP | AT
        strict_1.default.equal(res.status, 200);
        strict_1.default.equal(res.body.verified, true);
    });
    void (0, node_test_1.it)('POST stores the AAGUID of the passkey provider and lists it with the creation date', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const aaguid = 'bada5566-a7aa-401f-bd96-45619a55120d';
        const { credentialID } = await registerPasskey(token, undefined, { aaguid });
        const res = await listCredentials(token);
        const registered = res.body.data.find((c) => c.credentialID === credentialID);
        strict_1.default.equal(registered.aaguid, aaguid);
        strict_1.default.ok(!Number.isNaN(Date.parse(registered.createdAt)));
    });
    void (0, node_test_1.it)('POST returns 400 for an attestation whose signature does not verify', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const sig = node_crypto_1.default.sign('sha256', Buffer.from('not the attested data'), { key: node_crypto_1.default.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey, dsaEncoding: 'der' });
        const { res, credentialID } = await registerPasskey(token, undefined, { fmt: 'packed', attStmt: new Map([['alg', -7], ['sig', sig]]) });
        strict_1.default.equal(res.status, 400);
        strict_1.default.equal(res.body.error, 'not verified');
        strict_1.default.equal(await passkey_2.PasskeyModel.count({ where: { credentialID } }), 0);
    });
    void (0, node_test_1.it)('POST rejects an attestation created for a different origin or challenge', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const { challenge, regToken } = await registerOptions(token);
        const credentialID = randomCredentialID();
        const attestations = {
            'different origin': (0, passkey_1.buildAttestation)(credentialID, challenge, { origin: 'http://evil.example:3000' }).attestation,
            'different challenge': (0, passkey_1.buildAttestation)(credentialID, helpers_1.isoBase64URL.fromBuffer(node_crypto_1.default.randomBytes(32))).attestation
        };
        for (const [name, attestation] of Object.entries(attestations)) {
            const res = await registerVerify(token, { attestation, regToken });
            strict_1.default.equal(res.status, 500, name);
        }
        strict_1.default.equal(await passkey_2.PasskeyModel.count({ where: { credentialID } }), 0);
    });
    void (0, node_test_1.it)('POST returns 401 for a missing or unacceptable regToken without touching the victim credential', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const { challenge, regToken } = await registerOptions(token);
        const { userId } = JSON.parse(Buffer.from(regToken.split('.')[1], 'base64url').toString());
        const { attestation } = (0, passkey_1.buildAttestation)(victim.credentialID, challenge);
        const victimSession = await (0, auth_1.login)(app, VICTIM);
        const regTokens = {
            'missing regToken': undefined,
            'regToken signed like a session token': security.authorize({ userId, challenge, type: 'passkey_reg' }),
            'authToken instead of a regToken': (await loginOptions({})).authToken,
            'regToken issued to a different user': (await registerOptions(victimSession.token)).regToken
        };
        for (const [name, unacceptable] of Object.entries(regTokens)) {
            const res = await registerVerify(token, { attestation, regToken: unacceptable });
            strict_1.default.equal(res.status, 401, name);
        }
        const row = await passkey_2.PasskeyModel.findOne({ where: { credentialID: victim.credentialID } });
        strict_1.default.equal(row?.publicKey, victim.publicKeyCose);
    });
    void (0, node_test_1.it)('POST returns 401 when not logged in', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/rest/passkey/register-verify')
            .set(jsonHeader)
            .send({});
        strict_1.default.equal(res.status, 401);
    });
});
void (0, node_test_1.describe)('/rest/passkey/credentials', () => {
    void (0, node_test_1.it)('GET returns 401 when not logged in', async () => {
        const res = await (0, supertest_1.default)(app).get('/rest/passkey/credentials');
        strict_1.default.equal(res.status, 401);
    });
    void (0, node_test_1.it)('GET lists only the passkeys of the logged-in user', async () => {
        const jim = await (0, auth_1.login)(app, JIM);
        const { credentialID } = await registerPasskey(jim.token);
        const victimSession = await (0, auth_1.login)(app, VICTIM);
        const ids = (res) => res.body.data.map((c) => c.credentialID);
        const jimRes = await listCredentials(jim.token);
        const victimRes = await listCredentials(victimSession.token);
        strict_1.default.equal(jimRes.status, 200);
        strict_1.default.ok(ids(jimRes).includes(credentialID));
        strict_1.default.ok(!ids(jimRes).includes(victim.credentialID));
        strict_1.default.equal(victimRes.status, 200);
        strict_1.default.ok(ids(victimRes).includes(victim.credentialID));
        strict_1.default.ok(!ids(victimRes).includes(credentialID));
    });
    void (0, node_test_1.it)('DELETE returns 401 when not logged in', async () => {
        const res = await (0, supertest_1.default)(app).delete('/rest/passkey/credentials/1');
        strict_1.default.equal(res.status, 401);
    });
    void (0, node_test_1.it)('DELETE removes a passkey of the logged-in user', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const { credentialID } = await registerPasskey(token);
        const row = await passkey_2.PasskeyModel.findOne({ where: { credentialID } });
        const res = await (0, supertest_1.default)(app)
            .delete(`/rest/passkey/credentials/${row?.id}`)
            .set(bearer(token));
        strict_1.default.equal(res.status, 204);
        strict_1.default.equal(await passkey_2.PasskeyModel.count({ where: { credentialID } }), 0);
    });
    void (0, node_test_1.it)('DELETE does not remove a passkey of another user', async () => {
        const { token } = await (0, auth_1.login)(app, JIM);
        const row = await passkey_2.PasskeyModel.findOne({ where: { credentialID: victim.credentialID } });
        const res = await (0, supertest_1.default)(app)
            .delete(`/rest/passkey/credentials/${row?.id}`)
            .set(bearer(token));
        strict_1.default.equal(res.status, 204);
        strict_1.default.equal(await passkey_2.PasskeyModel.count({ where: { credentialID: victim.credentialID } }), 1);
    });
});
void (0, node_test_1.describe)('/rest/passkey', () => {
    void (0, node_test_1.it)('returns 401 for a valid token that does not belong to a logged-in user', async () => {
        const headers = bearer(security.authorize());
        const responses = {
            'GET register-options': await (0, supertest_1.default)(app).get('/rest/passkey/register-options').set(headers),
            'POST register-verify': await (0, supertest_1.default)(app).post('/rest/passkey/register-verify').set(headers).send({}),
            'GET credentials': await (0, supertest_1.default)(app).get('/rest/passkey/credentials').set(headers),
            'DELETE credentials': await (0, supertest_1.default)(app).delete('/rest/passkey/credentials/1').set(headers)
        };
        for (const [name, res] of Object.entries(responses)) {
            strict_1.default.equal(res.status, 401, name);
        }
    });
});
void (0, node_test_1.describe)('/.well-known/passkey-endpoints', () => {
    void (0, node_test_1.it)('GET returns enroll and manage URLs for the requesting origin', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/.well-known/passkey-endpoints')
            .set({ host: 'shop.example.com:8080', 'x-forwarded-proto': 'https' });
        strict_1.default.equal(res.status, 200);
        strict_1.default.match(res.headers['content-type'], /application\/json/);
        strict_1.default.deepEqual(res.body, {
            enroll: 'https://shop.example.com:8080/#/privacy-security/passkeys',
            manage: 'https://shop.example.com:8080/#/privacy-security/passkeys'
        });
    });
});
//# sourceMappingURL=passkey.test.js.map
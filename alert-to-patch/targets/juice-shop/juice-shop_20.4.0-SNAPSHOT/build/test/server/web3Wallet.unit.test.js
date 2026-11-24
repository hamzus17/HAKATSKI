"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const web3Wallet_1 = require("../../routes/web3Wallet");
void (0, node_test_1.describe)('web3Wallet', () => {
    let req;
    let res;
    (0, node_test_1.beforeEach)(() => {
        req = { body: { walletAddress: '0x1234567890123456789012345678901234567890' } };
        res = {
            status: node_test_1.mock.fn(() => res),
            json: node_test_1.mock.fn()
        };
    });
    void (0, node_test_1.it)('creates event listener on first call and returns 200', async () => {
        await (0, web3Wallet_1.contractExploitListener)()(req, res);
        strict_1.default.equal(res.status.mock.calls.length, 1);
        strict_1.default.equal(res.status.mock.calls[0].arguments[0], 200);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { success: true, message: 'Event Listener Created' });
    });
    void (0, node_test_1.it)('returns 200 when event listener is already created', async () => {
        req.body.walletAddress = '0x0987654321098765432109876543210987654321';
        await (0, web3Wallet_1.contractExploitListener)()(req, res);
        strict_1.default.equal(res.status.mock.calls.length, 1);
        strict_1.default.equal(res.status.mock.calls[0].arguments[0], 200);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { success: true, message: 'Event Listener Created' });
    });
    void (0, node_test_1.it)('returns 500 when an unexpected error occurs', async () => {
        const errorRes = {
            status: node_test_1.mock.fn(() => errorRes),
            json: node_test_1.mock.fn()
        };
        // Make json throw on the first call to trigger the catch block
        errorRes.json.mock.mockImplementationOnce(() => {
            throw new Error('Test error');
        });
        await (0, web3Wallet_1.contractExploitListener)()(req, errorRes);
        strict_1.default.equal(errorRes.status.mock.calls.length, 2);
        strict_1.default.equal(errorRes.status.mock.calls[1].arguments[0], 500);
    });
});
//# sourceMappingURL=web3Wallet.unit.test.js.map
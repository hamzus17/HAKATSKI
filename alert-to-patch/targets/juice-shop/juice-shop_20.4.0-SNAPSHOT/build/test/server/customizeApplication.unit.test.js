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
const config = require('config');
const { retrieveCustomFile } = require('../../lib/startup/customizeApplication');
void (0, node_test_1.describe)('customizeApplication', () => {
    void (0, node_test_1.it)('should not return a filename when a custom file download fails', async (t) => {
        t.mock.method(config, 'get', () => 'https://example.com/avatar.png');
        const file = await retrieveCustomFile('application.chatBot.avatar', 'frontend/dist/frontend/assets/public/images', async () => false);
        strict_1.default.equal(file, undefined);
    });
});
//# sourceMappingURL=customizeApplication.unit.test.js.map
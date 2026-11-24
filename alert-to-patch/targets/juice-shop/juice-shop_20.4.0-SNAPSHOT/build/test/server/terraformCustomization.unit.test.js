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
const config_1 = __importDefault(require("config"));
const terraformCustomization_1 = require("../../lib/terraformCustomization");
void (0, node_test_1.describe)('terraformCustomization', () => {
    void (0, node_test_1.it)('should customize Terraform resource names for a custom application name', (t) => {
        t.mock.method(config_1.default, 'get', () => 'Cider & Sons');
        const content = (0, terraformCustomization_1.customizeTerraformContent)('resource "juice_shop" "juice-shop" {}');
        strict_1.default.equal(content, 'resource "cider_sons" "cider-sons" {}');
    });
    void (0, node_test_1.it)('should leave Terraform content unchanged for the default application name', (t) => {
        t.mock.method(config_1.default, 'get', () => 'OWASP Juice Shop');
        const content = (0, terraformCustomization_1.customizeTerraformContent)('resource "juice_shop" "juice-shop" {}');
        strict_1.default.equal(content, 'resource "juice_shop" "juice-shop" {}');
    });
});
//# sourceMappingURL=terraformCustomization.unit.test.js.map
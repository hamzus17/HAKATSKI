"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customizeTerraformContent = void 0;
const config_1 = __importDefault(require("config"));
const slugify = (name) => {
    return name.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
};
const customizeTerraformContent = (content) => {
    const appName = config_1.default.get('application.name');
    if (!appName || appName === 'OWASP Juice Shop') {
        return content;
    }
    const slugName = slugify(appName);
    const snakeName = slugName.replace(/-/g, '_');
    return content
        .replace(/juice-shop/g, slugName)
        .replace(/juice_shop/g, snakeName);
};
exports.customizeTerraformContent = customizeTerraformContent;
//# sourceMappingURL=terraformCustomization.js.map
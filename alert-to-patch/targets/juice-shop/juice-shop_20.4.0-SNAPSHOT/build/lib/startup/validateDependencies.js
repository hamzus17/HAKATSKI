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
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const semver_1 = __importDefault(require("semver"));
const colors_1 = __importDefault(require("../colors"));
const utils = __importStar(require("../utils"));
const logger_1 = __importDefault(require("../logger"));
const findDependencyErrors = async (packageDir) => {
    const errors = [];
    const { dependencies = {} } = JSON.parse(await (0, promises_1.readFile)(node_path_1.default.join(packageDir, 'package.json'), 'utf8'));
    for (const [name, range] of Object.entries(dependencies)) {
        let installedVersion;
        try {
            installedVersion = JSON.parse(await (0, promises_1.readFile)(node_path_1.default.join(packageDir, 'node_modules', name, 'package.json'), 'utf8')).version;
        }
        catch {
            errors.push(`${name}: not installed!`);
            continue;
        }
        if (semver_1.default.validRange(range) && !semver_1.default.satisfies(installedVersion, range, { includePrerelease: true })) {
            errors.push(`${name}: installed: ${installedVersion}, expected: ${range}`);
        }
    }
    return errors;
};
const validateDependencies = async ({ packageDir = '.' } = {}) => {
    let errors;
    try {
        errors = await findDependencyErrors(packageDir);
    }
    catch (err) {
        logger_1.default.warn(`Dependencies in ${colors_1.default.bold(packageDir + '/package.json')} could not be checked due to "${utils.getErrorMessage(err)}" error (${colors_1.default.red('ERROR')})`);
        logger_1.default.warn(`Dependencies in ${colors_1.default.bold(packageDir + '/package.json')} are not rightly satisfied (${colors_1.default.red('ERROR')})`);
        return false;
    }
    if (errors.length === 0) {
        logger_1.default.info(`All dependencies in ${colors_1.default.bold(packageDir + '/package.json')} are satisfied (${colors_1.default.green('SUCCESS')})`);
        return true;
    }
    else {
        logger_1.default.warn(`Dependencies in ${colors_1.default.bold(packageDir + '/package.json')} are not rightly satisfied (${colors_1.default.red('ERROR')})`);
        for (const err of errors) {
            logger_1.default.warn(err);
        }
        return false;
    }
};
exports.default = validateDependencies;
//# sourceMappingURL=validateDependencies.js.map
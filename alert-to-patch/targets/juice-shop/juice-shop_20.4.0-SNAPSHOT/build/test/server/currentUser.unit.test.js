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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const currentUser_1 = require("../../routes/currentUser");
const insecurity_1 = require("../../lib/insecurity");
const security = __importStar(require("../../lib/insecurity"));
const datacache_1 = require("../../data/datacache");
void (0, node_test_1.describe)('currentUser', () => {
    let req;
    let res;
    let save;
    (0, node_test_1.beforeEach)(() => {
        req = { cookies: {}, query: {} };
        res = { json: node_test_1.mock.fn(), jsonp: node_test_1.mock.fn() };
        save = () => ({
            then() { }
        });
        datacache_1.challenges.passwordHashLeakChallenge = { solved: false, save };
        datacache_1.challenges.emailLeakChallenge = { solved: false, save };
    });
    void (0, node_test_1.it)('should return neither ID nor email if no cookie was present in the request headers', () => {
        req.cookies.token = '';
        (0, currentUser_1.retrieveLoggedInUser)()(req, res);
        strict_1.default.equal(res.json.mock.calls.length, 1);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { user: { id: undefined, email: undefined, lastLoginIp: undefined, profileImage: undefined } });
    });
    void (0, node_test_1.it)('should return ID and email of user belonging to cookie from the request', () => {
        req.cookies.token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJkYXRhIjp7ImlkIjoxLCJlbWFpbCI6ImFkbWluQGp1aWNlLXNoLm9wIiwibGFzdExvZ2luSXAiOiIwLjAuMC4wIiwicHJvZmlsZUltYWdlIjoiZGVmYXVsdC5zdmcifSwiaWF0IjoxNTgyMjIyMzY0fQ.CHiFQieZudYlrd1o8Ih-Izv7XY_WZupt8Our-CP9HqsczyEKqrWC7wWguOgVuSGDN_S3mP4FyuEFN8l60aAhVsUbqzFetvJkFwe5nKVhc9dHuen6cujQLMcTlHLKassOSDP41Q-MkKWcUOQu0xUkTMfEq2hPMHpMosDb4benzH0';
        req.query.callback = undefined;
        insecurity_1.authenticatedUsers.put('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJkYXRhIjp7ImlkIjoxLCJlbWFpbCI6ImFkbWluQGp1aWNlLXNoLm9wIiwibGFzdExvZ2luSXAiOiIwLjAuMC4wIiwicHJvZmlsZUltYWdlIjoiZGVmYXVsdC5zdmcifSwiaWF0IjoxNTgyMjIyMzY0fQ.CHiFQieZudYlrd1o8Ih-Izv7XY_WZupt8Our-CP9HqsczyEKqrWC7wWguOgVuSGDN_S3mP4FyuEFN8l60aAhVsUbqzFetvJkFwe5nKVhc9dHuen6cujQLMcTlHLKassOSDP41Q-MkKWcUOQu0xUkTMfEq2hPMHpMosDb4benzH0', { data: { id: 1, email: 'admin@juice-sh.op', lastLoginIp: '0.0.0.0', profileImage: '/assets/public/images/uploads/default.svg' } });
        (0, currentUser_1.retrieveLoggedInUser)()(req, res);
        strict_1.default.equal(res.json.mock.calls.length, 1);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { user: { id: 1, email: 'admin@juice-sh.op', lastLoginIp: '0.0.0.0', profileImage: '/assets/public/images/uploads/default.svg' } });
    });
    void (0, node_test_1.it)('should filter specific requested fields and solve passwordHashLeakChallenge if password is leaked', () => {
        const token = security.authorize({ data: { id: 2, email: 'user@juice-sh.op', password: 'hashedpassword' } });
        req.cookies.token = token;
        req.query.fields = 'email, password';
        insecurity_1.authenticatedUsers.put(token, {
            data: { id: 2, email: 'user@juice-sh.op', password: 'hashedpassword' }
        });
        (0, currentUser_1.retrieveLoggedInUser)()(req, res);
        strict_1.default.equal(res.json.mock.calls.length, 1);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { user: { email: 'user@juice-sh.op', password: 'hashedpassword' } });
        strict_1.default.equal(datacache_1.challenges.passwordHashLeakChallenge.solved, true);
    });
    void (0, node_test_1.it)('should respond with jsonp and solve emailLeakChallenge when callback query param is present', () => {
        const token = security.authorize({ data: { id: 3, email: 'leak@juice-sh.op' } });
        req.cookies.token = token;
        req.query.callback = 'angular.callbacks._0';
        insecurity_1.authenticatedUsers.put(token, {
            data: { id: 3, email: 'leak@juice-sh.op' }
        });
        (0, currentUser_1.retrieveLoggedInUser)()(req, res);
        strict_1.default.equal(res.jsonp.mock.calls.length, 1);
        strict_1.default.equal(datacache_1.challenges.emailLeakChallenge.solved, true);
    });
    void (0, node_test_1.it)('should return empty user on exception in try block', () => {
        const brokenReq = {
            get cookies() {
                throw new Error('Broken cookies');
            },
            query: {}
        };
        (0, currentUser_1.retrieveLoggedInUser)()(brokenReq, res);
        strict_1.default.equal(res.json.mock.calls.length, 1);
        strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], { user: { id: undefined, email: undefined, lastLoginIp: undefined, profileImage: undefined } });
    });
});
//# sourceMappingURL=currentUser.unit.test.js.map
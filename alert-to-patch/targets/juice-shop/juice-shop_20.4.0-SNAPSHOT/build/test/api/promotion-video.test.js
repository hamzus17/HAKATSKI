"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const supertest_1 = __importDefault(require("supertest"));
const config_1 = __importDefault(require("config"));
const setup_1 = require("./helpers/setup");
let app;
const subtitlePath = node_path_1.default.resolve('frontend/dist/frontend/assets/public/videos/owasp_promo.vtt');
const videoPath = node_path_1.default.resolve('frontend/dist/frontend/assets/public/videos/owasp_promo.mp4');
let createdSubtitleFile = false;
(0, node_test_1.before)(async () => {
    if (!node_fs_1.default.existsSync(subtitlePath)) {
        node_fs_1.default.copyFileSync('data/static/owasp_promo.vtt', subtitlePath);
        createdSubtitleFile = true;
    }
    const result = await (0, setup_1.createTestApp)();
    app = result.app;
}, { timeout: 60000 });
(0, node_test_1.after)(() => {
    if (createdSubtitleFile) {
        node_fs_1.default.unlinkSync(subtitlePath);
    }
});
void (0, node_test_1.describe)('/promotion', () => {
    void (0, node_test_1.it)('GET promotion video page is publicly accessible', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/promotion');
        strict_1.default.equal(res.status, 200);
    });
    void (0, node_test_1.it)('GET promotion video page contains embedded video', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/promotion');
        strict_1.default.ok(res.headers['content-type']?.includes('text/html'));
        strict_1.default.ok(res.text.includes('<source src="./video" type="video/mp4">'));
    });
    void (0, node_test_1.it)('GET promotion video page contains subtitles as <script>', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/promotion');
        strict_1.default.ok(res.headers['content-type']?.includes('text/html'));
        strict_1.default.ok(res.text.includes('<script id="subtitle" type="text/vtt" data-label="English" data-lang="en">'));
    });
});
void (0, node_test_1.describe)('/video', () => {
    void (0, node_test_1.it)('GET promotion video is publicly accessible', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/video');
        strict_1.default.equal(res.status, 200);
        strict_1.default.ok(res.headers['content-type']?.includes('video/mp4'));
    });
    void (0, node_test_1.it)('GET promotion video supports byte ranges', async () => {
        const videoFileSize = node_fs_1.default.statSync(videoPath).size;
        const res = await (0, supertest_1.default)(app)
            .get('/video')
            .set('Range', 'bytes=0-15');
        strict_1.default.equal(res.status, 206);
        strict_1.default.equal(res.headers['accept-ranges'], 'bytes');
        strict_1.default.equal(res.headers['content-range'], `bytes 0-15/${videoFileSize}`);
        strict_1.default.equal(res.headers['content-length'], '16');
        strict_1.default.equal(res.body.length, 16);
    });
    void (0, node_test_1.it)('GET promotion video supports open-ended byte ranges', async () => {
        const videoFileSize = node_fs_1.default.statSync(videoPath).size;
        const start = videoFileSize - 16;
        const res = await (0, supertest_1.default)(app)
            .get('/video')
            .set('Range', `bytes=${start}-`);
        strict_1.default.equal(res.status, 206);
        strict_1.default.equal(res.headers['content-range'], `bytes ${start}-${videoFileSize - 1}/${videoFileSize}`);
        strict_1.default.equal(res.headers['content-length'], '16');
        strict_1.default.equal(res.body.length, 16);
    });
    void (0, node_test_1.it)('GET promotion video uses the default video when configuration value is null', async (t) => {
        const originalGet = config_1.default.get.bind(config_1.default);
        t.mock.method(config_1.default, 'get', (key) => {
            return key === 'application.promotion.video' ? null : originalGet(key);
        });
        const res = await (0, supertest_1.default)(app).get('/video');
        strict_1.default.equal(res.status, 200);
        strict_1.default.ok(res.headers['content-type']?.includes('video/mp4'));
        strict_1.default.equal(res.headers['content-length'], node_fs_1.default.statSync(videoPath).size.toString());
    });
});
//# sourceMappingURL=promotion-video.test.js.map
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
exports.retrieveCustomFile = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const config_1 = __importDefault(require("config"));
const utils = __importStar(require("../utils"));
const customizeApplication = async () => {
    if (config_1.default.get('application.name')) {
        customizeTitle();
    }
    if (config_1.default.get('application.logo')) {
        void customizeLogo();
    }
    if (config_1.default.get('application.favicon')) {
        void customizeFavicon();
    }
    if (config_1.default.get('application.theme')) {
        customizeTheme();
    }
    if (config_1.default.get('application.cookieConsent')) {
        customizeCookieConsentBanner();
    }
    if (config_1.default.get('application.promotion')) {
        void customizePromotionVideo();
        void customizePromotionSubtitles();
    }
    if (config_1.default.get('hackingInstructor')) {
        void customizeHackingInstructorAvatar();
    }
    if (config_1.default.get('application.chatBot')) {
        void customizeChatbotAvatar();
    }
};
const customizeLogo = async () => {
    await (0, exports.retrieveCustomFile)('application.logo', 'frontend/dist/frontend/assets/public/images');
};
const customizeChatbotAvatar = async () => {
    const avatarImage = await (0, exports.retrieveCustomFile)('application.chatBot.avatar', 'frontend/dist/frontend/assets/public/images');
    if (avatarImage) {
        node_fs_1.default.copyFileSync('frontend/dist/frontend/assets/public/images/' + avatarImage, 'frontend/dist/frontend/assets/public/images/chatbotAvatar.png');
    }
};
const customizeHackingInstructorAvatar = async () => {
    const avatarImage = await (0, exports.retrieveCustomFile)('hackingInstructor.avatarImage', 'frontend/dist/frontend/assets/public/images');
    if (avatarImage) {
        node_fs_1.default.copyFileSync('frontend/dist/frontend/assets/public/images/' + avatarImage, 'frontend/dist/frontend/assets/public/images/hackingInstructor.png');
    }
};
const customizeFavicon = async () => {
    const favicon = await (0, exports.retrieveCustomFile)('application.favicon', 'frontend/dist/frontend/assets/public');
    if (!favicon) {
        return;
    }
    utils.replaceInFile('frontend/dist/frontend/index.html', /type="image\/x-icon" href="assets\/public\/.*"/, `type="image/x-icon" href="assets/public/${favicon}"`);
};
const customizePromotionVideo = async () => {
    await (0, exports.retrieveCustomFile)('application.promotion.video', 'frontend/dist/frontend/assets/public/videos');
};
const customizePromotionSubtitles = async () => {
    await (0, exports.retrieveCustomFile)('application.promotion.subtitles', 'frontend/dist/frontend/assets/public/videos');
};
const retrieveCustomFile = async (sourceProperty, destinationFolder, downloadFile = utils.downloadToFile) => {
    let file = config_1.default.get(sourceProperty);
    if (utils.isUrl(file)) {
        const filePath = file;
        file = utils.extractFilename(file);
        const downloaded = await downloadFile(filePath, destinationFolder + '/' + file);
        if (!downloaded) {
            return undefined;
        }
    }
    return file;
};
exports.retrieveCustomFile = retrieveCustomFile;
const customizeTitle = () => {
    const title = `<title>${config_1.default.get('application.name')}</title>`;
    utils.replaceInFile('frontend/dist/frontend/index.html', /<title>.*<\/title>/, title);
};
const customizeTheme = () => {
    const bodyClass = '"' + config_1.default.get('application.theme') + '-theme"';
    utils.replaceInFile('frontend/dist/frontend/index.html', /".*-theme"/, bodyClass);
};
const customizeCookieConsentBanner = () => {
    const contentProperty = '"content": { "message": "' + config_1.default.get('application.cookieConsent.message') + '", "dismiss": "' + config_1.default.get('application.cookieConsent.dismissText') + '", "link": "' + config_1.default.get('application.cookieConsent.linkText') + '", "href": "' + config_1.default.get('application.cookieConsent.linkUrl') + '" }';
    utils.replaceInFile('frontend/dist/frontend/index.html', /"content": { "message": ".*", "dismiss": ".*", "link": ".*", "href": ".*" }/, contentProperty);
};
exports.default = customizeApplication;
//# sourceMappingURL=customizeApplication.js.map
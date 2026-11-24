"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_util_1 = require("node:util");
const style = (format) => (text) => (0, node_util_1.styleText)(format, String(text));
exports.default = {
    bold: style('bold'),
    italic: style('italic'),
    red: style('red'),
    green: style('green'),
    yellow: style('yellow'),
    cyan: style('cyan'),
    grey: style('gray')
};
//# sourceMappingURL=colors.js.map
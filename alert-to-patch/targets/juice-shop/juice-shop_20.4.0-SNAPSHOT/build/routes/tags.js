"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTagGroups = getTagGroups;
const staticData_1 = require("../data/staticData");
function getTagGroups() {
    return async (_req, res, next) => {
        try {
            const tagGroups = await (0, staticData_1.loadStaticTagGroupsData)();
            res.json(tagGroups);
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=tags.js.map
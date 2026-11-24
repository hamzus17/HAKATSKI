"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasskeyModelInit = exports.PasskeyModel = void 0;
const sequelize_1 = require("sequelize");
class Passkey extends sequelize_1.Model {
}
exports.PasskeyModel = Passkey;
const PasskeyModelInit = (sequelize) => {
    Passkey.init({
        id: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        UserId: {
            type: sequelize_1.DataTypes.INTEGER
        },
        credentialID: {
            type: sequelize_1.DataTypes.STRING
        },
        publicKey: {
            type: sequelize_1.DataTypes.STRING
        },
        counter: {
            type: sequelize_1.DataTypes.INTEGER,
            defaultValue: 0
        },
        transports: {
            type: sequelize_1.DataTypes.STRING,
            defaultValue: ''
        },
        aaguid: {
            type: sequelize_1.DataTypes.STRING,
            defaultValue: '00000000-0000-0000-0000-000000000000'
        },
        createdAt: sequelize_1.DataTypes.DATE
    }, {
        tableName: 'Passkeys',
        sequelize
    });
};
exports.PasskeyModelInit = PasskeyModelInit;
//# sourceMappingURL=passkey.js.map
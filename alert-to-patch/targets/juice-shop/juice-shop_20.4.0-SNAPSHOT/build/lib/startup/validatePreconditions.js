"use strict";
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfLlmModelAvailable = exports.isOllamaUrl = exports.checkIfRequiredFilePatternExists = exports.checkIfRequiredFileExists = exports.checkIfPortIsAvailable = exports.checkIfDomainReachable = exports.checkIfEnvironmentVariableExists = exports.checkIfRunningOnSupportedCPU = exports.checkIfRunningOnSupportedOS = exports.checkIfRunningOnSupportedNodeVersion = exports.preconditionsReady = exports.preconditionResults = exports.domainDependencies = exports.variableDependencies = void 0;
const package_json_1 = __importDefault(require("../../package.json"));
const config_1 = __importDefault(require("config"));
const logger_1 = __importDefault(require("../logger"));
const node_path_1 = __importDefault(require("node:path"));
const colors_1 = __importDefault(require("../colors"));
const promises_1 = require("node:fs/promises");
const node_process_1 = __importDefault(require("node:process"));
const semver_1 = __importDefault(require("semver"));
const node_net_1 = __importDefault(require("node:net"));
const validateDependencies_1 = __importDefault(require("./validateDependencies"));
exports.variableDependencies = {
    ALCHEMY_API_KEY: {
        dependency: 'Alchemy API Key',
        documentation: 'https://howto-web3.owasp-juice.shop',
        dependentChallenges: ['"Mint the Honey Pot" challenge', '"Wallet Depletion" challenge']
    }
};
exports.domainDependencies = {
    'https://www.alchemy.com/': {
        dependency: 'Alchemy API',
        documentation: 'https://howto-web3.owasp-juice.shop',
        dependentChallenges: ['"Mint the Honey Pot" challenge', '"Wallet Depletion" challenge']
    },
    [config_1.default.get('application.chatBot.llmApiUrl')]: {
        dependency: 'LLM API',
        documentation: 'https://howto-llm.owasp-juice.shop',
        dependentChallenges: ['"Chatbot Prompt Injection" challenge', '"Greedy Chatbot Manipulation" challenge', '"AI Debugging" challenge', '"System Prompt Extraction" challenge']
    }
};
exports.preconditionResults = {};
let resolvePreconditionsReady;
exports.preconditionsReady = new Promise((resolve) => {
    resolvePreconditionsReady = resolve;
});
const validatePreconditions = async ({ exitOnFailure = true } = {}) => {
    let success = true;
    success = (0, exports.checkIfRunningOnSupportedNodeVersion)(node_process_1.default.version) && success;
    success = (0, exports.checkIfRunningOnSupportedOS)(node_process_1.default.platform) && success;
    success = (0, exports.checkIfRunningOnSupportedCPU)(node_process_1.default.arch) && success;
    const asyncResults = await Promise.all([
        (0, validateDependencies_1.default)(),
        (0, exports.checkIfRequiredFileExists)('build/server.js'),
        (0, exports.checkIfRequiredFileExists)('frontend/dist/frontend/index.html'),
        (0, exports.checkIfRequiredFileExists)('frontend/dist/frontend/styles.css'),
        (0, exports.checkIfRequiredFileExists)('frontend/dist/frontend/main.js'),
        (0, exports.checkIfRequiredFileExists)('frontend/dist/frontend/polyfills.js'),
        (0, exports.checkIfRequiredFilePatternExists)('frontend/dist/frontend', /^hacking-instructor-.+\.js$/),
        (0, exports.checkIfPortIsAvailable)(node_process_1.default.env.PORT ?? config_1.default.get('server.port'))
    ]);
    const asyncConditions = asyncResults.every(condition => condition);
    const alchemyDomainReachable = await (0, exports.checkIfDomainReachable)('https://www.alchemy.com/');
    const alchemyEnvVarExists = (0, exports.checkIfEnvironmentVariableExists)('ALCHEMY_API_KEY');
    exports.preconditionResults['https://www.alchemy.com/'] = alchemyDomainReachable;
    exports.preconditionResults.ALCHEMY_API_KEY = alchemyEnvVarExists;
    if (!alchemyDomainReachable || !alchemyEnvVarExists) {
        logger_1.default.info(`Check ${colors_1.default.bold('https://howto-web3.owasp-juice.shop')} for instructions on how to set up and configure the Alchemy API`);
    }
    const llmApiUrl = config_1.default.get('application.chatBot.llmApiUrl');
    const llmApiReachable = await (0, exports.checkIfDomainReachable)(llmApiUrl);
    let llmApiKeyEnvVarExists = true;
    let llmModelAvailable = true;
    exports.preconditionResults[llmApiUrl] = llmApiReachable;
    if (llmApiReachable) {
        const llmModel = config_1.default.get('application.chatBot.model');
        llmModelAvailable = await (0, exports.checkIfLlmModelAvailable)(llmApiUrl);
        exports.variableDependencies[llmModel] = {
            dependency: 'LLM Model',
            documentation: 'https://howto-llm.owasp-juice.shop',
            dependentChallenges: ['"Chatbot Prompt Injection" challenge', '"Greedy Chatbot Manipulation" challenge', '"AI Debugging" challenge', '"System Prompt Extraction" challenge']
        };
        exports.preconditionResults[llmModel] = llmModelAvailable;
        if (!(0, exports.isOllamaUrl)(llmApiUrl)) {
            exports.variableDependencies.LLM_API_KEY = {
                dependency: 'LLM API Key',
                documentation: 'https://howto-llm.owasp-juice.shop',
                dependentChallenges: ['"Chatbot Prompt Injection" challenge', '"Greedy Chatbot Manipulation" challenge', '"AI Debugging" challenge', '"System Prompt Extraction" challenge']
            };
            llmApiKeyEnvVarExists = (0, exports.checkIfEnvironmentVariableExists)('LLM_API_KEY');
            exports.preconditionResults.LLM_API_KEY = llmApiKeyEnvVarExists;
        }
    }
    if (!llmApiReachable || !llmApiKeyEnvVarExists || !llmModelAvailable) {
        logger_1.default.info(`Check ${colors_1.default.bold('https://howto-llm.owasp-juice.shop')} for instructions on how to set up and configure the LLM API`);
    }
    resolvePreconditionsReady();
    if ((!success || !asyncConditions) && exitOnFailure) {
        logger_1.default.error(colors_1.default.red('Exiting due to unsatisfied precondition!'));
        node_process_1.default.exit(1);
    }
    return success;
};
const checkIfRunningOnSupportedNodeVersion = (runningVersion) => {
    const supportedVersion = package_json_1.default.engines.node;
    const effectiveVersionRange = semver_1.default.validRange(supportedVersion);
    if (!effectiveVersionRange) {
        logger_1.default.warn(`Invalid Node.js version range ${colors_1.default.bold(supportedVersion)} in package.json (${colors_1.default.red('ERROR')})`);
        return false;
    }
    if (!semver_1.default.satisfies(runningVersion, effectiveVersionRange)) {
        logger_1.default.warn(`Detected Node version ${colors_1.default.bold(runningVersion)} is not in the supported version range of ${supportedVersion} (${colors_1.default.red('ERROR')})`);
        return false;
    }
    logger_1.default.info(`Detected Node.js version ${colors_1.default.bold(runningVersion)} (${colors_1.default.green('SUCCESS')})`);
    return true;
};
exports.checkIfRunningOnSupportedNodeVersion = checkIfRunningOnSupportedNodeVersion;
const checkIfRunningOnSupportedOS = (runningOS) => {
    const supportedOS = package_json_1.default.os;
    if (!supportedOS.includes(runningOS)) {
        logger_1.default.warn(`Detected OS ${colors_1.default.bold(runningOS)} is not in the list of supported platforms ${supportedOS.toString()} (${colors_1.default.red('ERROR')})`);
        return false;
    }
    logger_1.default.info(`Detected OS ${colors_1.default.bold(runningOS)} (${colors_1.default.green('SUCCESS')})`);
    return true;
};
exports.checkIfRunningOnSupportedOS = checkIfRunningOnSupportedOS;
const checkIfRunningOnSupportedCPU = (runningArch) => {
    const supportedArch = package_json_1.default.cpu;
    if (!supportedArch.includes(runningArch)) {
        logger_1.default.warn(`Detected CPU ${colors_1.default.bold(runningArch)} is not in the list of supported architectures ${supportedArch.toString()} (${colors_1.default.red('ERROR')})`);
        return false;
    }
    logger_1.default.info(`Detected CPU ${colors_1.default.bold(runningArch)} (${colors_1.default.green('SUCCESS')})`);
    return true;
};
exports.checkIfRunningOnSupportedCPU = checkIfRunningOnSupportedCPU;
const checkIfEnvironmentVariableExists = (varName) => {
    if (node_process_1.default.env[varName]) {
        logger_1.default.info(`Environment variable ${colors_1.default.bold(varName)} is present (${colors_1.default.green('SUCCESS')})`);
        return true;
    }
    logger_1.default.warn(`Environment variable ${colors_1.default.bold(varName)} is not present (${colors_1.default.yellow('WARNING')})`);
    if (exports.variableDependencies[varName]) {
        exports.variableDependencies[varName].dependentChallenges.forEach((dependency) => {
            logger_1.default.warn(`${colors_1.default.italic(dependency)} will not work as intended without a valid ${colors_1.default.bold(varName)}`);
        });
    }
    return false;
};
exports.checkIfEnvironmentVariableExists = checkIfEnvironmentVariableExists;
const checkIfDomainReachable = async (domain) => {
    try {
        await fetch(domain, { signal: AbortSignal.timeout(5000) });
        logger_1.default.info(`Domain ${colors_1.default.bold(domain)} is reachable (${colors_1.default.green('SUCCESS')})`);
        return true;
    }
    catch {
        logger_1.default.warn(`Domain ${colors_1.default.bold(domain)} is not reachable (${colors_1.default.yellow('WARNING')})`);
        exports.domainDependencies[domain].dependentChallenges.forEach((dependency) => {
            logger_1.default.warn(`${colors_1.default.italic(dependency)} will not work as intended without access to ${colors_1.default.bold(domain)}`);
        });
        return false;
    }
};
exports.checkIfDomainReachable = checkIfDomainReachable;
const checkIfPortIsAvailable = async (port) => {
    const portNumber = parseInt(port.toString());
    const isOpen = await new Promise((resolve) => {
        const socket = new node_net_1.default.Socket();
        const done = (open) => {
            socket.destroy();
            resolve(open);
        };
        socket.setTimeout(400);
        socket.once('connect', () => { done(true); });
        socket.once('timeout', () => { done(false); });
        socket.once('error', () => { done(false); });
        socket.connect(portNumber, '127.0.0.1');
    });
    if (isOpen) {
        logger_1.default.warn(`Port ${colors_1.default.bold(port.toString())} is in use (${colors_1.default.red('ERROR')})`);
        return false;
    }
    logger_1.default.info(`Port ${colors_1.default.bold(port.toString())} is available (${colors_1.default.green('SUCCESS')})`);
    return true;
};
exports.checkIfPortIsAvailable = checkIfPortIsAvailable;
const checkIfRequiredFileExists = async (pathRelativeToProjectRoot) => {
    const fileName = node_path_1.default.basename(pathRelativeToProjectRoot);
    return await (0, promises_1.access)(node_path_1.default.resolve(pathRelativeToProjectRoot)).then(() => {
        logger_1.default.info(`Required file ${colors_1.default.bold(fileName)} is present (${colors_1.default.green('SUCCESS')})`);
        return true;
    }).catch(() => {
        logger_1.default.warn(`Required file ${colors_1.default.bold(fileName)} is missing (${colors_1.default.red('ERROR')})`);
        return false;
    });
};
exports.checkIfRequiredFileExists = checkIfRequiredFileExists;
const checkIfRequiredFilePatternExists = async (directory, pattern) => {
    try {
        const files = await (0, promises_1.readdir)(node_path_1.default.resolve(directory));
        const match = files.find(file => pattern.test(file));
        if (match) {
            logger_1.default.info(`Required file matching ${colors_1.default.bold(String(pattern))} is present (${colors_1.default.green('SUCCESS')})`);
            return true;
        }
        logger_1.default.warn(`Required file matching ${colors_1.default.bold(String(pattern))} is missing (${colors_1.default.red('ERROR')})`);
        return false;
    }
    catch {
        logger_1.default.warn(`Required file matching ${colors_1.default.bold(String(pattern))} is missing (${colors_1.default.red('ERROR')})`);
        return false;
    }
};
exports.checkIfRequiredFilePatternExists = checkIfRequiredFilePatternExists;
const isOllamaUrl = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.port === '11434' || parsed.hostname === 'ollama' || parsed.pathname.startsWith('/ollama');
    }
    catch {
        return false;
    }
};
exports.isOllamaUrl = isOllamaUrl;
const checkIfLlmModelAvailable = async (llmApiUrl) => {
    const model = config_1.default.get('application.chatBot.model');
    try {
        const headers = {};
        if (node_process_1.default.env.LLM_API_KEY) {
            headers.Authorization = `Bearer ${node_process_1.default.env.LLM_API_KEY}`;
        }
        const response = await fetch(`${llmApiUrl}/models`, {
            headers,
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok)
            return false;
        const body = await response.json();
        const availableModels = (body.data ?? []).map((m) => m.id);
        const modelFound = availableModels.some((available) => available === model || available.startsWith(`${model}:`) || model.startsWith(`${available}:`));
        if (modelFound) {
            logger_1.default.info(`LLM model ${colors_1.default.bold(model)} is available (${colors_1.default.green('SUCCESS')})`);
            return true;
        }
        else {
            logger_1.default.warn(`LLM model ${colors_1.default.bold(model)} is not available (${colors_1.default.yellow('WARNING')})`);
            if ((0, exports.isOllamaUrl)(llmApiUrl)) {
                let pullModelMessage = `Pull the model with: ${colors_1.default.bold(`ollama pull ${model}`)}`;
                if (availableModels.length > 0) {
                    pullModelMessage += ` or configure an available model: ${colors_1.default.bold(availableModels.join(', '))}`;
                }
                logger_1.default.info(pullModelMessage);
            }
            return false;
        }
    }
    catch {
        logger_1.default.warn(`Could not verify LLM model ${colors_1.default.bold(model)} availability (${colors_1.default.yellow('WARNING')})`);
        return false;
    }
};
exports.checkIfLlmModelAvailable = checkIfLlmModelAvailable;
exports.default = validatePreconditions;
//# sourceMappingURL=validatePreconditions.js.map
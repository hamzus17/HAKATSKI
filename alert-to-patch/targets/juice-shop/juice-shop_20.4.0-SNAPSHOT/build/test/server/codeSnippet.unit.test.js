"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const vulnCodeSnippet_1 = require("../../routes/vulnCodeSnippet");
const challenge_1 = require("../../models/challenge");
const datacache_1 = require("../../data/datacache");
void (0, node_test_1.describe)('vulnCodeSnippet', () => {
    let req;
    let res;
    let next;
    (0, node_test_1.beforeEach)(() => {
        req = { params: {}, body: {} };
        res = {
            status: node_test_1.mock.fn(() => res),
            json: node_test_1.mock.fn(),
            __: node_test_1.mock.fn((s) => s)
        };
        next = node_test_1.mock.fn();
        datacache_1.challenges.weakPasswordChallenge = { key: 'weakPasswordChallenge', name: 'Weak Password', codingChallengeStatus: 0 };
        node_test_1.mock.method(challenge_1.ChallengeModel, 'update', async () => [1]);
    });
    void (0, node_test_1.describe)('getVerdict', () => {
        void (0, node_test_1.it)('should assert single correctly selected vuln line as correct', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1], [], [1]), true);
        });
        void (0, node_test_1.it)('should assert multiple correctly selected vuln lines as correct in any order', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], [1, 2]), true);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], [2, 1]), true);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2, 3], [], [3, 1, 2]), true);
        });
        void (0, node_test_1.it)('should ignore selected neutral lines during correct assertion', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3, 4], [1, 2, 3]), true);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3, 4], [1, 2, 4]), true);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3, 4], [1, 2, 3, 4]), true);
        });
        void (0, node_test_1.it)('should assert missing vuln lines as wrong', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], [1]), false);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], [2]), false);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3], [2, 3]), false);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3], [1, 3]), false);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3, 4], [3, 4]), false);
        });
        void (0, node_test_1.it)('should assert additionally selected lines as wrong', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], [1, 2, 3]), false);
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [3], [1, 2, 3, 4]), false);
        });
        void (0, node_test_1.it)('should assert lack of selected lines as wrong', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([1, 2], [], []), false);
        });
        void (0, node_test_1.it)('should assert empty edge case as correct', () => {
            strict_1.default.equal((0, vulnCodeSnippet_1.getVerdict)([], [], []), true);
        });
    });
    void (0, node_test_1.describe)('retrieveCodeSnippet', () => {
        void (0, node_test_1.it)('returns null when challenge snippet does not exist', async () => {
            const result = await (0, vulnCodeSnippet_1.retrieveCodeSnippet)('unknownChallenge');
            strict_1.default.equal(result, null);
        });
        void (0, node_test_1.it)('returns snippet data when challenge snippet exists', async () => {
            const result = await (0, vulnCodeSnippet_1.retrieveCodeSnippet)('weakPasswordChallenge');
            strict_1.default.ok(result);
            strict_1.default.ok(typeof result?.snippet === 'string');
        });
    });
    void (0, node_test_1.describe)('retrieveChallengesWithCodeSnippet', () => {
        void (0, node_test_1.it)('returns array of challenges that have snippets', async () => {
            const challenges = await (0, vulnCodeSnippet_1.retrieveChallengesWithCodeSnippet)();
            strict_1.default.ok(Array.isArray(challenges));
            strict_1.default.ok(challenges.length > 0);
        });
    });
    void (0, node_test_1.describe)('serveCodeSnippet', () => {
        void (0, node_test_1.it)('returns 404 when snippet is not found', async () => {
            req.params.challenge = 'nonExistentChallenge';
            await (0, vulnCodeSnippet_1.serveCodeSnippet)()(req, res, next);
            strict_1.default.equal(res.status.mock.calls[0].arguments[0], 404);
            strict_1.default.deepEqual(res.json.mock.calls[0].arguments[0], {
                status: 'error',
                error: 'No code challenge for challenge key: nonExistentChallenge'
            });
        });
        void (0, node_test_1.it)('returns 200 with snippet content when snippet is found', async () => {
            req.params.challenge = 'weakPasswordChallenge';
            await (0, vulnCodeSnippet_1.serveCodeSnippet)()(req, res, next);
            strict_1.default.equal(res.status.mock.calls[0].arguments[0], 200);
            strict_1.default.ok(res.json.mock.calls[0].arguments[0].snippet);
        });
    });
    void (0, node_test_1.describe)('checkVulnLines', () => {
        void (0, node_test_1.it)('returns 404 when snippet for challenge key is not found', async () => {
            req.body.key = 'nonExistentKey';
            req.body.selectedLines = [1];
            await (0, vulnCodeSnippet_1.checkVulnLines)()(req, res, next);
            strict_1.default.equal(res.status.mock.calls[0].arguments[0], 404);
        });
        void (0, node_test_1.it)('returns verdict true when correct vuln lines are submitted for snippet', async () => {
            const snippetData = await (0, vulnCodeSnippet_1.retrieveCodeSnippet)('weakPasswordChallenge');
            req.body.key = 'weakPasswordChallenge';
            req.body.selectedLines = snippetData?.vulnLines;
            await (0, vulnCodeSnippet_1.checkVulnLines)()(req, res, next);
            strict_1.default.equal(res.status.mock.calls[0].arguments[0], 200);
            strict_1.default.equal(res.json.mock.calls[0].arguments[0].verdict, true);
        });
        void (0, node_test_1.it)('returns verdict false with hint when wrong lines are submitted', async () => {
            req.body.key = 'weakPasswordChallenge';
            req.body.selectedLines = [999];
            await (0, vulnCodeSnippet_1.checkVulnLines)()(req, res, next);
            strict_1.default.equal(res.status.mock.calls[0].arguments[0], 200);
            strict_1.default.equal(res.json.mock.calls[0].arguments[0].verdict, false);
        });
    });
});
//# sourceMappingURL=codeSnippet.unit.test.js.map
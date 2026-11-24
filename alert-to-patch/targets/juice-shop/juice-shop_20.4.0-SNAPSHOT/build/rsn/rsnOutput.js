"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSuccess = printSuccess;
exports.printChangeSummary = printChangeSummary;
exports.printChallengeDiff = printChallengeDiff;
exports.printUpdateInstructions = printUpdateInstructions;
const colors_1 = __importDefault(require("../lib/colors"));
function printSuccess() {
    console.log(colors_1.default.green(colors_1.default.bold('All codefix files match the locked state. No action required.')));
}
function printChangeSummary(count) {
    console.log(colors_1.default.red(colors_1.default.bold(`Refactoring Safety Net check failed: ${count} codefix file(s) are out of sync.`)));
    console.log('Your changes affect code inside a vuln-code-snippet block.');
    console.log('The diffs below show the codefix files as they will be shown in the coding challenges.');
    console.log('Update the corresponding codefix files in data/static/codefixes/ to match.\n');
}
function printChallengeDiff(diff) {
    const border = '='.repeat(60);
    console.log(colors_1.default.cyan(colors_1.default.bold(border)));
    console.log(colors_1.default.cyan(colors_1.default.bold(`  Challenge: ${diff.challengeName}`)));
    console.log(colors_1.default.cyan(colors_1.default.bold(`  File: ${diff.file}`)));
    if (diff.explanation) {
        console.log(colors_1.default.cyan(colors_1.default.bold('  Explanation: ')) + diff.explanation);
    }
    console.log(colors_1.default.cyan(colors_1.default.bold(border)));
    for (const line of diff.lines) {
        if (line.type === 'removed') {
            console.log(colors_1.default.red(line.content));
        }
        else if (line.type === 'added') {
            console.log(colors_1.default.green(line.content));
        }
        else {
            console.log(line.content);
        }
    }
    console.log('');
}
function printUpdateInstructions() {
    console.log('After fixing the codefix files, run ' + colors_1.default.bold('npm run rsn') + ' again to verify.');
    console.log('Only if diffs are intentional and codefixes are updated, lock the new state with ' + colors_1.default.bold('npm run rsn:update'));
}
//# sourceMappingURL=rsnOutput.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_DISCLAIMER = void 0;
exports.runGate1ProhibitedLanguage = runGate1ProhibitedLanguage;
exports.runGate2SourceCompleteness = runGate2SourceCompleteness;
exports.runGate3DisclaimerPresence = runGate3DisclaimerPresence;
exports.runAllGates = runAllGates;
const PROHIBITED_TERMS = [
    'buy', 'sell', 'invest', 'avoid', 'should invest',
    'will rise', 'will fall', 'will increase', 'will decrease',
    'expect to', 'likely to rise', 'likely to fall',
    'price target', 'target price', 'strong buy', 'strong sell',
    'outperform', 'underperform', 'you should', 'we recommend',
    'consider buying', 'consider selling'
];
const CANONICAL_DISCLAIMER = "This brief is AI-generated from publicly available data sources including NSE, BSE, SEBI, AMFI, and RBI. It is for informational purposes only. It is not financial advice. Do not make investment decisions based solely on this content. Market Story Engine is not a SEBI-registered investment adviser. Always verify data at the source before acting.";
exports.CANONICAL_DISCLAIMER = CANONICAL_DISCLAIMER;
function runGate1ProhibitedLanguage(brief) {
    const fullText = [
        brief.beginner.headline,
        brief.beginner.body,
        brief.beginner.key_takeaway,
        brief.expert.summary_line,
        ...brief.expert.anomalies
    ].join(' ').toLowerCase();
    // Multi-word phrases: exact substring match
    const multiWordTerms = [
        'should invest', 'will rise', 'will fall', 'will increase', 'will decrease',
        'expect to', 'likely to rise', 'likely to fall',
        'price target', 'target price', 'strong buy', 'strong sell',
        'you should', 'we recommend',
        'consider buying', 'consider selling'
    ];
    // Single words: word-boundary match to avoid false positives
    // e.g. "selling" in "net selling activity" is descriptive, but "sell your stocks" is advisory
    const advisoryPatterns = [
        /\b(should|must|need to|have to|we urge you to)\s+(buy|sell|invest|avoid)\b/i,
        /\b(buy|sell|invest)\s+(now|immediately|today|this|these|those)\b/i,
        /\b(we|i)\s+(recommend|suggest|advise)\b/i,
        /\boutperform\b/i,
        /\bunderperform\b/i,
        /\bavoid\b/i
    ];
    const phraseViolations = multiWordTerms.filter(term => fullText.includes(term));
    const patternViolations = advisoryPatterns
        .filter(pattern => pattern.test(fullText))
        .map(p => p.source);
    const allViolations = [...phraseViolations, ...patternViolations];
    return {
        gate: 'prohibited_language',
        passed: allViolations.length === 0,
        details: allViolations.length > 0
            ? `Found prohibited terms/patterns: ${allViolations.join(', ')}`
            : 'Clean'
    };
}
function runGate2SourceCompleteness(brief) {
    const missing = brief.expert.signals.filter(s => !s.source_url || s.source_url.trim() === '');
    return {
        gate: 'source_completeness',
        passed: missing.length === 0,
        details: missing.length > 0
            ? `Signals missing source_url: ${missing.map(s => s.label).join(', ')}`
            : `All ${brief.expert.signals.length} signals have source URLs`
    };
}
function runGate3DisclaimerPresence(brief) {
    const present = brief.disclaimer?.trim() === CANONICAL_DISCLAIMER.trim();
    return {
        gate: 'disclaimer_presence',
        passed: present,
        details: present
            ? 'Disclaimer matches canonical text'
            : 'Disclaimer missing or does not match canonical text'
    };
}
function runAllGates(brief) {
    const results = [
        runGate1ProhibitedLanguage(brief),
        runGate2SourceCompleteness(brief),
        runGate3DisclaimerPresence(brief)
    ];
    const allPassed = results.every(r => r.passed);
    if (!allPassed) {
        const failed = results.filter(r => !r.passed).map(r => r.gate);
        console.error(`[Gates] ❌ GATES FAILED: ${failed.join(', ')}`);
        results.filter(r => !r.passed).forEach(r => {
            console.error(`  ${r.gate}: ${r.details}`);
        });
    }
    else {
        console.log('[Gates] ✅ All three gates passed');
    }
    return { allPassed, results };
}

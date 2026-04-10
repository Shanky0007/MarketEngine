"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertGateFailure = alertGateFailure;
exports.alertPublishSuccess = alertPublishSuccess;
exports.alertIngestionFailures = alertIngestionFailures;
const axios_1 = __importDefault(require("axios"));
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
async function alertGateFailure(briefId, date, failedGates) {
    if (!SLACK_WEBHOOK) {
        console.warn('[Alerts] SLACK_WEBHOOK_URL not set — logging instead:');
        console.warn(`  ⛔ Brief Held — ${date} (${briefId})`);
        failedGates.forEach(g => console.warn(`  • ${g.gate}: ${g.details}`));
        return;
    }
    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: '⛔ Brief Held — Gate Failure' }
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Brief ID:*\n${briefId}` },
                { type: 'mrkdwn', text: `*Date:*\n${date}` }
            ]
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Failed gates:*\n${failedGates.map(g => `• ${g.gate}: ${g.details}`).join('\n')}`
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Action required:* Review the brief in the admin dashboard and either approve or regenerate.'
            }
        }
    ];
    await axios_1.default.post(SLACK_WEBHOOK, { blocks });
    console.log('[Alerts] Gate failure alert sent to Slack');
}
async function alertPublishSuccess(date, briefId) {
    if (!SLACK_WEBHOOK) {
        console.log(`[Alerts] ✅ Brief published for ${date} (ID: ${briefId})`);
        return;
    }
    await axios_1.default.post(SLACK_WEBHOOK, {
        text: `✅ Brief published for ${date} (ID: ${briefId})`
    });
}
async function alertIngestionFailures(date, failedSignals) {
    if (!SLACK_WEBHOOK || failedSignals.length === 0) {
        if (failedSignals.length > 0) {
            console.warn(`[Alerts] ⚠️ ${failedSignals.length} signals failed for ${date}: ${failedSignals.join(', ')}`);
        }
        return;
    }
    await axios_1.default.post(SLACK_WEBHOOK, {
        text: `⚠️ ${failedSignals.length} signals failed ingestion for ${date}: ${failedSignals.join(', ')}`
    });
}

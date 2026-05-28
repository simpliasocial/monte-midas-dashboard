import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(import.meta.url, {
    cache: false,
    alias: { "@": path.resolve("src") },
});
const {
    buildMetaCampaignInsightRows,
    buildMetaCampaignInsightsExportRows,
    calculateMetaInsightsSummary,
    getMetaActionValue,
    normalizeMetaActionMetrics,
    parseMetaNumber,
} = jiti("../../src/features/meta-ads/model/metaAdsInsightsModel.ts");

const test = (name, fn) => {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (error) {
        console.error(`not ok - ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
};

const campaigns = [
    {
        id: "120245143583140049",
        name: "[5/26/2026] Promoting http://www.simpliaconsulting.com/",
        status: "PAUSED",
        effective_status: "PAUSED",
        objective: "LINK_CLICKS",
        created_time: "2026-05-26T11:43:17-0500",
        start_time: "2026-05-26T11:43:47-0500",
    },
    {
        id: "campaign_without_metrics",
        name: "Campaña sin entrega",
        status: "ACTIVE",
        effective_status: "ACTIVE",
        objective: "LEAD_GENERATION",
    },
];

const insights = [
    {
        campaign_id: "120245143583140049",
        campaign_name: "[5/26/2026] Promoting http://www.simpliaconsulting.com/",
        adset_id: "120245143583110049",
        adset_name: "Ad set tráfico",
        spend: "10.50",
        impressions: "110",
        reach: "100",
        frequency: "1.1",
        clicks: "3",
        unique_clicks: "2",
        inline_link_clicks: "4",
        outbound_clicks: [{ action_type: "outbound_click", value: "2" }],
        cpc: "3.5",
        cpm: "95.4545",
        ctr: "2.727273",
        actions: [
            { action_type: "link_click", value: "4" },
            { action_type: "landing_page_view", value: "3" },
        ],
        cost_per_action_type: [
            { action_type: "link_click", value: "2.625" },
        ],
        action_values: [
            { action_type: "purchase", value: "40" },
        ],
        purchase_roas: [
            { action_type: "purchase", value: "3.81" },
        ],
        date_start: "2026-04-28",
        date_stop: "2026-05-27",
    },
    {
        campaign_id: "unknown_campaign",
        campaign_name: "Campaña no listada",
        adset_id: "adset_unknown",
        adset_name: "Ad set externo",
        spend: "0",
        impressions: "5",
        reach: "5",
        clicks: "0",
        date_start: "2026-04-28",
        date_stop: "2026-05-27",
    },
];

test("parseMetaNumber normalizes strings and action arrays", () => {
    assert.equal(parseMetaNumber("2.727273"), 2.727273);
    assert.equal(parseMetaNumber("$10,50"), 10.5);
    assert.equal(parseMetaNumber([{ value: "2" }, { value: "3" }]), 5);
    assert.equal(parseMetaNumber(undefined), 0);
});

test("normalizeMetaActionMetrics indexes action values by action_type", () => {
    const actions = normalizeMetaActionMetrics(insights[0].actions);

    assert.equal(getMetaActionValue(actions, "link_click"), 4);
    assert.equal(getMetaActionValue(actions, "landing_page_view"), 3);
    assert.equal(getMetaActionValue(actions, "missing"), 0);
});

test("buildMetaCampaignInsightRows keeps campaigns without insights", () => {
    const rows = buildMetaCampaignInsightRows(campaigns, insights, {
        since: "2026-04-28",
        until: "2026-05-27",
    });

    const campaignOnly = rows.find((row) => row.campaignId === "campaign_without_metrics");
    assert.equal(rows.length, 3);
    assert.equal(campaignOnly.hasInsights, false);
    assert.equal(campaignOnly.adsetName, "Sin métricas en este rango");
});

test("buildMetaCampaignInsightRows keeps insights whose campaign is missing from inventory", () => {
    const rows = buildMetaCampaignInsightRows(campaigns, insights, {
        since: "2026-04-28",
        until: "2026-05-27",
    });
    const unknown = rows.find((row) => row.campaignId === "unknown_campaign");

    assert.equal(unknown.hasInsights, true);
    assert.equal(unknown.campaignName, "Campaña no listada");
    assert.equal(unknown.campaignStatus, "");
});

test("calculateMetaInsightsSummary totals metrics and derives rates", () => {
    const rows = buildMetaCampaignInsightRows(campaigns, insights, {
        since: "2026-04-28",
        until: "2026-05-27",
    });
    const summary = calculateMetaInsightsSummary(rows);

    assert.equal(summary.campaigns, 3);
    assert.equal(summary.adsets, 2);
    assert.equal(summary.spend, 10.5);
    assert.equal(summary.impressions, 115);
    assert.equal(summary.reach, 105);
    assert.equal(Number(summary.averageCtr.toFixed(4)), 2.6087);
    assert.equal(Number(summary.averageCpc.toFixed(2)), 3.5);
});

test("buildMetaCampaignInsightsExportRows includes complete campaign and metric columns", () => {
    const rows = buildMetaCampaignInsightRows(campaigns, insights, {
        since: "2026-04-28",
        until: "2026-05-27",
    });
    const exported = buildMetaCampaignInsightsExportRows(rows);
    const row = exported.find((item) => item["Campaign ID"] === "120245143583140049");

    assert.equal(row.Campaña, campaigns[0].name);
    assert.equal(row["Ad set ID"], "120245143583110049");
    assert.equal(row["Tiene insights"], "Si");
    assert.equal(row.Acciones.includes("link_click: 4"), true);
    assert.equal(row.ROAS.includes("purchase: 3.81"), true);
});

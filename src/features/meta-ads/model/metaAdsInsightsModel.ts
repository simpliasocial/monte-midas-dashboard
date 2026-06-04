import { normalizeSearchText, type UnknownRecord } from "@/domain/common/types";

export interface MetaActionMetric {
    action_type: string;
    value: number;
    raw_value?: unknown;
}

export interface MetaCampaignApiCampaign {
    id?: unknown;
    name?: unknown;
    status?: unknown;
    effective_status?: unknown;
    objective?: unknown;
    created_time?: unknown;
    start_time?: unknown;
    stop_time?: unknown;
    raw_payload?: unknown;
}

export interface MetaAdsetInsightsApiRow {
    campaign_id?: unknown;
    campaign_name?: unknown;
    adset_id?: unknown;
    adset_name?: unknown;
    objective?: unknown;
    spend?: unknown;
    impressions?: unknown;
    reach?: unknown;
    frequency?: unknown;
    clicks?: unknown;
    unique_clicks?: unknown;
    inline_link_clicks?: unknown;
    outbound_clicks?: unknown;
    cpc?: unknown;
    cpm?: unknown;
    ctr?: unknown;
    actions?: unknown;
    cost_per_action_type?: unknown;
    action_values?: unknown;
    purchase_roas?: unknown;
    date_start?: unknown;
    date_stop?: unknown;
    raw_payload?: unknown;
}

export interface MetaCampaignInsightRow {
    rowKey: string;
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    campaignEffectiveStatus: string;
    objective: string;
    campaignCreatedTime: string;
    campaignStartTime: string;
    campaignStopTime: string;
    adsetId: string;
    adsetName: string;
    dateStart: string;
    dateStop: string;
    hasInsights: boolean;
    spend: number;
    impressions: number;
    reach: number;
    frequency: number;
    clicks: number;
    uniqueClicks: number;
    inlineLinkClicks: number;
    outboundClicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    actions: MetaActionMetric[];
    costPerActionType: MetaActionMetric[];
    actionValues: MetaActionMetric[];
    purchaseRoas: MetaActionMetric[];
    rawMetrics?: UnknownRecord;
}

export interface MetaCampaignInsightsSummary {
    campaigns: number;
    adsets: number;
    rows: number;
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    inlineLinkClicks: number;
    outboundClicks: number;
    averageFrequency: number;
    averageCtr: number;
    averageCpc: number;
    averageCpm: number;
}

export interface MetaCampaignInsightsResponse {
    ok: boolean;
    source: "fresh" | "cache" | "stale";
    accountId?: string;
    range: {
        since: string;
        until: string;
    };
    fetchedAt?: string;
    cacheExpiresAt?: string;
    warning?: string;
    summary: MetaCampaignInsightsSummary;
    rows: MetaCampaignInsightRow[];
}

export interface MetaAdsCampaignConfig {
    configured: boolean;
    source?: "database" | "secrets";
    accountId: number;
    adAccountId: string;
    tokenLast4: string;
    graphApiVersion: string;
    configuredAt?: string;
    updatedAt?: string;
}

export interface MetaAdsCampaignConfigResponse {
    ok: boolean;
    config: MetaAdsCampaignConfig;
}

export interface SaveMetaAdsCampaignConfigParams {
    adAccountId: string;
    accessToken?: string;
    graphApiVersion?: string;
}

const cleanText = (value: unknown) => String(value ?? "").trim();

export const parseMetaNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + parseMetaNumber((item as { value?: unknown })?.value), 0);
    }
    const normalized = cleanText(value).replace(",", ".");
    const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeMetaActionMetrics = (value: unknown): MetaActionMetric[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => {
            const record = item && typeof item === "object" && !Array.isArray(item)
                ? item as Record<string, unknown>
                : {};
            const actionType = cleanText(record.action_type);
            if (!actionType) return null;
            const metric: MetaActionMetric = {
                action_type: actionType,
                value: parseMetaNumber(record.value),
                raw_value: record.value,
            };
            return metric;
        })
        .filter((item): item is MetaActionMetric => Boolean(item));
};

export const getMetaActionValue = (items: MetaActionMetric[] = [], actionType: string) =>
    items.find((item) => item.action_type === actionType)?.value || 0;

export const normalizeMetaInsightRow = (
    insight: MetaAdsetInsightsApiRow,
    campaign?: MetaCampaignApiCampaign,
    fallbackRange?: { since: string; until: string },
): MetaCampaignInsightRow => {
    const actions = normalizeMetaActionMetrics(insight.actions);
    const costPerActionType = normalizeMetaActionMetrics(insight.cost_per_action_type);
    const actionValues = normalizeMetaActionMetrics(insight.action_values);
    const purchaseRoas = normalizeMetaActionMetrics(insight.purchase_roas);
    const campaignId = cleanText(insight.campaign_id || campaign?.id);
    const adsetId = cleanText(insight.adset_id);
    const dateStart = cleanText(insight.date_start) || fallbackRange?.since || "";
    const dateStop = cleanText(insight.date_stop) || fallbackRange?.until || "";

    return {
        rowKey: `${campaignId || "campaign"}:${adsetId || "sin-adset"}:${dateStart}:${dateStop}`,
        campaignId,
        campaignName: cleanText(insight.campaign_name || campaign?.name) || "Campaña sin nombre",
        campaignStatus: cleanText(campaign?.status),
        campaignEffectiveStatus: cleanText(campaign?.effective_status),
        objective: cleanText(insight.objective || campaign?.objective),
        campaignCreatedTime: cleanText(campaign?.created_time),
        campaignStartTime: cleanText(campaign?.start_time),
        campaignStopTime: cleanText(campaign?.stop_time),
        adsetId,
        adsetName: cleanText(insight.adset_name) || "Sin conjunto de anuncios",
        dateStart,
        dateStop,
        hasInsights: true,
        spend: parseMetaNumber(insight.spend),
        impressions: parseMetaNumber(insight.impressions),
        reach: parseMetaNumber(insight.reach),
        frequency: parseMetaNumber(insight.frequency),
        clicks: parseMetaNumber(insight.clicks),
        uniqueClicks: parseMetaNumber(insight.unique_clicks),
        inlineLinkClicks: parseMetaNumber(insight.inline_link_clicks),
        outboundClicks: parseMetaNumber(insight.outbound_clicks),
        cpc: parseMetaNumber(insight.cpc),
        cpm: parseMetaNumber(insight.cpm),
        ctr: parseMetaNumber(insight.ctr),
        actions,
        costPerActionType,
        actionValues,
        purchaseRoas,
        rawMetrics: insight.raw_payload && typeof insight.raw_payload === "object"
            ? insight.raw_payload as UnknownRecord
            : insight as UnknownRecord,
    };
};

export const createMetaCampaignOnlyRow = (
    campaign: MetaCampaignApiCampaign,
    fallbackRange: { since: string; until: string },
): MetaCampaignInsightRow => {
    const campaignId = cleanText(campaign.id);
    return {
        rowKey: `${campaignId || "campaign"}:sin-insights:${fallbackRange.since}:${fallbackRange.until}`,
        campaignId,
        campaignName: cleanText(campaign.name) || "Campaña sin nombre",
        campaignStatus: cleanText(campaign.status),
        campaignEffectiveStatus: cleanText(campaign.effective_status),
        objective: cleanText(campaign.objective),
        campaignCreatedTime: cleanText(campaign.created_time),
        campaignStartTime: cleanText(campaign.start_time),
        campaignStopTime: cleanText(campaign.stop_time),
        adsetId: "",
        adsetName: "Sin métricas en este rango",
        dateStart: fallbackRange.since,
        dateStop: fallbackRange.until,
        hasInsights: false,
        spend: 0,
        impressions: 0,
        reach: 0,
        frequency: 0,
        clicks: 0,
        uniqueClicks: 0,
        inlineLinkClicks: 0,
        outboundClicks: 0,
        cpc: 0,
        cpm: 0,
        ctr: 0,
        actions: [],
        costPerActionType: [],
        actionValues: [],
        purchaseRoas: [],
        rawMetrics: campaign.raw_payload && typeof campaign.raw_payload === "object"
            ? campaign.raw_payload as UnknownRecord
            : campaign as UnknownRecord,
    };
};

export const buildMetaCampaignInsightRows = (
    campaigns: MetaCampaignApiCampaign[],
    insights: MetaAdsetInsightsApiRow[],
    range: { since: string; until: string },
): MetaCampaignInsightRow[] => {
    const campaignById = new Map(campaigns.map((campaign) => [cleanText(campaign.id), campaign]));
    const insightRows = insights.map((insight) =>
        normalizeMetaInsightRow(insight, campaignById.get(cleanText(insight.campaign_id)), range)
    );
    const campaignsWithInsights = new Set(insightRows.map((row) => row.campaignId).filter(Boolean));
    const campaignOnlyRows = campaigns
        .filter((campaign) => !campaignsWithInsights.has(cleanText(campaign.id)))
        .map((campaign) => createMetaCampaignOnlyRow(campaign, range));

    return [...insightRows, ...campaignOnlyRows].sort((a, b) =>
        a.campaignName.localeCompare(b.campaignName) || a.adsetName.localeCompare(b.adsetName)
    );
};

export const calculateMetaInsightsSummary = (
    rows: MetaCampaignInsightRow[] = [],
): MetaCampaignInsightsSummary => {
    const insightRows = rows.filter((row) => row.hasInsights);
    const campaigns = new Set(rows.map((row) => row.campaignId).filter(Boolean)).size;
    const adsets = new Set(insightRows.map((row) => row.adsetId).filter(Boolean)).size;
    const impressions = insightRows.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = insightRows.reduce((sum, row) => sum + row.clicks, 0);
    const spend = insightRows.reduce((sum, row) => sum + row.spend, 0);
    const reach = insightRows.reduce((sum, row) => sum + row.reach, 0);

    return {
        campaigns,
        adsets,
        rows: rows.length,
        spend,
        impressions,
        reach,
        clicks,
        inlineLinkClicks: insightRows.reduce((sum, row) => sum + row.inlineLinkClicks, 0),
        outboundClicks: insightRows.reduce((sum, row) => sum + row.outboundClicks, 0),
        averageFrequency: reach > 0 ? impressions / reach : 0,
        averageCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        averageCpc: clicks > 0 ? spend / clicks : 0,
        averageCpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    };
};

export const metaRowMatchesSearch = (row: MetaCampaignInsightRow, query: string) => {
    const search = normalizeSearchText(query);
    if (!search) return true;

    return [
        row.campaignName,
        row.campaignId,
        row.campaignStatus,
        row.campaignEffectiveStatus,
        row.objective,
        row.adsetName,
        row.adsetId,
        row.dateStart,
        row.dateStop,
    ].some((value) => normalizeSearchText(value).includes(search));
};

export const buildMetaCampaignInsightsExportRows = (
    rows: MetaCampaignInsightRow[] = [],
) => rows.map((row) => ({
    "Campaign ID": row.campaignId,
    Campaña: row.campaignName,
    Estado: row.campaignStatus,
    "Estado efectivo": row.campaignEffectiveStatus,
    Objetivo: row.objective,
    "Campaign created_time": row.campaignCreatedTime,
    "Campaign start_time": row.campaignStartTime,
    "Campaign stop_time": row.campaignStopTime,
    "Ad set ID": row.adsetId,
    "Ad set": row.adsetName,
    "Tiene insights": row.hasInsights ? "Si" : "No",
    "Fecha inicio métricas": row.dateStart,
    "Fecha fin métricas": row.dateStop,
    Gasto: row.spend,
    Impresiones: row.impressions,
    Alcance: row.reach,
    Frecuencia: row.frequency,
    Clics: row.clicks,
    "Clics únicos": row.uniqueClicks,
    "Inline link clicks": row.inlineLinkClicks,
    "Outbound clicks": row.outboundClicks,
    CPC: row.cpc,
    CPM: row.cpm,
    CTR: row.ctr,
    Acciones: row.actions.map((item) => `${item.action_type}: ${item.value}`).join(" | "),
    "Costo por acción": row.costPerActionType.map((item) => `${item.action_type}: ${item.value}`).join(" | "),
    "Valores de acción": row.actionValues.map((item) => `${item.action_type}: ${item.value}`).join(" | "),
    ROAS: row.purchaseRoas.map((item) => `${item.action_type}: ${item.value}`).join(" | "),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupabaseClient = ReturnType<typeof createClient>;
type UnknownRecord = Record<string, any>;

const CAMPAIGN_FIELDS = "id,name,status,effective_status,objective,created_time,start_time,stop_time";
const INSIGHT_FIELDS = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "spend",
    "impressions",
    "reach",
    "frequency",
    "clicks",
    "unique_clicks",
    "inline_link_clicks",
    "outbound_clicks",
    "cpc",
    "cpm",
    "ctr",
    "actions",
    "cost_per_action_type",
    "action_values",
    "purchase_roas",
    "date_start",
    "date_stop",
].join(",");

const cleanText = (value: unknown) => String(value ?? "").trim();

const asObject = (value: unknown): UnknownRecord =>
    value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};

const asArray = (value: unknown): UnknownRecord[] =>
    Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as UnknownRecord[] : [];

const errorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
};

const jsonResponse = (payload: Record<string, unknown>, init?: ResponseInit) =>
    new Response(JSON.stringify(payload), {
        ...init,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers || {}) },
    });

const parseNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + parseNumber(asObject(item).value), 0);
    }
    const parsed = Number.parseFloat(cleanText(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeActionStats = (value: unknown) =>
    asArray(value)
        .map((item) => ({
            action_type: cleanText(item.action_type),
            value: parseNumber(item.value),
            raw_value: item.value,
        }))
        .filter((item) => item.action_type);

const parseJsonHeader = (value: string | null) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const normalizeVersion = (value: string | undefined) => {
    const version = cleanText(value || "v20.0");
    return version.startsWith("v") ? version : `v${version}`;
};

const normalizeDateKey = (value: unknown, fallback: string) => {
    const text = cleanText(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = text ? new Date(text) : new Date(fallback);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
};

const DEFAULT_ACCOUNT_ID = 0;

const normalizeAccountId = (value: unknown) => {
    const numeric = Number(value ?? DEFAULT_ACCOUNT_ID);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : DEFAULT_ACCOUNT_ID;
};

const normalizeAdAccountId = (value: unknown) => {
    const text = cleanText(value).replace(/^act_/i, "").replace(/\s+/g, "");
    if (!text) return "";
    if (!/^\d+$/.test(text)) throw new Error("El ID de cuenta publicitaria de Meta debe ser numerico. Puedes pegarlo con o sin prefijo act_.");
    return text;
};

const normalizeAccessToken = (value: unknown) =>
    cleanText(value).replace(/^Bearer\s+/i, "").trim();

const tokenLastFour = (value: string) => value.slice(-4);

const isoOrNull = (value: unknown) => {
    const text = cleanText(value);
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getAuthProfile = async (supabase: SupabaseClient, authHeader: string | null) => {
    const jwt = cleanText(authHeader).replace(/^Bearer\s+/i, "");
    if (!jwt) return null;

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) return null;

    const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (error) return null;
    const role = cleanText((data as { role?: unknown } | null)?.role) || null;
    return { userId: userData.user.id, role };
};

const canReadMetaAds = (role: string | null) =>
    role === "platform_admin" || role === "company_admin";

const canConfigureMetaAds = canReadMetaAds;

const readMetaAdsConfig = async (supabase: SupabaseClient, accountId: number) => {
    const { data, error } = await supabase
        .schema("cw")
        .from("meta_ads_configs")
        .select("*")
        .eq("account_id", accountId)
        .eq("enabled", true)
        .maybeSingle();

    if (error) throw error;
    return data as UnknownRecord | null;
};

const toPublicMetaConfig = (config: UnknownRecord | null, source?: "database" | "secrets") => {
    const adAccountId = cleanText(config?.ad_account_id);
    const tokenLast4 = cleanText(config?.token_last_four);
    const graphApiVersion = normalizeVersion(cleanText(config?.graph_api_version));

    return {
        configured: Boolean(adAccountId && (tokenLast4 || cleanText(config?.access_token))),
        source,
        accountId: normalizeAccountId(config?.account_id),
        adAccountId,
        tokenLast4: tokenLast4 || (cleanText(config?.access_token) ? tokenLastFour(cleanText(config?.access_token)) : ""),
        graphApiVersion,
        configuredAt: cleanText(config?.configured_at),
        updatedAt: cleanText(config?.updated_at),
    };
};

const resolveMetaAdsConfig = async (supabase: SupabaseClient, accountId: number) => {
    const savedConfig = await readMetaAdsConfig(supabase, accountId);
    const savedAdAccountId = savedConfig ? normalizeAdAccountId(savedConfig.ad_account_id) : "";
    const savedToken = savedConfig ? normalizeAccessToken(savedConfig.access_token) : "";

    if (savedAdAccountId && savedToken) {
        return {
            accountId,
            adAccountId: savedAdAccountId,
            token: savedToken,
            version: normalizeVersion(cleanText(savedConfig?.graph_api_version) || Deno.env.get("META_GRAPH_API_VERSION") || undefined),
            publicConfig: toPublicMetaConfig(savedConfig, "database"),
        };
    }

    const secretAdAccountId = normalizeAdAccountId(Deno.env.get("META_AD_ACCOUNT_ID"));
    const secretToken = normalizeAccessToken(Deno.env.get("META_SYSTEM_USER_TOKEN"));
    if (secretAdAccountId && secretToken) {
        return {
            accountId,
            adAccountId: secretAdAccountId,
            token: secretToken,
            version: normalizeVersion(Deno.env.get("META_GRAPH_API_VERSION") || undefined),
            publicConfig: toPublicMetaConfig({
                account_id: accountId,
                ad_account_id: secretAdAccountId,
                access_token: secretToken,
                token_last_four: tokenLastFour(secretToken),
                graph_api_version: normalizeVersion(Deno.env.get("META_GRAPH_API_VERSION") || undefined),
            }, "secrets"),
        };
    }

    return {
        accountId,
        adAccountId: "",
        token: "",
        version: normalizeVersion(Deno.env.get("META_GRAPH_API_VERSION") || undefined),
        publicConfig: toPublicMetaConfig(savedConfig, savedConfig ? "database" : undefined),
    };
};

const saveMetaAdsConfig = async (
    supabase: SupabaseClient,
    params: {
        accountId: number;
        userId: string;
        adAccountId: unknown;
        accessToken: unknown;
        graphApiVersion: unknown;
    },
) => {
    const existingConfig = await readMetaAdsConfig(supabase, params.accountId);
    const adAccountId = normalizeAdAccountId(params.adAccountId || existingConfig?.ad_account_id || Deno.env.get("META_AD_ACCOUNT_ID"));
    const incomingToken = normalizeAccessToken(params.accessToken);
    const accessToken = incomingToken || normalizeAccessToken(existingConfig?.access_token || Deno.env.get("META_SYSTEM_USER_TOKEN"));
    const graphApiVersion = normalizeVersion(cleanText(params.graphApiVersion || existingConfig?.graph_api_version || Deno.env.get("META_GRAPH_API_VERSION")) || "v20.0");

    if (!adAccountId) throw new Error("Ingresa el ID de cuenta publicitaria de Meta.");
    if (!accessToken) throw new Error("Ingresa el Bearer Token de Meta Ads.");
    if (accessToken.length < 20) throw new Error("El Bearer Token de Meta Ads parece incompleto.");

    const now = new Date().toISOString();
    const row = {
        account_id: params.accountId,
        ad_account_id: adAccountId,
        access_token: accessToken,
        token_last_four: tokenLastFour(accessToken),
        graph_api_version: graphApiVersion,
        enabled: true,
        configured_by: params.userId,
        configured_at: now,
        updated_at: now,
    };

    const { error } = await supabase
        .schema("cw")
        .from("meta_ads_configs")
        .upsert(row, { onConflict: "account_id" });

    if (error) throw error;
    return toPublicMetaConfig(row, "database");
};

const graphFetchAll = async (
    path: string,
    params: Record<string, string>,
    env: { token: string; version: string },
) => {
    const rows: UnknownRecord[] = [];
    const rateLimitUsage: UnknownRecord = {};
    let url: string | null = `https://graph.facebook.com/${env.version}${path}`;
    const firstUrl = new URL(url);
    Object.entries(params).forEach(([key, value]) => firstUrl.searchParams.set(key, value));
    firstUrl.searchParams.set("limit", "100");
    url = firstUrl.toString();

    for (let page = 0; url && page < 100; page += 1) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${env.token}`,
                Accept: "application/json",
            },
        });

        rateLimitUsage.business = parseJsonHeader(response.headers.get("x-business-use-case-usage")) ?? rateLimitUsage.business;
        rateLimitUsage.ad_account = parseJsonHeader(response.headers.get("x-ad-account-usage")) ?? rateLimitUsage.ad_account;
        rateLimitUsage.app = parseJsonHeader(response.headers.get("x-app-usage")) ?? rateLimitUsage.app;

        const bodyText = await response.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        if (!response.ok) {
            throw new Error(`Meta ${path} falló: ${response.status} ${bodyText.slice(0, 700)}`);
        }

        rows.push(...asArray(body.data));
        url = cleanText(body?.paging?.next) || null;
    }

    return { rows, rateLimitUsage };
};

const fetchCampaignsFromMeta = (env: { adAccountId: string; token: string; version: string }) =>
    graphFetchAll(`/act_${env.adAccountId}/campaigns`, { fields: CAMPAIGN_FIELDS }, env);

const fetchInsightsFromMeta = (
    env: { adAccountId: string; token: string; version: string },
    range: { since: string; until: string },
) => graphFetchAll(`/act_${env.adAccountId}/insights`, {
    level: "adset",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    fields: INSIGHT_FIELDS,
}, env);

const upsertCampaigns = async (
    supabase: SupabaseClient,
    adAccountId: string,
    campaigns: UnknownRecord[],
    fetchedAt: string,
) => {
    if (campaigns.length === 0) return 0;

    const rows = campaigns
        .map((campaign) => {
            const campaignId = cleanText(campaign.id);
            if (!campaignId) return null;
            return {
                ad_account_id: adAccountId,
                campaign_id: campaignId,
                name: cleanText(campaign.name) || null,
                status: cleanText(campaign.status) || null,
                effective_status: cleanText(campaign.effective_status) || null,
                objective: cleanText(campaign.objective) || null,
                created_time: isoOrNull(campaign.created_time),
                start_time: isoOrNull(campaign.start_time),
                stop_time: isoOrNull(campaign.stop_time),
                raw_payload: campaign,
                fetched_at: fetchedAt,
                updated_at: fetchedAt,
            };
        })
        .filter(Boolean);

    if (rows.length === 0) return 0;

    const { error } = await supabase
        .schema("cw")
        .from("meta_campaigns_current")
        .upsert(rows, { onConflict: "ad_account_id,campaign_id" });

    if (error) throw error;
    return rows.length;
};

const upsertInsights = async (
    supabase: SupabaseClient,
    adAccountId: string,
    insights: UnknownRecord[],
    range: { since: string; until: string },
    fetchedAt: string,
) => {
    const { error: deleteError } = await supabase
        .schema("cw")
        .from("meta_adset_insights_cache")
        .delete()
        .eq("ad_account_id", adAccountId)
        .eq("request_date_start", range.since)
        .eq("request_date_stop", range.until);

    if (deleteError) throw deleteError;

    const rows = insights
        .map((insight) => {
            const campaignId = cleanText(insight.campaign_id);
            if (!campaignId) return null;
            const adsetId = cleanText(insight.adset_id);
            const dateStart = normalizeDateKey(insight.date_start, range.since);
            const dateStop = normalizeDateKey(insight.date_stop, range.until);
            return {
                cache_key: [adAccountId, campaignId, adsetId || "campaign", range.since, range.until, dateStart, dateStop].join(":"),
                ad_account_id: adAccountId,
                campaign_id: campaignId,
                campaign_name: cleanText(insight.campaign_name) || null,
                adset_id: adsetId || null,
                adset_name: cleanText(insight.adset_name) || null,
                objective: cleanText(insight.objective) || null,
                request_date_start: range.since,
                request_date_stop: range.until,
                date_start: dateStart,
                date_stop: dateStop,
                spend: parseNumber(insight.spend),
                impressions: Math.round(parseNumber(insight.impressions)),
                reach: Math.round(parseNumber(insight.reach)),
                frequency: parseNumber(insight.frequency),
                clicks: Math.round(parseNumber(insight.clicks)),
                unique_clicks: Math.round(parseNumber(insight.unique_clicks)),
                inline_link_clicks: Math.round(parseNumber(insight.inline_link_clicks)),
                outbound_clicks: Math.round(parseNumber(insight.outbound_clicks)),
                cpc: parseNumber(insight.cpc),
                cpm: parseNumber(insight.cpm),
                ctr: parseNumber(insight.ctr),
                actions: Array.isArray(insight.actions) ? insight.actions : [],
                cost_per_action_type: Array.isArray(insight.cost_per_action_type) ? insight.cost_per_action_type : [],
                action_values: Array.isArray(insight.action_values) ? insight.action_values : [],
                purchase_roas: Array.isArray(insight.purchase_roas) ? insight.purchase_roas : [],
                raw_payload: insight,
                fetched_at: fetchedAt,
                updated_at: fetchedAt,
            };
        })
        .filter(Boolean);

    if (rows.length === 0) return 0;

    const { error } = await supabase
        .schema("cw")
        .from("meta_adset_insights_cache")
        .upsert(rows, { onConflict: "cache_key" });

    if (error) throw error;
    return rows.length;
};

const fetchCampaignRows = async (supabase: SupabaseClient, adAccountId: string) => {
    const { data, error } = await supabase
        .schema("cw")
        .from("meta_campaigns_current")
        .select("*")
        .eq("ad_account_id", adAccountId)
        .order("created_time", { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []) as UnknownRecord[];
};

const fetchInsightRows = async (
    supabase: SupabaseClient,
    adAccountId: string,
    range: { since: string; until: string },
) => {
    const { data, error } = await supabase
        .schema("cw")
        .from("meta_adset_insights_cache")
        .select("*")
        .eq("ad_account_id", adAccountId)
        .eq("request_date_start", range.since)
        .eq("request_date_stop", range.until)
        .order("campaign_name", { ascending: true });

    if (error) throw error;
    return (data || []) as UnknownRecord[];
};

const latestSuccessRun = async (
    supabase: SupabaseClient,
    adAccountId: string,
    range: { since: string; until: string },
    minStartedAt?: string,
) => {
    let query = supabase
        .schema("cw")
        .from("meta_ads_sync_runs")
        .select("*")
        .eq("ad_account_id", adAccountId)
        .eq("date_start", range.since)
        .eq("date_stop", range.until)
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1);

    if (minStartedAt) query = query.gte("started_at", minStartedAt);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [])[0] as UnknownRecord | undefined;
};

const calculateSummary = (rows: UnknownRecord[]) => {
    const insightRows = rows.filter((row) => row.hasInsights);
    const campaigns = new Set(rows.map((row) => cleanText(row.campaignId)).filter(Boolean)).size;
    const adsets = new Set(insightRows.map((row) => cleanText(row.adsetId)).filter(Boolean)).size;
    const spend = insightRows.reduce((sum, row) => sum + parseNumber(row.spend), 0);
    const impressions = insightRows.reduce((sum, row) => sum + parseNumber(row.impressions), 0);
    const reach = insightRows.reduce((sum, row) => sum + parseNumber(row.reach), 0);
    const clicks = insightRows.reduce((sum, row) => sum + parseNumber(row.clicks), 0);

    return {
        campaigns,
        adsets,
        rows: rows.length,
        spend,
        impressions,
        reach,
        clicks,
        inlineLinkClicks: insightRows.reduce((sum, row) => sum + parseNumber(row.inlineLinkClicks), 0),
        outboundClicks: insightRows.reduce((sum, row) => sum + parseNumber(row.outboundClicks), 0),
        averageFrequency: reach > 0 ? impressions / reach : 0,
        averageCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        averageCpc: clicks > 0 ? spend / clicks : 0,
        averageCpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    };
};

const buildRows = (
    campaignRows: UnknownRecord[],
    insightRows: UnknownRecord[],
    range: { since: string; until: string },
) => {
    const campaignById = new Map(campaignRows.map((campaign) => [cleanText(campaign.campaign_id), campaign]));
    const rows = insightRows.map((insight) => {
        const campaign = campaignById.get(cleanText(insight.campaign_id)) || {};
        const campaignId = cleanText(insight.campaign_id);
        const adsetId = cleanText(insight.adset_id);
        const dateStart = cleanText(insight.date_start) || range.since;
        const dateStop = cleanText(insight.date_stop) || range.until;

        return {
            rowKey: [campaignId, adsetId || "sin-adset", dateStart, dateStop].join(":"),
            campaignId,
            campaignName: cleanText(insight.campaign_name || campaign.name) || "Campaña sin nombre",
            campaignStatus: cleanText(campaign.status),
            campaignEffectiveStatus: cleanText(campaign.effective_status),
            objective: cleanText(insight.objective || campaign.objective),
            campaignCreatedTime: cleanText(campaign.created_time),
            campaignStartTime: cleanText(campaign.start_time),
            campaignStopTime: cleanText(campaign.stop_time),
            adsetId,
            adsetName: cleanText(insight.adset_name) || "Sin conjunto de anuncios",
            dateStart,
            dateStop,
            hasInsights: true,
            spend: parseNumber(insight.spend),
            impressions: parseNumber(insight.impressions),
            reach: parseNumber(insight.reach),
            frequency: parseNumber(insight.frequency),
            clicks: parseNumber(insight.clicks),
            uniqueClicks: parseNumber(insight.unique_clicks),
            inlineLinkClicks: parseNumber(insight.inline_link_clicks),
            outboundClicks: parseNumber(insight.outbound_clicks),
            cpc: parseNumber(insight.cpc),
            cpm: parseNumber(insight.cpm),
            ctr: parseNumber(insight.ctr),
            actions: normalizeActionStats(insight.actions),
            costPerActionType: normalizeActionStats(insight.cost_per_action_type),
            actionValues: normalizeActionStats(insight.action_values),
            purchaseRoas: normalizeActionStats(insight.purchase_roas),
            rawMetrics: asObject(insight.raw_payload),
        };
    });

    const campaignsWithInsights = new Set(rows.map((row) => row.campaignId));
    campaignRows.forEach((campaign) => {
        const campaignId = cleanText(campaign.campaign_id);
        if (!campaignId || campaignsWithInsights.has(campaignId)) return;
        rows.push({
            rowKey: [campaignId, "sin-insights", range.since, range.until].join(":"),
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
            dateStart: range.since,
            dateStop: range.until,
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
            rawMetrics: asObject(campaign.raw_payload),
        });
    });

    return rows.sort((a, b) =>
        cleanText(a.campaignName).localeCompare(cleanText(b.campaignName)) ||
        cleanText(a.adsetName).localeCompare(cleanText(b.adsetName))
    );
};

const buildPayload = async (
    supabase: SupabaseClient,
    params: {
        adAccountId: string;
        range: { since: string; until: string };
        source: "fresh" | "cache" | "stale";
        fetchedAt?: string;
        ttlSeconds: number;
        warning?: string;
    },
) => {
    const [campaignRows, insightRows] = await Promise.all([
        fetchCampaignRows(supabase, params.adAccountId),
        fetchInsightRows(supabase, params.adAccountId, params.range),
    ]);
    const rows = buildRows(campaignRows, insightRows, params.range);
    const fetchedAt = params.fetchedAt || cleanText(insightRows[0]?.fetched_at || campaignRows[0]?.fetched_at) || new Date().toISOString();
    const cacheExpiresAt = new Date(new Date(fetchedAt).getTime() + params.ttlSeconds * 1000).toISOString();

    return {
        ok: true,
        source: params.source,
        accountId: params.adAccountId,
        range: params.range,
        fetchedAt,
        cacheExpiresAt,
        warning: params.warning || (campaignRows.length > 0 && insightRows.length === 0
            ? "Meta devolvió campañas, pero no devolvió insights para este rango solicitado. Revisa que el rango tenga entrega o fuerza actualización."
            : undefined),
        summary: calculateSummary(rows),
        rows,
    };
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const startedAt = new Date();
    let runId: string | null = null;

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const ttlSeconds = Math.max(60, Number(Deno.env.get("META_CACHE_TTL_SECONDS") || 900));

        if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service role environment variables.");

        const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        const body = await req.json().catch(() => ({}));
        const authProfile = await getAuthProfile(supabase, req.headers.get("Authorization"));
        if (!authProfile?.role) return jsonResponse({ ok: false, error: "No autenticado." }, { status: 401 });
        if (!canReadMetaAds(authProfile.role)) return jsonResponse({ ok: false, error: "No tienes acceso a Meta Ads." }, { status: 403 });

        const accountId = normalizeAccountId(body.accountId ?? body.account_id);
        const action = cleanText(body.action || "fetch_insights") || "fetch_insights";

        if (action === "get_config") {
            const config = await resolveMetaAdsConfig(supabase, accountId);
            return jsonResponse({ ok: true, config: config.publicConfig });
        }

        if (action === "save_config") {
            if (!canConfigureMetaAds(authProfile.role)) {
                return jsonResponse({ ok: false, error: "No tienes permisos para configurar Meta Ads." }, { status: 403 });
            }

            const config = await saveMetaAdsConfig(supabase, {
                accountId,
                userId: authProfile.userId,
                adAccountId: body.adAccountId ?? body.ad_account_id,
                accessToken: body.accessToken ?? body.access_token ?? body.bearerToken ?? body.token,
                graphApiVersion: body.graphApiVersion ?? body.graph_api_version ?? body.version,
            });

            return jsonResponse({ ok: true, config });
        }

        const metaConfig = await resolveMetaAdsConfig(supabase, accountId);
        const { adAccountId, token, version } = metaConfig;
        if (!adAccountId || !token) {
            return jsonResponse({
                ok: false,
                error: "Meta Ads no esta configurado. Usa Configurar campanas para guardar el ID de cuenta publicitaria y el Bearer Token.",
                config: metaConfig.publicConfig,
            }, { status: 400 });
        }

        const range = {
            since: normalizeDateKey(body.since, new Date(startedAt.getFullYear(), startedAt.getMonth(), 1).toISOString().slice(0, 10)),
            until: normalizeDateKey(body.until, startedAt.toISOString().slice(0, 10)),
        };
        const forceRefresh = body.forceRefresh === true;
        if (range.since > range.until) throw new Error("El rango de fechas de Meta Ads es inválido.");

        const cacheCutoff = new Date(startedAt.getTime() - ttlSeconds * 1000).toISOString();
        if (!forceRefresh) {
            const freshRun = await latestSuccessRun(supabase, adAccountId, range, cacheCutoff);
            if (freshRun) {
                const payload = await buildPayload(supabase, {
                    adAccountId,
                    range,
                    source: "cache",
                    fetchedAt: cleanText(freshRun.finished_at || freshRun.started_at),
                    ttlSeconds,
                });

                await supabase
                    .schema("cw")
                    .from("meta_ads_sync_runs")
                    .insert({
                        ad_account_id: adAccountId,
                        date_start: range.since,
                        date_stop: range.until,
                        status: "cache_hit",
                        started_at: startedAt.toISOString(),
                        finished_at: new Date().toISOString(),
                        cache_hit: true,
                        returned_rows: payload.rows.length,
                        metadata: { cache_run_id: freshRun.id },
                    });

                return jsonResponse(payload);
            }
        }

        const { data: run, error: runError } = await supabase
            .schema("cw")
            .from("meta_ads_sync_runs")
            .insert({
                ad_account_id: adAccountId,
                date_start: range.since,
                date_stop: range.until,
                status: "running",
                started_at: startedAt.toISOString(),
                force_refresh: forceRefresh,
            })
            .select("id")
            .single();

        if (runError) throw runError;
        runId = cleanText(run?.id);

        try {
            const [campaignResult, insightResult] = await Promise.all([
                fetchCampaignsFromMeta({ adAccountId, token, version }),
                fetchInsightsFromMeta({ adAccountId, token, version }, range),
            ]);
            const fetchedAt = new Date().toISOString();
            const rateLimitUsage = {
                campaigns: campaignResult.rateLimitUsage,
                insights: insightResult.rateLimitUsage,
            };

            const [campaignRows, insightRows] = await Promise.all([
                upsertCampaigns(supabase, adAccountId, campaignResult.rows, fetchedAt),
                upsertInsights(supabase, adAccountId, insightResult.rows, range, fetchedAt),
            ]);

            const payload = await buildPayload(supabase, {
                adAccountId,
                range,
                source: "fresh",
                fetchedAt,
                ttlSeconds,
            });

            await supabase
                .schema("cw")
                .from("meta_ads_sync_runs")
                .update({
                    status: "success",
                    finished_at: new Date().toISOString(),
                    campaign_rows: campaignRows,
                    insight_rows: insightRows,
                    returned_rows: payload.rows.length,
                    rate_limit_usage: rateLimitUsage,
                })
                .eq("id", runId);

            return jsonResponse(payload);
        } catch (metaError) {
            const message = errorMessage(metaError);
            if (runId) {
                await supabase
                    .schema("cw")
                    .from("meta_ads_sync_runs")
                    .update({
                        status: "error",
                        finished_at: new Date().toISOString(),
                        error_message: message,
                    })
                    .eq("id", runId);
            }

            const staleRun = await latestSuccessRun(supabase, adAccountId, range);
            if (staleRun) {
                const payload = await buildPayload(supabase, {
                    adAccountId,
                    range,
                    source: "stale",
                    fetchedAt: cleanText(staleRun.finished_at || staleRun.started_at),
                    ttlSeconds,
                    warning: `Meta no respondió ahora. Mostrando último caché disponible. Detalle: ${message}`,
                });
                return jsonResponse(payload);
            }

            throw metaError;
        }
    } catch (error) {
        return jsonResponse({
            ok: false,
            error: errorMessage(error),
        }, { status: 500 });
    }
});

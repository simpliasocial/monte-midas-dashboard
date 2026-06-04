import { supabase } from "@/lib/supabase";
import type {
    MetaAdsCampaignConfigResponse,
    MetaCampaignInsightsResponse,
    SaveMetaAdsCampaignConfigParams,
} from "@/features/meta-ads/model/metaAdsInsightsModel";

export interface FetchMetaCampaignInsightsParams {
    since: string;
    until: string;
    forceRefresh?: boolean;
}

const errorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    const record = error && typeof error === "object" ? error as { message?: unknown } : {};
    return String(record.message || "No se pudo cargar Meta Ads.");
};

const parseFunctionError = async (error: unknown) => {
    const context = error && typeof error === "object"
        ? (error as { context?: Response }).context
        : null;

    if (context) {
        try {
            const payload = await context.clone().json() as { error?: unknown; message?: unknown };
            return String(payload.error || payload.message || errorMessage(error));
        } catch {
            return errorMessage(error);
        }
    }

    return errorMessage(error);
};

export const metaAdsInsightsClient = {
    async fetchCampaignInsights(params: FetchMetaCampaignInsightsParams): Promise<MetaCampaignInsightsResponse> {
        const { data, error } = await supabase.functions.invoke("meta-campaign-insights", {
            body: {
                since: params.since,
                until: params.until,
                forceRefresh: params.forceRefresh === true,
            },
        });

        if (error) throw new Error(await parseFunctionError(error));

        const payload = data as MetaCampaignInsightsResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo cargar Meta Ads.");
        }

        return payload;
    },

    async fetchCampaignConfig() {
        const { data, error } = await supabase.functions.invoke("meta-campaign-insights", {
            body: { action: "get_config" },
        });

        if (error) throw new Error(await parseFunctionError(error));

        const payload = data as MetaAdsCampaignConfigResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo cargar la configuracion de Meta Ads.");
        }

        return payload.config;
    },

    async saveCampaignConfig(params: SaveMetaAdsCampaignConfigParams) {
        const { data, error } = await supabase.functions.invoke("meta-campaign-insights", {
            body: {
                action: "save_config",
                adAccountId: params.adAccountId,
                accessToken: params.accessToken,
                graphApiVersion: params.graphApiVersion,
            },
        });

        if (error) throw new Error(await parseFunctionError(error));

        const payload = data as MetaAdsCampaignConfigResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo guardar la configuracion de Meta Ads.");
        }

        return payload.config;
    },
};

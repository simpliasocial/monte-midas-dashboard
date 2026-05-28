import { supabase } from "@/lib/supabase";
import type { MetaCampaignInsightsResponse } from "@/features/meta-ads/model/metaAdsInsightsModel";

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

export const metaAdsInsightsClient = {
    async fetchCampaignInsights(params: FetchMetaCampaignInsightsParams): Promise<MetaCampaignInsightsResponse> {
        const { data, error } = await supabase.functions.invoke("meta-campaign-insights", {
            body: {
                since: params.since,
                until: params.until,
                forceRefresh: params.forceRefresh === true,
            },
        });

        if (error) throw new Error(errorMessage(error));

        const payload = data as MetaCampaignInsightsResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo cargar Meta Ads.");
        }

        return payload;
    },
};

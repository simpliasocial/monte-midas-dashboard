import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardFilters } from "@/domain/dashboard";
import { getGuayaquilDateString } from "@/lib/guayaquilTime";
import { metaAdsInsightsClient } from "@/infrastructure/supabase/MetaAdsInsightsClient";

export interface UseMetaCampaignInsightsOptions {
    enabled?: boolean;
}

const firstDayOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const minDate = (left: Date, right: Date) => left.getTime() <= right.getTime() ? left : right;

export const resolveMetaInsightsRange = (filters: DashboardFilters = {}) => {
    const today = new Date();
    const start = filters.startDate || firstDayOfMonth();
    const end = minDate(filters.endDate || filters.startDate || today, today);

    return {
        since: getGuayaquilDateString(start),
        until: getGuayaquilDateString(end),
    };
};

export const useMetaCampaignInsights = (
    filters: DashboardFilters = {},
    options: UseMetaCampaignInsightsOptions = {},
) => {
    const range = useMemo(
        () => resolveMetaInsightsRange(filters),
        [filters.startDate, filters.endDate],
    );
    const enabled = options.enabled !== false && Boolean(range.since && range.until);

    return useQuery({
        queryKey: ["meta-campaign-insights", range.since, range.until],
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 20 * 60 * 1000,
        queryFn: () => metaAdsInsightsClient.fetchCampaignInsights(range),
    });
};

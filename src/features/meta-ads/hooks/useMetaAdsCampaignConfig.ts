import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { metaAdsInsightsClient } from "@/infrastructure/supabase/MetaAdsInsightsClient";
import type { SaveMetaAdsCampaignConfigParams } from "../model/metaAdsInsightsModel";

const META_ADS_CONFIG_QUERY_KEY = ["meta-ads-campaign-config"];
const META_ADS_INSIGHTS_QUERY_KEY = ["meta-campaign-insights"];

export const useMetaAdsCampaignConfig = (enabled: boolean) => {
    const queryClient = useQueryClient();
    const configQuery = useQuery({
        queryKey: META_ADS_CONFIG_QUERY_KEY,
        enabled,
        staleTime: 60 * 1000,
        queryFn: () => metaAdsInsightsClient.fetchCampaignConfig(),
    });

    const saveConfigMutation = useMutation({
        mutationFn: (params: SaveMetaAdsCampaignConfigParams) =>
            metaAdsInsightsClient.saveCampaignConfig(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: META_ADS_CONFIG_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: META_ADS_INSIGHTS_QUERY_KEY });
        },
    });

    return {
        config: configQuery.data,
        configLoading: configQuery.isLoading || configQuery.isFetching,
        configError: configQuery.error,
        refetchConfig: configQuery.refetch,
        saveConfig: saveConfigMutation.mutateAsync,
        saveConfigError: saveConfigMutation.error,
        resetSaveConfig: saveConfigMutation.reset,
        savingConfig: saveConfigMutation.isPending,
    };
};

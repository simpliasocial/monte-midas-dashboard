import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { metaCapiClient } from "@/infrastructure/supabase/MetaCapiClient";
import type {
    SaveMetaCapiConfigParams,
    TestMetaCapiEventParams,
} from "../model/metaCapiModel";

export const META_CAPI_CONFIG_QUERY_KEY = ["meta-capi-config"];

export const useMetaCapiConfig = (enabled: boolean) => {
    const queryClient = useQueryClient();

    const configQuery = useQuery({
        queryKey: META_CAPI_CONFIG_QUERY_KEY,
        enabled,
        staleTime: 60 * 1000,
        queryFn: () => metaCapiClient.fetchConfig(),
    });

    const saveConfigMutation = useMutation({
        mutationFn: (params: SaveMetaCapiConfigParams) =>
            metaCapiClient.saveConfig(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: META_CAPI_CONFIG_QUERY_KEY });
        },
    });

    const testEventMutation = useMutation({
        mutationFn: (params: TestMetaCapiEventParams) =>
            metaCapiClient.testEvent(params),
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
        testEvent: testEventMutation.mutateAsync,
        testEventError: testEventMutation.error,
        resetTestEvent: testEventMutation.reset,
        testingEvent: testEventMutation.isPending,
    };
};

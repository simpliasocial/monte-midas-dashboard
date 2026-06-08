import { supabase } from "@/lib/supabase";
import type {
    MetaCapiConfigResponse,
    MetaCapiEventResponse,
    SaveMetaCapiConfigParams,
    SendMetaCapiEventParams,
    TestMetaCapiEventParams,
} from "@/features/followup/model/metaCapiModel";

const errorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    const record = error && typeof error === "object" ? error as { message?: unknown } : {};
    return String(record.message || "No se pudo comunicar con Meta CAPI.");
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

const assertEventResponse = (payload: MetaCapiEventResponse & { error?: string }) => {
    if (!payload?.ok) {
        throw new Error(payload?.error || "No se pudo enviar el evento a Meta CAPI.");
    }

    return payload;
};

export const metaCapiClient = {
    async fetchConfig() {
        const { data, error } = await supabase.functions.invoke("meta-capi", {
            body: { action: "get_config" },
        });

        if (error) throw new Error(await parseFunctionError(error));

        const payload = data as MetaCapiConfigResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo cargar la configuracion de Meta CAPI.");
        }

        return payload.config;
    },

    async saveConfig(params: SaveMetaCapiConfigParams) {
        const { data, error } = await supabase.functions.invoke("meta-capi", {
            body: {
                action: "save_config",
                graphVersion: params.graphVersion,
                datasetId: params.datasetId,
                accessToken: params.accessToken,
                eventSourceUrl: params.eventSourceUrl,
                eventName: params.eventName,
                source: params.source,
                systemName: params.systemName,
                appointmentStatus: params.appointmentStatus,
                actionSource: params.actionSource,
                defaultChannel: params.defaultChannel,
                clientUserAgent: params.clientUserAgent,
                testEventCode: params.testEventCode,
                enabled: params.enabled,
            },
        });

        if (error) throw new Error(await parseFunctionError(error));

        const payload = data as MetaCapiConfigResponse & { error?: string };
        if (!payload?.ok) {
            throw new Error(payload?.error || "No se pudo guardar la configuracion de Meta CAPI.");
        }

        return payload.config;
    },

    async sendEvent(params: SendMetaCapiEventParams) {
        const { data, error } = await supabase.functions.invoke("meta-capi", {
            body: {
                action: "send_event",
                eventKind: params.eventKind,
                lead: params.lead,
                channel: params.channel,
                appointmentDate: params.appointmentDate,
                appointmentTime: params.appointmentTime,
            },
        });

        if (error) throw new Error(await parseFunctionError(error));
        return assertEventResponse(data as MetaCapiEventResponse & { error?: string });
    },

    async testEvent(params: TestMetaCapiEventParams) {
        const { data, error } = await supabase.functions.invoke("meta-capi", {
            body: {
                action: "test_event",
                lead: params.lead,
                channel: params.channel,
                appointmentDate: params.appointmentDate,
                appointmentTime: params.appointmentTime,
                testEventCode: params.testEventCode,
            },
        });

        if (error) throw new Error(await parseFunctionError(error));
        return assertEventResponse(data as MetaCapiEventResponse & { error?: string });
    },
};

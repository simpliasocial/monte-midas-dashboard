export interface MetaCapiConfig {
    configured: boolean;
    accountId: number;
    graphVersion: string;
    datasetId: string;
    tokenLast4: string;
    eventSourceUrl: string;
    eventName: string;
    source: string;
    systemName: string;
    appointmentStatus: string;
    actionSource: string;
    defaultChannel: string;
    clientUserAgent: string;
    testEventCode: string;
    enabled: boolean;
    configuredAt?: string;
    updatedAt?: string;
}

export interface MetaCapiConfigResponse {
    ok: boolean;
    config: MetaCapiConfig;
}

export interface SaveMetaCapiConfigParams {
    graphVersion: string;
    datasetId: string;
    accessToken?: string;
    eventSourceUrl: string;
    eventName: string;
    source: string;
    systemName: string;
    appointmentStatus: string;
    actionSource: string;
    defaultChannel: string;
    clientUserAgent: string;
    testEventCode?: string;
    enabled: boolean;
}

export type MetaCapiEventKind = "appointment" | "sale" | "test";

export interface MetaCapiLeadPayload {
    id?: number | string;
    fullName?: string;
    email?: string;
    phone?: string;
    conversationId?: string | number;
    meetingId?: string | number;
    clientUserAgent?: string;
}

export interface SendMetaCapiEventParams {
    eventKind: Exclude<MetaCapiEventKind, "test">;
    lead: MetaCapiLeadPayload;
    channel: string;
    appointmentDate: string;
    appointmentTime: string;
}

export interface TestMetaCapiEventParams {
    lead: Required<Pick<MetaCapiLeadPayload, "fullName">> & MetaCapiLeadPayload;
    channel: string;
    appointmentDate: string;
    appointmentTime: string;
    testEventCode?: string;
}

export interface MetaCapiEventResponse {
    ok: boolean;
    sent: boolean;
    skipped: boolean;
    reason?: string;
    testMode?: boolean;
    eventId?: string;
    response?: unknown;
    error?: string;
}

export const META_CAPI_DEFAULT_CONFIG: MetaCapiConfig = {
    configured: false,
    accountId: 0,
    graphVersion: "v20.0",
    datasetId: "",
    tokenLast4: "",
    eventSourceUrl: "",
    eventName: "Schedule",
    source: "chatwoot",
    systemName: "Simplia Leads",
    appointmentStatus: "scheduled",
    actionSource: "website",
    defaultChannel: "whatsapp",
    clientUserAgent: "Mozilla/5.0",
    testEventCode: "",
    enabled: true,
};

export const META_CAPI_DEFAULT_TEST_EVENT: TestMetaCapiEventParams = {
    lead: {
        fullName: "Juan Gomez",
        email: "juan@gmail.com",
        phone: "593980267511",
        conversationId: "test-capi-conversation",
        meetingId: "test-capi-meeting",
    },
    channel: "whatsapp",
    appointmentDate: "",
    appointmentTime: "15:00:00",
};

import type { UnknownRecord } from "../common/types";

export type LeadStage = "sale" | "appointment" | "unqualified" | "followup" | "sql" | "other";
export type DataOrigin = "api" | "supabase" | "cache";
export type ScoreBucket = "hot" | "warm" | "cold";

export interface ConversationMessage {
    id?: number | string;
    content?: string;
    content_type?: string;
    content_attributes?: UnknownRecord;
    additional_attributes?: UnknownRecord;
    attachments?: unknown[];
    sender?: UnknownRecord;
    sender_id?: number | string;
    status?: string;
    created_at?: number | string;
    created_at_chatwoot?: string;
    timestamp?: number | string;
    message_type?: number | string;
    message_direction?: string;
    sender_type?: string;
    private?: boolean;
    is_private?: boolean;
}

export interface Inbox {
    id: number;
    name?: string;
    channel_type?: string;
    channel?: unknown;
    provider?: string;
    slug?: string;
    website_url?: string;
    website_token?: string;
    raw_payload?: UnknownRecord;
}

export interface ConversationParticipant {
    id?: number | string;
    name?: string;
    email?: string;
    phone_number?: string;
    identifier?: string;
    custom_attributes?: UnknownRecord;
    additional_attributes?: UnknownRecord;
}

export interface ConversationAssignee {
    name?: string;
    email?: string;
}

export interface LeadLike {
    id?: number;
    status?: string;
    labels?: string[];
    resolvedLabels?: string[];
    historical_labels?: string[];
    timestamp?: number;
    created_at?: number;
    first_reply_created_at?: number;
    waiting_since?: number;
    inbox_id?: number;
    chatwoot_account_id?: number;
    channel?: string;
    channel_name?: string;
    channel_type?: string;
    source?: DataOrigin;
    perfil_url?: string;
    raw_payload?: UnknownRecord;
    meta?: {
        sender?: ConversationParticipant;
        assignee?: ConversationAssignee;
    };
    custom_attributes?: UnknownRecord;
    conversation_custom_attributes?: UnknownRecord;
    contact_custom_attributes?: UnknownRecord;
    resolved_custom_attributes?: UnknownRecord;
    resolvedAttrs?: UnknownRecord;
    messages?: ConversationMessage[];
    last_non_activity_message?: ConversationMessage;
}

export interface LeadStageTagConfig {
    sqlTags?: string[];
    appointmentTags?: string[];
    saleTags?: string[];
    unqualifiedTags?: string[];
    humanFollowupQueueTags?: string[];
    humanAppointmentTargetLabel?: string;
    humanSalesQueueTags?: string[];
    humanSaleTargetLabel?: string;
}

export interface ScoreThresholds {
    hotMin: number;
    warmMin: number;
    coldMin?: number;
    highMin?: number;
    mediumMin?: number;
}

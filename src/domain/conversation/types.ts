import type { DataOrigin, ConversationAssignee, ConversationMessage } from "../lead";
import type { UnknownRecord } from "../common/types";

export interface ConversationSender {
    id?: number | string;
    name?: string;
    email?: string;
    phone_number?: string;
    thumbnail?: string;
    identifier?: string;
    custom_attributes?: UnknownRecord;
    additional_attributes?: UnknownRecord;
}

export interface ChatwootConversation {
    id: number;
    account_id?: number;
    chatwoot_account_id?: number;
    status: string;
    inbox_id: number;
    channel?: string;
    channel_name?: string;
    channel_type?: string;
    messages: ConversationMessage[];
    meta: {
        sender: ConversationSender;
        assignee?: ConversationAssignee;
    };
    labels: string[];
    last_non_activity_message: ConversationMessage;
    timestamp: number;
    created_at?: number;
    first_reply_created_at?: number;
    waiting_since?: number;
    custom_attributes?: UnknownRecord;
    conversation_custom_attributes?: UnknownRecord;
    contact_custom_attributes?: UnknownRecord;
    resolved_custom_attributes?: UnknownRecord;
    raw_payload?: UnknownRecord;
    source?: DataOrigin;
}

export interface MinifiedConversation {
    id: number;
    status: string;
    labels: string[];
    historical_labels?: string[];
    timestamp: number;
    created_at?: number;
    first_reply_created_at?: number;
    waiting_since?: number;
    meta: {
        sender: ConversationSender;
        assignee?: ConversationAssignee;
    };
    custom_attributes?: UnknownRecord;
    conversation_custom_attributes?: UnknownRecord;
    contact_custom_attributes?: UnknownRecord;
    resolved_custom_attributes?: UnknownRecord;
    messages?: ConversationMessage[];
    inbox_id?: number;
    chatwoot_account_id?: number;
    channel?: string;
    channel_name?: string;
    channel_type?: string;
    last_non_activity_message?: ConversationMessage;
    source?: DataOrigin;
    perfil_url?: string;
    raw_payload?: UnknownRecord;
}

export interface IncomingMessageTrafficEvent {
    id: string;
    conversationId: number;
    inboxId?: number;
    createdAtIso: string;
    createdAtUnix: number;
    date: string;
    hour: number;
    hourLabel: string;
    source: "api" | "supabase";
}

export type LabelEventSource = "dashboard" | "webhook" | "sync_diff" | "repair" | "manual_import";

export interface ConversationLabelEvent {
    id?: number;
    chatwoot_conversation_id: number;
    previous_labels: string[];
    next_labels: string[];
    added_labels: string[];
    removed_labels: string[];
    event_source: LabelEventSource;
    occurred_at: string;
    detected_at?: string;
    raw_payload?: UnknownRecord;
    event_key?: string;
}

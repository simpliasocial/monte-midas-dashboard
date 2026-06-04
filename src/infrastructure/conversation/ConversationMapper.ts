import type { ChatwootConversation, MinifiedConversation } from "../../domain/conversation";
import type { ConversationMessage } from "../../domain/lead";
import type { UnknownRecord } from "../../domain/common/types";
import { parseTimestampToUnix } from "../../shared/time/timestamps";

export const parseDateToUnix = parseTimestampToUnix;

const isObject = (value: unknown): value is UnknownRecord =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asObject = (value: unknown): UnknownRecord =>
    isObject(value) ? value : {};

const compactObject = (obj: UnknownRecord) =>
    Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ""));

const asStringArray = (value: unknown) =>
    Array.isArray(value)
        ? value.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

const asMessages = (value: unknown): ConversationMessage[] =>
    Array.isArray(value) ? value.filter(isObject).map((message) => message as ConversationMessage) : [];

const toNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const asText = (value: unknown, fallback = "") =>
    value === undefined || value === null ? fallback : String(value);

const firstText = (...values: unknown[]) => {
    for (const value of values) {
        if (typeof value !== "string" && typeof value !== "number") continue;
        const text = asText(value).trim();
        if (text) return text;
    }
    return "";
};

const maxDateToUnix = (...values: unknown[]) =>
    Math.max(0, ...values.map(parseDateToUnix).filter((value) => Number.isFinite(value)));

export const mapChatwootConversationToMinified = (conversation: unknown, inboxHint?: unknown): MinifiedConversation => {
    const conv = asObject(conversation);
    const meta = asObject(conv.meta);
    const sender = asObject(meta.sender);
    const assignee = asObject(meta.assignee);
    const embeddedInbox = asObject(conv.inbox);
    const channelRecord = asObject(conv.channel);
    const inbox = {
        ...asObject(inboxHint),
        ...embeddedInbox,
    };
    const channelType = firstText(conv.channel_type, inbox.channel_type, channelRecord.channel_type, channelRecord.type);
    const channelName = firstText(conv.channel_name, inbox.name, channelRecord.name);
    const channel = firstText(
        conv.channel,
        conv.provider,
        channelRecord.provider,
        channelRecord.type,
        channelRecord.name,
        inbox.provider,
        inbox.slug,
        channelName,
        channelType,
    );

    return {
        id: toNumber(conv.id),
        chatwoot_account_id: toOptionalNumber(conv.account_id || conv.chatwoot_account_id),
        status: asText(conv.status, "open"),
        labels: asStringArray(conv.labels),
        timestamp: maxDateToUnix(conv.updated_at, conv.last_activity_at, conv.timestamp, conv.created_at),
        created_at: parseDateToUnix(conv.created_at || conv.created_at_chatwoot || conv.timestamp),
        first_reply_created_at: parseDateToUnix(conv.first_reply_created_at),
        waiting_since: parseDateToUnix(conv.waiting_since),
        meta: {
            sender: {
                id: toOptionalNumber(sender.id || conv.contact_id),
                name: asText(sender.name),
                email: asText(sender.email),
                phone_number: asText(sender.phone_number),
                identifier: asText(sender.identifier) || undefined,
                custom_attributes: asObject(sender.custom_attributes),
                additional_attributes: asObject(sender.additional_attributes || conv.additional_attributes),
            },
            assignee: {
                name: asText(assignee.name) || undefined,
                email: asText(assignee.email) || undefined,
            },
        },
        custom_attributes: asObject(conv.custom_attributes),
        conversation_custom_attributes: asObject(conv.custom_attributes),
        contact_custom_attributes: asObject(sender.custom_attributes),
        messages: asMessages(conv.messages),
        inbox_id: toOptionalNumber(conv.inbox_id),
        channel_type: channelType || undefined,
        channel_name: channelName || undefined,
        channel: channel || undefined,
        last_non_activity_message: asObject(conv.last_non_activity_message) as ConversationMessage,
        source: "api",
        perfil_url: asText(conv.perfil_url) || undefined,
        raw_payload: conv,
    };
};

export const mapSupabaseConversationRowToMinified = (rowValue: unknown): MinifiedConversation => {
    const row = asObject(rowValue);
    const rawPayload = asObject(row.raw_payload);
    const rawMeta = asObject(rawPayload.meta);
    const rawInbox = asObject(rawPayload.inbox);
    const rawChannel = asObject(rawPayload.channel);
    const rawAdditionalAttributes = asObject(rawPayload.additional_attributes);
    const meta = {
        ...rawMeta,
        ...asObject(row.meta),
    };
    const sender = {
        ...asObject(rawMeta.sender),
        ...asObject(asObject(meta).sender),
    };
    const assignee = asObject(asObject(meta).assignee);
    const contactCustomAttributes = asObject(row.contact_custom_attributes || sender.custom_attributes);
    const conversationCustomAttributes = asObject(row.conversation_custom_attributes || rawPayload.custom_attributes);
    const mappedAttrs = compactObject({
        nombre_completo: row.nombre_completo,
        fecha_visita: row.fecha_visita,
        hora_visita: row.hora_visita,
        agencia: row.agencia,
        celular: row.celular,
        correo: row.correo,
        campana: row.campana,
        ciudad: row.ciudad,
        edad: row.edad,
        canal: row.canal,
        agente: row.agente,
        score_interes: row.score_interes,
        monto_operacion: row.monto_operacion,
        fecha_monto_operacion: row.fecha_monto_operacion,
    });
    const customAttributes = {
        ...asObject(row.custom_attributes),
        ...mappedAttrs,
        ...contactCustomAttributes,
        ...conversationCustomAttributes,
    };
    const lastNonActivity = asObject(rawPayload.last_non_activity_message);
    const channelType = firstText(
        row.channel_type,
        rawPayload.channel_type,
        rawInbox.channel_type,
        rawChannel.channel_type,
        rawChannel.type,
    );
    const channelName = firstText(row.channel_name, rawPayload.channel_name, rawInbox.name, rawChannel.name);
    const channel = firstText(
        row.canal,
        rawPayload.channel,
        rawPayload.provider,
        rawAdditionalAttributes.channel,
        rawAdditionalAttributes.social_channel,
        rawChannel.provider,
        rawChannel.type,
        rawChannel.name,
        rawInbox.provider,
        rawInbox.slug,
        channelName,
        channelType,
    );

    return {
        id: toNumber(row.chatwoot_conversation_id),
        chatwoot_account_id: toOptionalNumber(row.chatwoot_account_id || rawPayload.account_id),
        status: asText(row.status, "open"),
        labels: asStringArray(row.labels),
        timestamp: maxDateToUnix(
            row.updated_at_chatwoot,
            row.last_activity_at_chatwoot,
            row.last_message_at,
            row.created_at_chatwoot,
        ),
        created_at: parseDateToUnix(row.created_at_chatwoot),
        first_reply_created_at: parseDateToUnix(row.first_reply_created_at_chatwoot),
        waiting_since: parseDateToUnix(row.waiting_since_chatwoot),
        meta: {
            sender: {
                id: toOptionalNumber(sender.id || row.chatwoot_contact_id),
                name: asText(sender.name || row.nombre_completo, "Sin Nombre"),
                email: asText(sender.email || row.correo),
                phone_number: asText(sender.phone_number || row.celular),
                identifier: asText(sender.identifier) || undefined,
                additional_attributes: asObject(sender.additional_attributes || asObject(rawMeta.sender).additional_attributes),
                custom_attributes: contactCustomAttributes,
            },
            assignee: {
                name: asText(assignee.name) || undefined,
                email: asText(assignee.email) || undefined,
            },
        },
        custom_attributes: customAttributes,
        conversation_custom_attributes: conversationCustomAttributes,
        contact_custom_attributes: contactCustomAttributes,
        resolved_custom_attributes: customAttributes,
        messages: [],
        inbox_id: toOptionalNumber(row.chatwoot_inbox_id),
        channel_type: channelType || undefined,
        channel_name: channelName || undefined,
        channel: channel || undefined,
        last_non_activity_message: {
            ...lastNonActivity,
            content: asText(row.last_non_activity_message_preview || lastNonActivity.content),
            created_at: parseDateToUnix(row.last_message_at || lastNonActivity.created_at),
        },
        source: "supabase",
        perfil_url: asText(row.perfil_url) || undefined,
        raw_payload: rawPayload,
    };
};

export const mapMinifiedToChatwootConversation = (conversation: MinifiedConversation): ChatwootConversation => ({
    id: conversation.id,
    account_id: conversation.chatwoot_account_id,
    chatwoot_account_id: conversation.chatwoot_account_id,
    status: conversation.status,
    inbox_id: conversation.inbox_id || 0,
    channel: conversation.channel,
    channel_name: conversation.channel_name,
    channel_type: conversation.channel_type,
    messages: conversation.messages || [],
    meta: {
        sender: {
            id: conversation.meta?.sender?.id,
            name: conversation.meta?.sender?.name || "Sin Nombre",
            email: conversation.meta?.sender?.email || "",
            phone_number: conversation.meta?.sender?.phone_number || "",
            thumbnail: "",
            identifier: conversation.meta?.sender?.identifier,
            custom_attributes: conversation.contact_custom_attributes || conversation.meta?.sender?.custom_attributes || {},
            additional_attributes: conversation.meta?.sender?.additional_attributes || {},
        },
        assignee: conversation.meta?.assignee,
    },
    labels: conversation.labels || [],
    last_non_activity_message: {
        content: conversation.last_non_activity_message?.content || (conversation.source === "supabase" ? "Historial de Supabase" : "Ver historial"),
        created_at: conversation.last_non_activity_message?.created_at || conversation.timestamp,
        message_type: conversation.last_non_activity_message?.message_type,
        message_direction: conversation.last_non_activity_message?.message_direction,
        sender_type: conversation.last_non_activity_message?.sender_type,
    },
    timestamp: conversation.timestamp,
    created_at: conversation.created_at,
    first_reply_created_at: conversation.first_reply_created_at,
    waiting_since: conversation.waiting_since,
    custom_attributes: conversation.conversation_custom_attributes || conversation.custom_attributes || {},
    conversation_custom_attributes: conversation.conversation_custom_attributes || {},
    contact_custom_attributes: conversation.contact_custom_attributes || conversation.meta?.sender?.custom_attributes || {},
    resolved_custom_attributes: conversation.resolved_custom_attributes || conversation.custom_attributes || {},
    raw_payload: conversation.raw_payload,
    source: conversation.source,
});

export const mapSupabaseConversationRowToChatwoot = (row: unknown) =>
    mapMinifiedToChatwootConversation(mapSupabaseConversationRowToMinified(row));

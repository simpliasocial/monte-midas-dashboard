import { asRecord, cleanText, normalizeSearchText } from "../common/types";
import type { Inbox, LeadLike } from "./types";

const CHANNEL_ALIAS_LABELS: Array<{ label: string; tokens: string[] }> = [
    { label: "WhatsApp", tokens: ["whatsapp", "whats app", "wa.me", "channel::whatsapp"] },
    { label: "Instagram", tokens: ["instagram", "channel::instagram", "instagramdirect"] },
    { label: "Facebook", tokens: ["facebook", "messenger", "facebookpage", "facebook page", "fb page", "channel::facebookpage"] },
    { label: "Telegram", tokens: ["telegram", "t.me", "tg://", "cwcloudbot_bot"] },
    { label: "TikTok", tokens: ["tiktok", "tik tok", "douyin", "simplia.social"] },
    { label: "Sitio web", tokens: ["webwidget", "web_widget", "web widget", "website", "web site", "sitio web", "pagina web", "livechat", "live chat", "widget"] },
];

export const resolveKnownChannelLabel = (value: unknown) => {
    const normalizedValue = normalizeSearchText(value);
    if (!normalizedValue) return "";

    const matched = CHANNEL_ALIAS_LABELS.find(({ tokens }) =>
        tokens.some((token) => normalizedValue.includes(token)),
    );

    return matched?.label || "";
};

export const cleanStoredChannel = (value: unknown) => {
    const text = cleanText(value);
    const normalized = normalizeSearchText(text);

    return normalized && !["otro", "other", "unknown", "sin canal", "n/a", "na"].includes(normalized)
        ? text
        : "";
};

export const resolveLeadChannel = (lead: LeadLike, inbox?: Inbox | null) => {
    const attrs = lead.resolvedAttrs || lead.resolved_custom_attributes || lead.custom_attributes || {};
    const senderAdditional = lead.meta?.sender?.additional_attributes || {};
    const rawPayload = asRecord(lead.raw_payload);
    const rawInbox = asRecord(rawPayload.inbox);
    const rawChannel = asRecord(rawPayload.channel);
    const rawAdditional = asRecord(rawPayload.additional_attributes);
    const inboxChannel = asRecord(inbox?.channel);
    const hints = [
        attrs.canal,
        attrs.channel,
        attrs.origen,
        lead.channel,
        lead.channel_name,
        lead.channel_type,
        rawPayload.channel_name,
        rawPayload.channel_type,
        rawPayload.provider,
        rawAdditional.channel,
        rawAdditional.social_channel,
        rawAdditional.provider,
        senderAdditional.channel,
        senderAdditional.social_channel,
        senderAdditional.provider,
        senderAdditional.platform,
        senderAdditional.source,
        rawInbox.name,
        rawInbox.channel_type,
        rawInbox.website_url,
        rawInbox.website_token,
        rawInbox.provider,
        rawInbox.slug,
        rawChannel.name,
        rawChannel.channel_type,
        rawChannel.type,
        rawChannel.provider,
        inbox?.name,
        inbox?.website_url,
        inbox?.website_token,
        inbox?.channel_type,
        inbox?.provider,
        inbox?.slug,
        inboxChannel.type,
    ].filter(Boolean).join(" ");

    return resolveKnownChannelLabel(lead.channel_type)
        || resolveKnownChannelLabel(inbox?.channel_type)
        || resolveKnownChannelLabel(hints)
        || cleanStoredChannel(attrs.canal)
        || "Otro";
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupabaseClient = ReturnType<typeof createClient>;
type UnknownRecord = Record<string, any>;

const DEFAULT_ACCOUNT_ID = 0;

const cleanText = (value: unknown) => String(value ?? "").trim();

const asObject = (value: unknown): UnknownRecord =>
    value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};

const errorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
};

const jsonResponse = (payload: Record<string, unknown>, init?: ResponseInit) =>
    new Response(JSON.stringify(payload), {
        ...init,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers || {}) },
    });

const normalizeAccountId = (value: unknown) => {
    const numeric = Number(value ?? DEFAULT_ACCOUNT_ID);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : DEFAULT_ACCOUNT_ID;
};

const normalizeVersion = (value: unknown) => {
    const version = cleanText(value || "v20.0");
    return version.startsWith("v") ? version : `v${version}`;
};

const normalizeAccessToken = (value: unknown) =>
    cleanText(value).replace(/^Bearer\s+/i, "").trim();

const tokenLastFour = (value: string) => value.slice(-4);

const normalizeChannel = (value: unknown, fallback: string) => {
    const text = cleanText(value || fallback)
        .replace(/^Channel::/i, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
    return text || fallback;
};

const normalizeEmail = (value: unknown) =>
    cleanText(value).toLowerCase();

const normalizePhone = (value: unknown) => {
    let text = cleanText(value).replace(/\D/g, "");
    if (text.startsWith("09") && text.length === 10) {
        text = `593${text.slice(1)}`;
    }
    return text;
};

const normalizeNameText = (value: unknown) =>
    cleanText(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const splitFullName = (value: unknown) => {
    const clean = normalizeNameText(value)
        .replace(/[^a-zñ\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const parts = clean.split(" ").filter(Boolean);
    return {
        firstName: parts[0] || "",
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
    };
};

const sha256Hex = async (value: string) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

const getAuthProfile = async (supabase: SupabaseClient, authHeader: string | null) => {
    const jwt = cleanText(authHeader).replace(/^Bearer\s+/i, "");
    if (!jwt) return null;

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) return null;

    const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (error) return null;
    const role = cleanText((data as { role?: unknown } | null)?.role) || null;
    return { userId: userData.user.id, role };
};

const canConfigureMetaCapi = (role: string | null) => role === "platform_admin";

const canSendMetaCapi = (role: string | null) =>
    role === "platform_admin" || role === "company_admin" || role === "operator";

const readMetaCapiConfig = async (supabase: SupabaseClient, accountId: number) => {
    const { data, error } = await supabase
        .schema("cw")
        .from("meta_capi_configs")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

    if (error) throw error;
    return data as UnknownRecord | null;
};

const toPublicConfig = (config: UnknownRecord | null) => {
    const accessToken = normalizeAccessToken(config?.access_token);
    return {
        configured: Boolean(cleanText(config?.dataset_id) && (cleanText(config?.token_last_four) || accessToken)),
        accountId: normalizeAccountId(config?.account_id),
        graphVersion: normalizeVersion(config?.graph_version),
        datasetId: cleanText(config?.dataset_id),
        tokenLast4: cleanText(config?.token_last_four) || (accessToken ? tokenLastFour(accessToken) : ""),
        eventSourceUrl: cleanText(config?.event_source_url),
        eventName: cleanText(config?.event_name) || "Schedule",
        source: cleanText(config?.source) || "chatwoot",
        systemName: cleanText(config?.system_name) || "Simplia Leads",
        appointmentStatus: cleanText(config?.appointment_status) || "scheduled",
        actionSource: cleanText(config?.action_source) || "website",
        defaultChannel: cleanText(config?.default_channel) || "whatsapp",
        clientUserAgent: cleanText(config?.client_user_agent) || "Mozilla/5.0",
        testEventCode: cleanText(config?.test_event_code),
        enabled: config?.enabled !== false,
        configuredAt: cleanText(config?.configured_at),
        updatedAt: cleanText(config?.updated_at),
    };
};

const saveMetaCapiConfig = async (
    supabase: SupabaseClient,
    params: {
        accountId: number;
        userId: string;
        graphVersion: unknown;
        datasetId: unknown;
        accessToken: unknown;
        eventSourceUrl: unknown;
        eventName: unknown;
        source: unknown;
        systemName: unknown;
        appointmentStatus: unknown;
        actionSource: unknown;
        defaultChannel: unknown;
        clientUserAgent: unknown;
        testEventCode: unknown;
        enabled: unknown;
    },
) => {
    const existingConfig = await readMetaCapiConfig(supabase, params.accountId);
    const incomingToken = normalizeAccessToken(params.accessToken);
    const accessToken = incomingToken || normalizeAccessToken(existingConfig?.access_token);
    const datasetId = cleanText(params.datasetId || existingConfig?.dataset_id);
    const eventSourceUrl = cleanText(params.eventSourceUrl || existingConfig?.event_source_url);
    const eventName = cleanText(params.eventName || existingConfig?.event_name || "Schedule");
    const source = cleanText(params.source || existingConfig?.source || "chatwoot");
    const systemName = cleanText(params.systemName || existingConfig?.system_name || "Simplia Leads");
    const appointmentStatus = cleanText(params.appointmentStatus || existingConfig?.appointment_status || "scheduled");
    const actionSource = cleanText(params.actionSource || existingConfig?.action_source || "website");
    const defaultChannel = normalizeChannel(params.defaultChannel || existingConfig?.default_channel || "whatsapp", "whatsapp");
    const clientUserAgent = cleanText(params.clientUserAgent || existingConfig?.client_user_agent || "Mozilla/5.0");
    const graphVersion = normalizeVersion(params.graphVersion || existingConfig?.graph_version || "v20.0");
    const testEventCode = cleanText(params.testEventCode);

    if (!datasetId) throw new Error("Ingresa el dataset_id de Meta CAPI.");
    if (!accessToken) throw new Error("Ingresa el access_token de Meta CAPI.");
    if (accessToken.length < 20) throw new Error("El access_token de Meta CAPI parece incompleto.");
    if (!eventSourceUrl) throw new Error("Ingresa el event_source_url.");
    if (!systemName) throw new Error("Ingresa el system_name.");

    try {
        const parsedUrl = new URL(eventSourceUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("URL inválida");
    } catch {
        throw new Error("El event_source_url debe ser una URL valida.");
    }

    const now = new Date().toISOString();
    const row = {
        account_id: params.accountId,
        graph_version: graphVersion,
        dataset_id: datasetId,
        access_token: accessToken,
        token_last_four: tokenLastFour(accessToken),
        event_source_url: eventSourceUrl,
        event_name: eventName,
        source,
        system_name: systemName,
        appointment_status: appointmentStatus,
        action_source: actionSource,
        default_channel: defaultChannel,
        client_user_agent: clientUserAgent,
        test_event_code: testEventCode,
        enabled: params.enabled === undefined ? true : params.enabled !== false,
        configured_by: params.userId,
        configured_at: now,
        updated_at: now,
    };

    const { error } = await supabase
        .schema("cw")
        .from("meta_capi_configs")
        .upsert(row, { onConflict: "account_id" });

    if (error) throw error;
    return toPublicConfig(row);
};

const extractLead = (body: UnknownRecord) => {
    const lead = asObject(body.lead);
    return {
        email: cleanText(body.email || lead.email),
        phone: cleanText(body.phone || lead.phone),
        fullName: cleanText(body.fullName || body.full_name || lead.fullName || lead.full_name || lead.name),
        conversationId: cleanText(body.conversationId || body.conversation_id || lead.conversationId || lead.conversation_id || lead.id),
        meetingId: cleanText(body.meetingId || body.meeting_id || lead.meetingId || lead.meeting_id || lead.id),
        clientUserAgent: cleanText(body.clientUserAgent || body.client_user_agent || lead.clientUserAgent || lead.client_user_agent),
    };
};

const buildCapiPayload = async (config: UnknownRecord, body: UnknownRecord, eventKind: string) => {
    const publicConfig = toPublicConfig(config);
    const lead = extractLead(body);
    const normalizedEmail = normalizeEmail(lead.email);
    const normalizedPhone = normalizePhone(lead.phone);
    const nameParts = splitFullName(lead.fullName);
    const channel = normalizeChannel(body.channel || body.canal || body.sourceChannel, publicConfig.defaultChannel);
    const appointmentDate = cleanText(body.appointmentDate || body.appointment_date || body.fecha_visita || body.fecha_monto_operacion);
    const appointmentTime = cleanText(body.appointmentTime || body.appointment_time || body.hora_visita);
    const meetingId = cleanText(lead.meetingId || lead.conversationId || crypto.randomUUID());
    const eventName = cleanText(body.eventName || body.event_name || publicConfig.eventName) || "Schedule";

    const userData: UnknownRecord = {};
    if (normalizedEmail) userData.em = [await sha256Hex(normalizedEmail)];
    if (normalizedPhone) userData.ph = [await sha256Hex(normalizedPhone)];
    if (nameParts.firstName) userData.fn = [await sha256Hex(nameParts.firstName)];
    if (nameParts.lastName) userData.ln = [await sha256Hex(nameParts.lastName)];
    userData.client_user_agent = cleanText(lead.clientUserAgent || publicConfig.clientUserAgent) || "Mozilla/5.0";
    if (lead.conversationId) userData.external_id = [await sha256Hex(lead.conversationId)];

    if (!userData.em && !userData.ph && !userData.fn && !userData.ln) {
        return {
            shouldSend: false,
            reason: "Not enough user data for Meta CAPI. Missing email, phone, or full name.",
            eventId: "",
            payload: null,
            conversationId: lead.conversationId,
            meetingId,
            testMode: false,
        };
    }

    const dateKey = appointmentDate || new Date().toISOString().slice(0, 10);
    const eventId = [
        eventName.toLowerCase(),
        publicConfig.systemName.toLowerCase().replace(/\s+/g, "_"),
        channel,
        dateKey,
        meetingId,
    ].join("_");

    const payload: UnknownRecord = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: publicConfig.actionSource,
            event_source_url: publicConfig.eventSourceUrl,
            event_id: eventId,
            user_data: userData,
            custom_data: {
                source: publicConfig.source,
                system: publicConfig.systemName,
                appointment_status: publicConfig.appointmentStatus,
                channel,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                conversation_id: lead.conversationId,
                meeting_id: meetingId,
                event_kind: eventKind,
            },
        }],
    };

    const testEventCode = cleanText(body.testEventCode || body.test_event_code || publicConfig.testEventCode);
    if (testEventCode) payload.test_event_code = testEventCode;

    return {
        shouldSend: true,
        reason: "",
        eventId,
        payload,
        conversationId: lead.conversationId,
        meetingId,
        testMode: Boolean(testEventCode),
    };
};

const logCapiEvent = async (
    supabase: SupabaseClient,
    row: {
        accountId: number;
        eventKind: string;
        conversationId?: string;
        meetingId?: string;
        eventName?: string;
        eventId?: string;
        status: "success" | "error" | "skipped";
        testMode?: boolean;
        requestPayload?: unknown;
        responsePayload?: unknown;
        errorMessage?: string;
    },
) => {
    const { error } = await supabase
        .schema("cw")
        .from("meta_capi_events")
        .insert({
            account_id: row.accountId,
            event_kind: row.eventKind,
            conversation_id: row.conversationId || null,
            meeting_id: row.meetingId || null,
            event_name: row.eventName || null,
            event_id: row.eventId || null,
            status: row.status,
            test_mode: Boolean(row.testMode),
            request_payload: row.requestPayload || {},
            response_payload: row.responsePayload || {},
            error_message: row.errorMessage || null,
            sent_at: row.status === "skipped" ? null : new Date().toISOString(),
        });

    if (error) console.error("Could not log Meta CAPI event:", error);
};

const sendPayloadToMeta = async (config: UnknownRecord, payload: UnknownRecord) => {
    const version = normalizeVersion(config.graph_version);
    const datasetId = cleanText(config.dataset_id);
    const token = normalizeAccessToken(config.access_token);
    const url = new URL(`https://graph.facebook.com/${version}/${datasetId}/events`);
    url.searchParams.set("access_token", token);

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
        throw new Error(`Meta CAPI falló: ${response.status} ${text.slice(0, 700)}`);
    }
    return body;
};

const handleSendEvent = async (
    supabase: SupabaseClient,
    accountId: number,
    body: UnknownRecord,
    eventKind: "appointment" | "sale" | "test",
) => {
    const config = await readMetaCapiConfig(supabase, accountId);
    if (!config || config.enabled === false || !cleanText(config.dataset_id) || !normalizeAccessToken(config.access_token)) {
        await logCapiEvent(supabase, {
            accountId,
            eventKind,
            conversationId: cleanText(asObject(body.lead).id || body.conversationId || body.conversation_id),
            status: "skipped",
            errorMessage: config?.enabled === false ? "Meta CAPI esta desactivado." : "Meta CAPI no esta configurado.",
        });
        const reason = config?.enabled === false ? "Meta CAPI esta desactivado." : "Meta CAPI no esta configurado.";
        return jsonResponse({
            ok: true,
            sent: false,
            skipped: true,
            reason,
            config: toPublicConfig(config),
        });
    }

    const built = await buildCapiPayload(config, body, eventKind);
    if (!built.shouldSend || !built.payload) {
        await logCapiEvent(supabase, {
            accountId,
            eventKind,
            conversationId: built.conversationId,
            meetingId: built.meetingId,
            status: "skipped",
            testMode: built.testMode,
            errorMessage: built.reason,
        });
        return jsonResponse({
            ok: true,
            sent: false,
            skipped: true,
            reason: built.reason,
            testMode: built.testMode,
        });
    }

    try {
        const responsePayload = await sendPayloadToMeta(config, built.payload);
        await logCapiEvent(supabase, {
            accountId,
            eventKind,
            conversationId: built.conversationId,
            meetingId: built.meetingId,
            eventName: cleanText(built.payload.data?.[0]?.event_name),
            eventId: built.eventId,
            status: "success",
            testMode: built.testMode,
            requestPayload: built.payload,
            responsePayload,
        });

        return jsonResponse({
            ok: true,
            sent: true,
            skipped: false,
            testMode: built.testMode,
            eventId: built.eventId,
            response: responsePayload,
        });
    } catch (error) {
        const message = errorMessage(error);
        await logCapiEvent(supabase, {
            accountId,
            eventKind,
            conversationId: built.conversationId,
            meetingId: built.meetingId,
            eventName: cleanText(built.payload.data?.[0]?.event_name),
            eventId: built.eventId,
            status: "error",
            testMode: built.testMode,
            requestPayload: built.payload,
            errorMessage: message,
        });

        return jsonResponse({
            ok: false,
            sent: false,
            skipped: false,
            testMode: built.testMode,
            eventId: built.eventId,
            error: message,
        }, { status: 502 });
    }
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service role environment variables.");

        const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        const body = await req.json().catch(() => ({}));
        const authProfile = await getAuthProfile(supabase, req.headers.get("Authorization"));
        if (!authProfile?.role) return jsonResponse({ ok: false, error: "No autenticado." }, { status: 401 });

        const action = cleanText(body.action || "send_event") || "send_event";
        const accountId = normalizeAccountId(body.accountId ?? body.account_id);

        if (action === "get_config") {
            if (!canConfigureMetaCapi(authProfile.role)) {
                return jsonResponse({ ok: false, error: "No tienes permisos para configurar Meta CAPI." }, { status: 403 });
            }

            const config = await readMetaCapiConfig(supabase, accountId);
            return jsonResponse({ ok: true, config: toPublicConfig(config) });
        }

        if (action === "save_config") {
            if (!canConfigureMetaCapi(authProfile.role)) {
                return jsonResponse({ ok: false, error: "No tienes permisos para configurar Meta CAPI." }, { status: 403 });
            }

            const config = await saveMetaCapiConfig(supabase, {
                accountId,
                userId: authProfile.userId,
                graphVersion: body.graphVersion ?? body.graph_version,
                datasetId: body.datasetId ?? body.dataset_id,
                accessToken: body.accessToken ?? body.access_token ?? body.bearerToken ?? body.token,
                eventSourceUrl: body.eventSourceUrl ?? body.event_source_url,
                eventName: body.eventName ?? body.event_name,
                source: body.source,
                systemName: body.systemName ?? body.system_name,
                appointmentStatus: body.appointmentStatus ?? body.appointment_status,
                actionSource: body.actionSource ?? body.action_source,
                defaultChannel: body.defaultChannel ?? body.default_channel,
                clientUserAgent: body.clientUserAgent ?? body.client_user_agent,
                testEventCode: body.testEventCode ?? body.test_event_code,
                enabled: body.enabled,
            });

            return jsonResponse({ ok: true, config });
        }

        if (action === "test_event") {
            if (!canConfigureMetaCapi(authProfile.role)) {
                return jsonResponse({ ok: false, error: "No tienes permisos para probar Meta CAPI." }, { status: 403 });
            }
            const config = await readMetaCapiConfig(supabase, accountId);
            const testEventCode = cleanText(body.testEventCode || body.test_event_code || config?.test_event_code);
            if (!testEventCode) {
                return jsonResponse({ ok: false, error: "Configura un test_event_code antes de probar CAPI." }, { status: 400 });
            }
            return await handleSendEvent(supabase, accountId, { ...body, testEventCode }, "test");
        }

        if (!canSendMetaCapi(authProfile.role)) {
            return jsonResponse({ ok: false, error: "No tienes permisos para enviar eventos Meta CAPI." }, { status: 403 });
        }

        const requestedKind = cleanText(body.eventKind || body.event_kind);
        const eventKind = requestedKind === "sale" ? "sale" : "appointment";
        return await handleSendEvent(supabase, accountId, body, eventKind);
    } catch (error) {
        return jsonResponse({
            ok: false,
            error: errorMessage(error),
        }, { status: 500 });
    }
});

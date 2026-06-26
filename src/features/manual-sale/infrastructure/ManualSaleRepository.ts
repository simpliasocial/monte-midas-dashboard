import { supabase } from "@/lib/supabase";
import { config } from "@/config";
import { deterministicNegativeId } from "@/features/import/model/importRowBuilders";
import type { ManualSaleSavePayload, ManualSaleSaveResult } from "../domain/manualSaleTypes";

const stableJson = (value: unknown) => {
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return String(value);
    }
};

export const manualSaleRepository = {
    async saveManualSale(
        payload: ManualSaleSavePayload,
        userId?: string | null,
    ): Promise<ManualSaleSaveResult> {
        const nowIso = new Date().toISOString();
        const cleanName = payload.nombre_completo.trim();
        const cleanPhone = payload.celular.trim();
        const cleanCedula = payload.cedula.trim();
        const sourceSystem = "dashboard_manual";

        // Clave de identidad determinista
        const identityToken = cleanCedula || cleanPhone || `${cleanName}:${payload.fecha_monto_operacion}`;
        const identityKey = `${sourceSystem}:${identityToken}`;
        const externalLeadId = cleanCedula ? `cedula:${cleanCedula}` : cleanPhone ? `phone:${cleanPhone}` : `manual:${cleanName}:${nowIso.slice(0, 10)}`;

        const conversationId = deterministicNegativeId(`manual_sale:conversation:${identityKey}`);
        const contactId = deterministicNegativeId(`manual_sale:contact:${identityKey}`);

        const contactCustomAttrs = {
            nombre_completo: cleanName,
            celular: cleanPhone || undefined,
            cedula: cleanCedula || undefined,
            source_system: sourceSystem,
            external_lead_id: externalLeadId,
        };

        const conversationCustomAttrs = {
            nombre_completo: cleanName,
            celular: cleanPhone || undefined,
            cedula: cleanCedula || undefined,
            canal: "Ingreso Manual",
            monto_operacion: payload.monto_operacion_raw,
            monto_operacion_numero: payload.monto_operacion_numero,
            fecha_monto_operacion: payload.fecha_monto_operacion,
            agencia: payload.agencia || undefined,
            responsable: payload.responsable || undefined,
            agente: payload.responsable || undefined,
            estado_importado: payload.target_label,
            source_system: sourceSystem,
            external_lead_id: externalLeadId,
            import_identity: identityKey,
        };

        const contactRow = {
            chatwoot_contact_id: contactId,
            lead_identity_key: identityKey,
            identifier: externalLeadId,
            name: cleanName || "Sin Nombre",
            phone_number: cleanPhone || null,
            email: null,
            additional_attributes: {
                manual_entry: true,
                source_system: sourceSystem,
                agencia: payload.agencia || null,
                responsable: payload.responsable || null,
            },
            custom_attributes: contactCustomAttrs,
            created_at_chatwoot: nowIso,
            last_activity_at_chatwoot: nowIso,
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            raw_payload: {
                source: "manual_sale",
                source_system: sourceSystem,
                external_lead_id: externalLeadId,
                entered_by: userId || null,
            },
            updated_at: nowIso,
        };

        const conversationRow = {
            chatwoot_conversation_id: conversationId,
            chatwoot_contact_id: contactId,
            chatwoot_account_id: Number(config.chatwoot?.accountId) || null,
            status: "open",
            labels: [payload.target_label],
            business_stage_current: payload.target_label,
            additional_attributes: {
                manual_entry: true,
                source_system: sourceSystem,
            },
            contact_custom_attributes: contactCustomAttrs,
            conversation_custom_attributes: conversationCustomAttrs,
            custom_attributes: conversationCustomAttrs,
            meta: {
                sender: {
                    id: contactId,
                    name: cleanName || "Sin Nombre",
                    email: "",
                    phone_number: cleanPhone || "",
                    identifier: externalLeadId,
                    custom_attributes: contactCustomAttrs,
                    additional_attributes: {
                        manual_entry: true,
                        source_system: sourceSystem,
                    },
                },
                assignee: payload.responsable ? { name: payload.responsable } : {},
            },
            inbox_name: "Ingreso Manual",
            channel_type: "Manual",
            created_at_chatwoot: nowIso,
            updated_at_chatwoot: nowIso,
            last_activity_at_chatwoot: nowIso,
            first_message_at: nowIso,
            last_message_at: nowIso,
            total_messages: 0,
            raw_payload: {
                source: "manual_sale",
                source_system: sourceSystem,
                external_lead_id: externalLeadId,
                entered_by: userId || null,
            },
            nombre_completo: cleanName || null,
            celular: cleanPhone || null,
            correo: null,
            campana: null,
            ciudad: null,
            canal: "Ingreso Manual",
            score_interes: null,
            monto_operacion: payload.monto_operacion_raw || null,
            fecha_monto_operacion: payload.fecha_monto_operacion || null,
            source_system: sourceSystem,
            external_lead_id: externalLeadId,
            import_batch_id: null,
            imported_at: nowIso,
            imported_by: userId || null,
            updated_at: nowIso,
        };

        const labelEventRow = {
            chatwoot_conversation_id: conversationId,
            previous_labels: [],
            next_labels: [payload.target_label],
            added_labels: [payload.target_label],
            removed_labels: [],
            event_source: "dashboard",
            occurred_at: nowIso,
            detected_at: nowIso,
            raw_payload: {
                source: "manual_sale",
                entered_by: userId || null,
            },
            event_key: `manual_sale:${conversationId}:${nowIso}:${payload.target_label}`,
        };

        const amountHistoryRow = {
            chatwoot_conversation_id: conversationId,
            attribute_key: "monto_operacion",
            old_value: null,
            new_value: payload.monto_operacion_raw,
            changed_at: nowIso,
            change_source: "manual",
            event_key: `manual_sale:${conversationId}:${nowIso}:monto_operacion`,
        };

        // Guardado transaccional
        const { error: contactErr } = await supabase
            .schema("cw")
            .from("contacts_current")
            .upsert([contactRow], { onConflict: "chatwoot_contact_id" });
        if (contactErr) throw contactErr;

        const { error: convErr } = await supabase
            .schema("cw")
            .from("conversations_current")
            .upsert([conversationRow], { onConflict: "chatwoot_conversation_id" });
        if (convErr) throw convErr;

        const { error: labelErr } = await supabase
            .schema("cw")
            .from("conversation_label_events")
            .upsert([labelEventRow], { onConflict: "event_key", ignoreDuplicates: true });
        if (labelErr) throw labelErr;

        const { error: attrErr } = await supabase
            .schema("cw")
            .from("conversation_attribute_history")
            .upsert([amountHistoryRow], { onConflict: "event_key", ignoreDuplicates: true });
        if (attrErr) throw attrErr;

        return {
            conversationId,
            contactId,
            identityKey,
        };
    },
};

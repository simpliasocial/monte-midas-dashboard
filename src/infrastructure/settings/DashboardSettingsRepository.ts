import type { DashboardSettingsRepository as DashboardSettingsPort } from "@/application/dashboard/ports";
import { normalizeTagConfig, type TagConfig } from "@/domain/dashboard";
import { supabase } from "@/lib/supabase";

const TAG_SETTINGS_STORAGE_KEY = "dashboard_tag_settings";
const DEFAULT_ACCOUNT_ID = 0;

type DashboardTagSettingsRow = {
    settings?: Partial<TagConfig> | null;
};

const persistTagSettingsLocally = (config: TagConfig) => {
    const serialized = JSON.stringify(normalizeTagConfig(config));

    try {
        localStorage.setItem(TAG_SETTINGS_STORAGE_KEY, serialized);
    } catch (storageError) {
        try {
            localStorage.removeItem(TAG_SETTINGS_STORAGE_KEY);
            localStorage.setItem(TAG_SETTINGS_STORAGE_KEY, serialized);
        } catch (retryError) {
            console.warn("[Dashboard] Could not persist tag settings in localStorage:", retryError);
        }
    }
};

const readLocalTagSettings = (): TagConfig | null => {
    try {
        const saved = localStorage.getItem(TAG_SETTINGS_STORAGE_KEY);
        if (!saved) return null;
        return normalizeTagConfig(JSON.parse(saved));
    } catch (storageError) {
        console.warn("[Dashboard] Could not read local tag settings:", storageError);
        return null;
    }
};

const normalizeRemoteSettings = (row: DashboardTagSettingsRow | null) => {
    if (!row?.settings) return null;
    return normalizeTagConfig(row.settings);
};

class SupabaseDashboardSettingsRepository implements DashboardSettingsPort {
    async loadTagSettings(accountId = DEFAULT_ACCOUNT_ID): Promise<TagConfig | null> {
        try {
            const { data, error: cwError } = await supabase
                .schema("cw")
                .from("dashboard_tag_settings")
                .select("settings")
                .eq("account_id", accountId)
                .maybeSingle();

            if (cwError) throw cwError;

            const normalizedConfig = normalizeRemoteSettings(data as DashboardTagSettingsRow | null);
            if (normalizedConfig) {
                persistTagSettingsLocally(normalizedConfig);
                return normalizedConfig;
            }
        } catch (cwError) {
            console.warn("[Dashboard] Could not load settings from cw schema:", cwError);
        }

        return readLocalTagSettings();
    }

    async saveTagSettings(config: TagConfig, accountId = DEFAULT_ACCOUNT_ID): Promise<void> {
        const normalizedConfig = normalizeTagConfig(config);
        persistTagSettingsLocally(normalizedConfig);

        try {
            const { error: cwError } = await supabase
                .schema("cw")
                .from("dashboard_tag_settings")
                .upsert(
                    { account_id: accountId, settings: normalizedConfig, updated_at: new Date().toISOString() },
                    { onConflict: "account_id" },
                );

            if (cwError) throw cwError;
            return;
        } catch (cwError) {
            console.error("Failed to save dashboard tag settings in cw schema:", cwError);
            throw cwError;
        }
    }
}

export const dashboardSettingsRepository: DashboardSettingsPort = new SupabaseDashboardSettingsRepository();

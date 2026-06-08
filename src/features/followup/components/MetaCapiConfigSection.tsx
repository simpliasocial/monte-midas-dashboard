import { FormEvent, useEffect, useMemo, useState } from "react";
import { Database, KeyRound, Save, Send, ShieldCheck, TestTube2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getGuayaquilDateString } from "@/lib/guayaquilTime";
import { useMetaCapiConfig } from "../hooks/useMetaCapiConfig";
import {
    META_CAPI_DEFAULT_CONFIG,
    META_CAPI_DEFAULT_TEST_EVENT,
    type SaveMetaCapiConfigParams,
    type TestMetaCapiEventParams,
} from "../model/metaCapiModel";

const getErrorMessage = (error: unknown) => {
    if (!error) return "";
    if (error instanceof Error) return error.message;
    return String(error);
};

type MetaCapiFormState = SaveMetaCapiConfigParams & {
    accessToken: string;
};

const fieldClassName = "grid gap-2";

export const MetaCapiConfigSection = () => {
    const {
        config,
        configLoading,
        configError,
        saveConfig,
        saveConfigError,
        resetSaveConfig,
        savingConfig,
        testEvent,
        testEventError,
        resetTestEvent,
        testingEvent,
    } = useMetaCapiConfig(true);

    const effectiveConfig = useMemo(() => ({
        ...META_CAPI_DEFAULT_CONFIG,
        ...config,
    }), [config]);

    const [form, setForm] = useState<MetaCapiFormState>({
        ...META_CAPI_DEFAULT_CONFIG,
        accessToken: "",
    });
    const [testForm, setTestForm] = useState<TestMetaCapiEventParams>({
        ...META_CAPI_DEFAULT_TEST_EVENT,
        appointmentDate: getGuayaquilDateString(),
    });
    const [lastTestResult, setLastTestResult] = useState("");

    useEffect(() => {
        setForm({
            graphVersion: effectiveConfig.graphVersion,
            datasetId: effectiveConfig.datasetId,
            accessToken: "",
            eventSourceUrl: effectiveConfig.eventSourceUrl,
            eventName: effectiveConfig.eventName,
            source: effectiveConfig.source,
            systemName: effectiveConfig.systemName,
            appointmentStatus: effectiveConfig.appointmentStatus,
            actionSource: effectiveConfig.actionSource,
            defaultChannel: effectiveConfig.defaultChannel,
            clientUserAgent: effectiveConfig.clientUserAgent,
            testEventCode: effectiveConfig.testEventCode,
            enabled: effectiveConfig.enabled,
        });
    }, [effectiveConfig]);

    const hasStoredToken = Boolean(effectiveConfig.tokenLast4);
    const canSave = Boolean(
        form.graphVersion.trim()
        && form.datasetId.trim()
        && form.eventSourceUrl.trim()
        && form.systemName.trim()
        && (form.accessToken.trim() || hasStoredToken)
    );
    const canRunTest = Boolean(effectiveConfig.configured && (form.testEventCode || effectiveConfig.testEventCode));
    const errorMessage = getErrorMessage(saveConfigError || configError);
    const testErrorMessage = getErrorMessage(testEventError);

    const updateForm = (key: keyof MetaCapiFormState, value: string | boolean) => {
        resetSaveConfig();
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateTestLead = (key: keyof TestMetaCapiEventParams["lead"], value: string) => {
        resetTestEvent();
        setLastTestResult("");
        setTestForm((prev) => ({
            ...prev,
            lead: {
                ...prev.lead,
                [key]: value,
            },
        }));
    };

    const updateTestForm = (key: Exclude<keyof TestMetaCapiEventParams, "lead">, value: string) => {
        resetTestEvent();
        setLastTestResult("");
        setTestForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSave || savingConfig) return;

        await saveConfig({
            graphVersion: form.graphVersion.trim() || "v20.0",
            datasetId: form.datasetId.trim(),
            accessToken: form.accessToken.trim() || undefined,
            eventSourceUrl: form.eventSourceUrl.trim(),
            eventName: form.eventName.trim() || "Schedule",
            source: form.source.trim() || "chatwoot",
            systemName: form.systemName.trim(),
            appointmentStatus: form.appointmentStatus.trim() || "scheduled",
            actionSource: form.actionSource.trim() || "website",
            defaultChannel: form.defaultChannel.trim() || "whatsapp",
            clientUserAgent: form.clientUserAgent.trim() || "Mozilla/5.0",
            testEventCode: form.testEventCode?.trim(),
            enabled: form.enabled,
        });
    };

    const handleTest = async () => {
        if (!canRunTest || testingEvent) return;

        const result = await testEvent({
            ...testForm,
            testEventCode: form.testEventCode?.trim(),
        });
        if (result.skipped) {
            setLastTestResult(`Meta CAPI omitido: ${result.reason || "No se envio el evento de prueba."}`);
            return;
        }
        setLastTestResult(result.eventId ? `Evento enviado: ${result.eventId}` : "Evento de prueba enviado a Meta CAPI.");
    };

    return (
        <div className="space-y-5 rounded-xl border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2 font-semibold">
                        <Database className="h-4 w-4 text-primary" />
                        Configurar API CAPI
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Meta CAPI para enviar citas y ventas desde seguimiento con datos hasheados en Supabase.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={effectiveConfig.configured ? "default" : "outline"}>
                        {effectiveConfig.configured ? "Configurado" : "Sin configurar"}
                    </Badge>
                    {effectiveConfig.testEventCode ? (
                        <Badge variant="outline">Test activo</Badge>
                    ) : null}
                </div>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <div>
                            <p className="font-medium">Token protegido en Supabase</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                El navegador no recibe el access_token completo; si ya existe uno, dejar vacío conserva el valor guardado.
                            </p>
                        </div>
                    </div>
                </div>

                {errorMessage ? (
                    <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-graph-version">graph_version</Label>
                        <Input
                            id="meta-capi-graph-version"
                            value={form.graphVersion}
                            onChange={(event) => updateForm("graphVersion", event.target.value)}
                            placeholder="v20.0"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-dataset-id">dataset_id</Label>
                        <Input
                            id="meta-capi-dataset-id"
                            value={form.datasetId}
                            onChange={(event) => updateForm("datasetId", event.target.value)}
                            placeholder="1284299760404128"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label htmlFor="meta-capi-access-token">access_token</Label>
                            {hasStoredToken ? (
                                <Badge variant="outline" className="gap-1">
                                    <KeyRound className="h-3 w-3" />
                                    Termina en {effectiveConfig.tokenLast4}
                                </Badge>
                            ) : null}
                        </div>
                        <Input
                            id="meta-capi-access-token"
                            value={form.accessToken}
                            onChange={(event) => updateForm("accessToken", event.target.value)}
                            placeholder={hasStoredToken ? "Vacío conserva el token guardado" : "EAAB..."}
                            type="password"
                            autoComplete="new-password"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-event-source-url">event_source_url</Label>
                        <Input
                            id="meta-capi-event-source-url"
                            value={form.eventSourceUrl}
                            onChange={(event) => updateForm("eventSourceUrl", event.target.value)}
                            placeholder="https://montemidas.ec/"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-system-name">system_name</Label>
                        <Input
                            id="meta-capi-system-name"
                            value={form.systemName}
                            onChange={(event) => updateForm("systemName", event.target.value)}
                            placeholder="Monte Web"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-event-code">test_event_code</Label>
                        <Input
                            id="meta-capi-test-event-code"
                            value={form.testEventCode || ""}
                            onChange={(event) => updateForm("testEventCode", event.target.value)}
                            placeholder="TEST12345"
                            autoComplete="off"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-event-name">event_name</Label>
                        <Input
                            id="meta-capi-event-name"
                            value={form.eventName}
                            onChange={(event) => updateForm("eventName", event.target.value)}
                            placeholder="Schedule"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-source">source</Label>
                        <Input
                            id="meta-capi-source"
                            value={form.source}
                            onChange={(event) => updateForm("source", event.target.value)}
                            placeholder="chatwoot"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-default-channel">channel por defecto</Label>
                        <Input
                            id="meta-capi-default-channel"
                            value={form.defaultChannel}
                            onChange={(event) => updateForm("defaultChannel", event.target.value)}
                            placeholder="whatsapp"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-appointment-status">appointment_status</Label>
                        <Input
                            id="meta-capi-appointment-status"
                            value={form.appointmentStatus}
                            onChange={(event) => updateForm("appointmentStatus", event.target.value)}
                            placeholder="scheduled"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-action-source">action_source</Label>
                        <Input
                            id="meta-capi-action-source"
                            value={form.actionSource}
                            onChange={(event) => updateForm("actionSource", event.target.value)}
                            placeholder="website"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-client-user-agent">client_user_agent</Label>
                        <Input
                            id="meta-capi-client-user-agent"
                            value={form.clientUserAgent}
                            onChange={(event) => updateForm("clientUserAgent", event.target.value)}
                            placeholder="Mozilla/5.0"
                            disabled={configLoading || savingConfig}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                            checked={form.enabled}
                            onCheckedChange={(checked) => updateForm("enabled", checked === true)}
                            disabled={configLoading || savingConfig}
                        />
                        Activar envio CAPI
                    </label>
                    <Button type="submit" disabled={!canSave || configLoading || savingConfig} className="gap-2">
                        <Save className="h-4 w-4" />
                        {savingConfig ? "Guardando..." : "Guardar API CAPI"}
                    </Button>
                </div>
            </form>

            <Separator />

            <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 font-semibold">
                            <TestTube2 className="h-4 w-4 text-primary" />
                            Probar test CAPI
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Usa datos dummy y el test_event_code para validar el evento en Meta Events Manager.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTest}
                        disabled={!canRunTest || testingEvent}
                        className="gap-2"
                    >
                        <Send className="h-4 w-4" />
                        {testingEvent ? "Probando..." : "Probar test"}
                    </Button>
                </div>

                {testErrorMessage ? (
                    <Alert variant="destructive">
                        <AlertDescription>{testErrorMessage}</AlertDescription>
                    </Alert>
                ) : null}
                {lastTestResult ? (
                    <Alert>
                        <AlertDescription>{lastTestResult}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-4">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-name">full_name</Label>
                        <Input
                            id="meta-capi-test-name"
                            value={testForm.lead.fullName || ""}
                            onChange={(event) => updateTestLead("fullName", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-email">email</Label>
                        <Input
                            id="meta-capi-test-email"
                            value={testForm.lead.email || ""}
                            onChange={(event) => updateTestLead("email", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-phone">phone</Label>
                        <Input
                            id="meta-capi-test-phone"
                            value={testForm.lead.phone || ""}
                            onChange={(event) => updateTestLead("phone", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-channel">channel</Label>
                        <Input
                            id="meta-capi-test-channel"
                            value={testForm.channel}
                            onChange={(event) => updateTestForm("channel", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-date">appointment_date</Label>
                        <Input
                            id="meta-capi-test-date"
                            type="date"
                            value={testForm.appointmentDate}
                            onChange={(event) => updateTestForm("appointmentDate", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-time">appointment_time</Label>
                        <Input
                            id="meta-capi-test-time"
                            type="time"
                            step="1"
                            value={testForm.appointmentTime}
                            onChange={(event) => updateTestForm("appointmentTime", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-conversation-id">conversation_id</Label>
                        <Input
                            id="meta-capi-test-conversation-id"
                            value={testForm.lead.conversationId || ""}
                            onChange={(event) => updateTestLead("conversationId", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                    <div className={fieldClassName}>
                        <Label htmlFor="meta-capi-test-meeting-id">meeting_id</Label>
                        <Input
                            id="meta-capi-test-meeting-id"
                            value={testForm.lead.meetingId || ""}
                            onChange={(event) => updateTestLead("meetingId", event.target.value)}
                            disabled={testingEvent}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

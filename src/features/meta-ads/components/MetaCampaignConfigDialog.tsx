import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Megaphone, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
    MetaAdsCampaignConfig,
    SaveMetaAdsCampaignConfigParams,
} from "../model/metaAdsInsightsModel";

interface MetaCampaignConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config?: MetaAdsCampaignConfig;
    loading?: boolean;
    saving?: boolean;
    error?: unknown;
    onSave: (params: SaveMetaAdsCampaignConfigParams) => Promise<void>;
}

const getErrorMessage = (error: unknown) => {
    if (!error) return "";
    if (error instanceof Error) return error.message;
    return String(error);
};

export const MetaCampaignConfigDialog = ({
    open,
    onOpenChange,
    config,
    loading = false,
    saving = false,
    error,
    onSave,
}: MetaCampaignConfigDialogProps) => {
    const [adAccountId, setAdAccountId] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [graphApiVersion, setGraphApiVersion] = useState("v20.0");

    useEffect(() => {
        if (!open) return;
        setAdAccountId(config?.adAccountId || "");
        setAccessToken("");
        setGraphApiVersion(config?.graphApiVersion || "v20.0");
    }, [config?.adAccountId, config?.graphApiVersion, open]);

    const hasStoredToken = Boolean(config?.tokenLast4);
    const canSave = Boolean(adAccountId.trim() && (accessToken.trim() || hasStoredToken));
    const errorMessage = getErrorMessage(error);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSave || saving) return;

        await onSave({
            adAccountId: adAccountId.trim(),
            accessToken: accessToken.trim() || undefined,
            graphApiVersion: graphApiVersion.trim() || "v20.0",
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-sky-600" />
                        Configurar campañas de Meta Ads
                    </DialogTitle>
                    <DialogDescription>
                        Guarda la cuenta publicitaria y el token de acceso que usará Supabase para traer campañas e insights.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                        <div className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <div>
                                <p className="font-medium">Token protegido en Supabase</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    El dashboard solo mostrará los últimos caracteres del token guardado. El valor completo no se devuelve al navegador.
                                </p>
                            </div>
                        </div>
                    </div>

                    {errorMessage ? (
                        <Alert variant="destructive">
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid gap-2">
                        <Label htmlFor="meta-ad-account-id">ID de cuenta publicitaria</Label>
                        <Input
                            id="meta-ad-account-id"
                            value={adAccountId}
                            onChange={(event) => setAdAccountId(event.target.value)}
                            placeholder="act_1234567890"
                            inputMode="numeric"
                            autoComplete="off"
                            disabled={loading || saving}
                        />
                        <p className="text-xs text-muted-foreground">
                            Puedes pegarlo con o sin el prefijo act_. Se usará para consultar campañas e insights.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label htmlFor="meta-access-token">Bearer Token</Label>
                            {hasStoredToken ? (
                                <Badge variant="outline" className="gap-1">
                                    <KeyRound className="h-3 w-3" />
                                    Termina en {config?.tokenLast4}
                                </Badge>
                            ) : null}
                        </div>
                        <Input
                            id="meta-access-token"
                            value={accessToken}
                            onChange={(event) => setAccessToken(event.target.value)}
                            placeholder={hasStoredToken ? "Dejar vacío para conservar el token guardado" : "Bearer EAAB..."}
                            type="password"
                            autoComplete="new-password"
                            disabled={loading || saving}
                        />
                        <p className="text-xs text-muted-foreground">
                            Si ya existe un token guardado, solo llena este campo cuando quieras rotarlo.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="meta-graph-version">Versión Graph API</Label>
                        <Input
                            id="meta-graph-version"
                            value={graphApiVersion}
                            onChange={(event) => setGraphApiVersion(event.target.value)}
                            placeholder="v20.0"
                            autoComplete="off"
                            disabled={loading || saving}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!canSave || loading || saving}>
                            {saving ? "Guardando..." : "Guardar configuración"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    UserPlus,
    DollarSign,
    Calendar,
    Building2,
    UserCircle,
    Phone,
    CreditCard,
    CheckCircle2,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getGuayaquilDateString } from "@/lib/guayaquilTime";
import { parseAmountValue } from "@/features/import/model/importNormalizers";
import { useAuth } from "@/context/useAuth";
import { manualSaleRepository } from "../infrastructure/ManualSaleRepository";
import type { ManualSaleFormValues } from "../domain/manualSaleTypes";

interface ManualSaleDialogProps {
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function ManualSaleDialog({ onSuccess, trigger }: ManualSaleDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"form" | "confirm" | "saving">("form");
    const [values, setValues] = useState<ManualSaleFormValues>(() => ({
        nombre_completo: "",
        cedula: "",
        celular: "",
        fecha_monto_operacion: getGuayaquilDateString(),
        monto_operacion: "",
        agencia: "",
        responsable: "",
    }));

    const handleChange = (field: keyof ManualSaleFormValues, val: string) => {
        setValues((prev) => ({ ...prev, [field]: val }));
    };

    const handleReset = () => {
        setStep("form");
        setValues({
            nombre_completo: "",
            cedula: "",
            celular: "",
            fecha_monto_operacion: getGuayaquilDateString(),
            monto_operacion: "",
            agencia: "",
            responsable: "",
        });
    };

    const handleContinueToConfirm = (event: React.FormEvent) => {
        event.preventDefault();
        const cleanName = values.nombre_completo.trim();
        const cleanDate = values.fecha_monto_operacion.trim();
        const amountParsed = parseAmountValue(values.monto_operacion);

        if (cleanName.length < 3) {
            toast.error("El nombre completo es obligatorio y debe tener al menos 3 letras.");
            return;
        }

        if (!cleanDate) {
            toast.error("La fecha en que se registró el monto es obligatoria.");
            return;
        }

        if (amountParsed.number <= 0) {
            toast.error("El monto de la operación es obligatorio y debe ser un número mayor a 0.");
            return;
        }

        setStep("confirm");
    };

    const handleExecuteSave = async () => {
        setStep("saving");
        try {
            const amountParsed = parseAmountValue(values.monto_operacion);
            await manualSaleRepository.saveManualSale({
                nombre_completo: values.nombre_completo.trim(),
                cedula: values.cedula?.trim() || "",
                celular: values.celular?.trim() || "",
                fecha_monto_operacion: values.fecha_monto_operacion.trim(),
                monto_operacion_raw: values.monto_operacion.trim() || String(amountParsed.number),
                monto_operacion_numero: amountParsed.number,
                agencia: values.agencia?.trim() || "",
                responsable: values.responsable?.trim() || "",
                target_label: "venta_exitosa",
            }, user?.id);

            toast.success("¡Venta manual guardada exitosamente!");
            setOpen(false);
            handleReset();
            onSuccess?.();
        } catch (error: any) {
            console.error("Error guardando venta manual:", error);
            const errDetails = error?.message || error?.details || error?.hint || error?.error_description || (typeof error === "object" ? JSON.stringify(error) : String(error));
            toast.error(`Error DB: ${errDetails}`, { duration: 8000 });
            setStep("confirm");
        }
    };

    const formattedAmount = parseAmountValue(values.monto_operacion).number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (step === "saving") return;
                setOpen(nextOpen);
                if (!nextOpen) handleReset();
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 font-medium">
                        <UserPlus className="h-4 w-4" />
                        Registrar Venta Manual
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <DollarSign className="h-6 w-6 text-emerald-600 p-1 bg-emerald-100 rounded-full dark:bg-emerald-950/50" />
                        Subir Prospecto con Venta Exitosa
                    </DialogTitle>
                    <DialogDescription>
                        {step === "form"
                            ? "Ingresa los datos del nuevo cliente para registrarlo directamente en la base de datos."
                            : "Revisa cuidadosamente los datos antes de confirmar la inserción definitiva."}
                    </DialogDescription>
                </DialogHeader>

                {step === "form" && (
                    <form onSubmit={handleContinueToConfirm} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="nombre" className="flex items-center gap-1 font-semibold">
                                    <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                    Nombre Completo <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="nombre"
                                    placeholder="Ej. Juan Pérez"
                                    required
                                    value={values.nombre_completo}
                                    onChange={(event) => handleChange("nombre_completo", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cedula" className="flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                    Cédula / RUC <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
                                </Label>
                                <Input
                                    id="cedula"
                                    placeholder="Ej. 0912345678"
                                    value={values.cedula}
                                    onChange={(event) => handleChange("cedula", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="telefono" className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                    Teléfono / Celular <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
                                </Label>
                                <Input
                                    id="telefono"
                                    placeholder="Ej. 0987654321"
                                    value={values.celular}
                                    onChange={(event) => handleChange("celular", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="monto" className="flex items-center gap-1 font-semibold">
                                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                    Monto de la Operación ($) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="monto"
                                    type="text"
                                    placeholder="Ej. 15000"
                                    required
                                    value={values.monto_operacion}
                                    onChange={(event) => handleChange("monto_operacion", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fecha" className="flex items-center gap-1 font-semibold">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    Fecha de Registro <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    required
                                    value={values.fecha_monto_operacion}
                                    onChange={(event) => handleChange("fecha_monto_operacion", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agencia" className="flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    Agencia <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
                                </Label>
                                <Input
                                    id="agencia"
                                    placeholder="Ej. Sucursal Centro"
                                    value={values.agencia}
                                    onChange={(event) => handleChange("agencia", event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="responsable" className="flex items-center gap-1">
                                    <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                    Responsable <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
                                </Label>
                                <Input
                                    id="responsable"
                                    placeholder="Ej. Carlos Asesor"
                                    value={values.responsable}
                                    onChange={(event) => handleChange("responsable", event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                                Revisar Datos
                            </Button>
                        </div>
                    </form>
                )}

                {(step === "confirm" || step === "saving") && (
                    <div className="space-y-6 py-2">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-3">
                                <CheckCircle2 className="w-5 h-5" />
                                Doble Confirmación de Registro
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                                Estás a punto de registrar un nuevo prospecto como <strong>Venta Exitosa</strong> en la base de datos comercial. Estos valores sumarán directamente al dashboard.
                            </p>

                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm bg-white/80 dark:bg-background/80 p-3 rounded-lg border">
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Nombre:</dt>
                                    <dd className="font-semibold">{values.nombre_completo || "-"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Monto Contable:</dt>
                                    <dd className="font-bold text-emerald-600 text-base">{formattedAmount}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Cédula:</dt>
                                    <dd>{values.cedula || <span className="italic text-muted-foreground">No ingresada</span>}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Teléfono:</dt>
                                    <dd>{values.celular || <span className="italic text-muted-foreground">No ingresado</span>}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Fecha de Venta:</dt>
                                    <dd className="font-medium">{values.fecha_monto_operacion}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Etiqueta Final:</dt>
                                    <dd className="font-bold text-emerald-600">venta_exitosa</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Agencia:</dt>
                                    <dd>{values.agencia || <span className="italic text-muted-foreground">No ingresada</span>}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground font-medium">Responsable:</dt>
                                    <dd>{values.responsable || <span className="italic text-muted-foreground">No ingresado</span>}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Esta acción creará el registro contable en la BDD y generará el evento de auditoría correspondiente.</span>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("form")}
                                disabled={step === "saving"}
                            >
                                Modificar Campos
                            </Button>
                            <Button
                                type="button"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                onClick={handleExecuteSave}
                                disabled={step === "saving"}
                            >
                                {step === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar y Subir Venta
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

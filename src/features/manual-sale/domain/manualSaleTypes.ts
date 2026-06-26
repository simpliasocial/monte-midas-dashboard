export interface ManualSaleFormValues {
    nombre_completo: string;
    cedula?: string;
    celular?: string;
    fecha_monto_operacion: string;
    monto_operacion: string;
    agencia?: string;
    responsable?: string;
}

export interface ManualSaleSavePayload {
    nombre_completo: string;
    cedula: string;
    celular: string;
    fecha_monto_operacion: string;
    monto_operacion_raw: string;
    monto_operacion_numero: number;
    agencia: string;
    responsable: string;
    target_label: string;
}

export interface ManualSaleSaveResult {
    conversationId: number;
    contactId: number;
    identityKey: string;
}

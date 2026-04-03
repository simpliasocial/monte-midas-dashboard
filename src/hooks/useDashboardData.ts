import { useState, useEffect, useCallback, useRef } from 'react';
import { chatwootService } from '../services/ChatwootService';

// ─── Cache Configuration ──────────────────────────────────────────────────────
const CACHE_KEY = 'chatwoot_conversations_v4'; // Incremented version
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
    conversations: any[];
    timestamp: number;
}

const getCache = (): any[] | null => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry: CacheEntry = JSON.parse(raw);
        console.log(`⚡ Hydrating from cache (${entry.conversations.length} conversations)`);
        return entry.conversations;
    } catch { return null; }
};

const setCache = (conversations: any[]) => {
    try {
        const entry: CacheEntry = { conversations, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (e) { console.warn('Cache save failed:', e); }
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LoadingProgress {
    phase: string;
    isSyncing: boolean;
    percentage: number;
}

const emptyData = () => ({
    kpis: { totalLeads: 0, leadsInteresados: 0, citasAgendadas: 0, deseaCreditoCount: 0, noCalifican: 0, tasaAgendamiento: 0, tasaDescarte: 0, tasaRespuesta: 0, gananciaMensual: 0, gananciaTotal: 0 },
    funnelData: [] as any[], recentAppointments: [] as any[], channelData: [] as any[], weeklyTrend: [] as any[], monthlyTrend: [] as any[], disqualificationReasons: [] as any[],
    dataCapture: { completionRate: 0, fieldRates: [] as any[], incomplete: 0, funnelDropoff: 0 }, responseTime: 0
});

export const useDashboardData = (selectedMonth: Date | null = null, selectedWeek: string = "1") => {
    const cachedData = useRef<any[] | null>(getCache());
    const [loading, setLoading] = useState(!cachedData.current);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState(emptyData());
    const [progress, setProgress] = useState<LoadingProgress>({
        phase: cachedData.current ? 'Sincronizando...' : 'Conectando...',
        isSyncing: true, percentage: 0
    });

    const parseMonto = (v: any) => {
        if (!v) return 0;
        const n = parseFloat(v.toString().replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };

    const parseFecha = (v: any) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    };

    const computeAndSetData = useCallback((allRaw: any[]) => {
        const start = selectedMonth ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1) : new Date(2026, 0, 1);
        const end = selectedMonth ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59) : new Date();
        const now = new Date();
        const tStart = selectedMonth ? start : new Date(now.getFullYear(), now.getMonth(), 1);
        const tEnd = selectedMonth ? end : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        let gTotal = 0, gMensual = 0;
        allRaw.forEach(c => {
            const attrs = { ...(c.meta?.sender?.custom_attributes || {}), ...(c.custom_attributes || {}) };
            const m = parseMonto(attrs.monto_operacion);
            const f = parseFecha(attrs.fecha_monto_operacion);
            gTotal += m;
            if (m > 0 && f && f >= start && f <= end) gMensual += m;
        });

        const kpiC = allRaw.filter(c => {
            const d = new Date(c.timestamp * 1000);
            return d >= start && d <= end;
        });

        const totalLeads = kpiC.length;
        const countL = (lbl: string) => kpiC.filter(c => c.labels?.includes(lbl)).length;
        const lInt = countL('interesado'), cAge = countL('agenda_cita'), nApl = countL('no_aplica'), nJoy = countL('no_tiene_joyas_oro'), dCre = countL('desea_un_credito'), tDud = countL('tiene_dudas'), sInf = countL('solicita_informacion');
        const noC = nApl + nJoy;

        setData({
            kpis: {
                totalLeads, leadsInteresados: lInt, citasAgendadas: cAge, deseaCreditoCount: dCre, noCalifican: noC,
                tasaAgendamiento: totalLeads > 0 ? Math.round((cAge / totalLeads) * 100) : 0,
                tasaDescarte: totalLeads > 0 ? Math.round((noC / totalLeads) * 100) : 0,
                tasaRespuesta: totalLeads > 0 ? Math.round((kpiC.filter(c => c.status !== 'new').length / totalLeads) * 100) : 0,
                gananciaMensual: gMensual, gananciaTotal: gTotal
            },
            funnelData: [
                { label: "Solicita Info.", value: sInf, percentage: totalLeads > 0 ? Math.round((sInf / totalLeads) * 100) : 0, color: "hsl(224, 62%, 32%)" },
                { label: "Interesado", value: lInt, percentage: totalLeads > 0 ? Math.round((lInt / totalLeads) * 100) : 0, color: "hsl(142, 60%, 45%)" },
                { label: "Agenda Cita", value: cAge, percentage: totalLeads > 0 ? Math.round((cAge / totalLeads) * 100) : 0, color: "hsl(45, 93%, 58%)" },
                { label: "No Califican", value: noC, percentage: totalLeads > 0 ? Math.round((noC / totalLeads) * 100) : 0, color: "hsl(0, 0%, 60%)" }
            ],
            recentAppointments: kpiC.filter(c => c.labels?.includes('agenda_cita')).slice(0, 5).map(c => ({
                id: c.id, nombre: c.custom_attributes?.nombre_completo || c.meta?.sender?.name || 'S/N',
                celular: c.custom_attributes?.celular || c.meta?.sender?.phone_number || 'S/C',
                agencia: c.custom_attributes?.agencia || 'S/A', fecha: c.custom_attributes?.fecha_visita || 'Pendiente', status: 'Confirmada'
            })),
            channelData: Array.from(kpiC.reduce((acc, c) => acc.set(c.inbox_id, (acc.get(c.inbox_id) || 0) + 1), new Map()).entries()).map(([id, count]) => ({
                name: id === 1 ? 'WhatsApp' : `Canal ${id}`, count, percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0, icon: "MessageCircle", color: id === 1 ? "bg-green-500" : "bg-blue-500"
            })),
            weeklyTrend: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => {
                const targetW = parseInt(selectedWeek);
                const getW = (dt: Date) => Math.ceil(((dt.getTime() - new Date(dt.getFullYear(), dt.getMonth(), 1).getTime()) / 86400000 + new Date(dt.getFullYear(), dt.getMonth(), 1).getDay() + 1) / 7);
                const filtered = allRaw.filter(c => {
                    const dt = new Date(c.timestamp * 1000);
                    return dt >= tStart && dt <= tEnd && getW(dt) === targetW && dt.getDay() === i;
                });
                return { week: d, leads: filtered.length, citas: filtered.filter(c => c.labels?.includes('agenda_cita')).length };
            }),
            monthlyTrend: [1, 2, 3, 4, 5].map(w => {
                const getW = (dt: Date) => Math.ceil(((dt.getTime() - new Date(dt.getFullYear(), dt.getMonth(), 1).getTime()) / 86400000 + new Date(dt.getFullYear(), dt.getMonth(), 1).getDay() + 1) / 7);
                const filtered = allRaw.filter(c => {
                    const dt = new Date(c.timestamp * 1000);
                    return dt >= tStart && dt <= tEnd && getW(dt) === w;
                });
                return { date: `Sem ${w}`, leads: filtered.length, sqls: filtered.filter(c => c.labels?.includes('interesado')).length, citas: filtered.filter(c => c.labels?.includes('agenda_cita')).length };
            }),
            disqualificationReasons: [
                { reason: "Joyas", count: nJoy, percentage: noC > 0 ? Math.round((nJoy / noC) * 100) : 0 },
                { reason: "Otros", count: nApl, percentage: noC > 0 ? Math.round((nApl / noC) * 100) : 0 }
            ],
            dataCapture: {
                completionRate: 0, incomplete: 0, funnelDropoff: 0,
                fieldRates: ['nombre_completo', 'celular', 'agencia'].map(f => ({ field: f, rate: 0 }))
            },
            responseTime: 0
        });
    }, [selectedMonth, selectedWeek]);

    const fetchData = useCallback(async () => {
        if (cachedData.current) {
            computeAndSetData(cachedData.current);
            setLoading(false);
        } else {
            setLoading(true);
        }
        setError(null);
        setProgress({ phase: 'Sincronizando...', isSyncing: true, percentage: 5 });

        try {
            // SINGLE UNIFIED FETCH (No status filter = faster + complete count)
            const first = await chatwootService.getConversations({ page: 1 });
            const allConversations = [...(first.payload || [])];
            // Postman showed all_count: 516 when status was not provided
            const totalC = first.meta?.all_count || 0;
            const totalP = Math.ceil(totalC / 15);

            if (totalP > 1) {
                // Reduced batch size to 3 for maximum reliability against 500 errors
                const BATCH = 3;
                for (let bStart = 2; bStart <= totalP; bStart += BATCH) {
                    const bEnd = Math.min(bStart + BATCH - 1, totalP);
                    const promises = [];
                    for (let p = bStart; p <= bEnd; p++) promises.push(chatwootService.getConversations({ page: p }));

                    const resps = await Promise.all(promises);
                    resps.forEach(r => { if (r?.payload) allConversations.push(...r.payload); });

                    const pct = Math.round((bEnd / totalP) * 100);
                    setProgress({ phase: `Cargando pág. ${bEnd}/${totalP}`, isSyncing: true, percentage: pct });

                    // Small delay between batches to breath 
                    await new Promise(res => setTimeout(res, 500));
                }
            }

            console.log(`✅ Sync Complete: ${allConversations.length} contacts found.`);
            setCache(allConversations);
            cachedData.current = allConversations;
            computeAndSetData(allConversations);
            setProgress({ phase: 'Actualizado', isSyncing: false, percentage: 100 });
        } catch (err) {
            console.error('Sync Error:', err);
            if (!cachedData.current) setError('Error: La API de Chatwoot falló. ' + (err as Error).message);
        } finally {
            setLoading(false);
            setProgress(prev => ({ ...prev, isSyncing: false }));
        }
    }, [selectedMonth, selectedWeek, computeAndSetData]);

    useEffect(() => {
        fetchData();
        const intv = setInterval(fetchData, 15 * 60 * 1000); // 15 min sync
        return () => clearInterval(intv);
    }, [fetchData]);

    return { loading, error, data, progress, refetch: fetchData };
};

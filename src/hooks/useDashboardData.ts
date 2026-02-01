import { useState, useEffect } from 'react';
import { chatwootService } from '../services/ChatwootService';

export const useDashboardData = (selectedMonth: Date | null = null, selectedWeek: string = "1") => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState({
        kpis: {
            totalLeads: 0,
            leadsInteresados: 0,
            citasAgendadas: 0,
            deseaCreditoCount: 0,
            noCalifican: 0,
            tasaAgendamiento: 0,
            tasaDescarte: 0,
            tasaRespuesta: 0,
            gananciaMensual: 0,
            gananciaTotal: 0
        },
        funnelData: [] as any[],
        recentAppointments: [] as any[],
        channelData: [] as any[],
        weeklyTrend: [] as any[],
        monthlyTrend: [] as any[],
        disqualificationReasons: [] as any[],
        dataCapture: {
            completionRate: 0,
            fieldRates: [] as any[],
            incomplete: 0,
            funnelDropoff: 0
        },
        responseTime: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Determine Global Filter Range (for KPIs, Funnel, etc.)
            let globalStart: Date;
            let globalEnd: Date;

            if (selectedMonth) {
                globalStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                globalEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
            } else {
                // All Time (Default: Jan 1 2026 to Now)
                globalStart = new Date(2026, 0, 1); // Jan 1, 2026
                globalEnd = new Date(); // Now
            }

            // 2. Determine Monthly Trend Range (Specific requirement: Show Current Month if "All Time" is selected)
            let trendStart: Date;
            let trendEnd: Date;

            if (selectedMonth) {
                trendStart = globalStart;
                trendEnd = globalEnd;
            } else {
                // If "All Time" selected, show Current Month for trend
                const now = new Date();
                trendStart = new Date(now.getFullYear(), now.getMonth(), 1);
                trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }

            // 3. Fetch ALL conversations (Client-side filtering is safer for "February = 0" requirement)
            // We fetch 'all' status to get everything.
            // 3. Fetch ALL conversations (Iterate through pages)
            let allConversationsRaw: any[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await chatwootService.getConversations({ status: 'all', page });
                const conversations = response.payload;

                if (conversations.length === 0) {
                    hasMore = false;
                } else {
                    allConversationsRaw = [...allConversationsRaw, ...conversations];
                    // Check if we reached the last page
                    // If the number of items returned is less than typical page size (usually 25), we are done.
                    // Or check meta if available, but checking count is robust enough for now.
                    // Chatwoot default page size is 25.
                    if (conversations.length < 25) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            }

            // Helper to parse "monto_operacion"
            const parseMonto = (val: any): number => {
                if (!val) return 0;
                // Remove non-numeric characters except dot and comma
                // Check format. If like "1,000.00" or "$1000", remove $ and ,
                // If "1.000,00" (European), might need heuristic, but assuming standard float-like or US currency for now based on user context.
                // Safest: Replace everything not 0-9 or .
                const clean = val.toString().replace(/[^0-9.]/g, '');
                const num = parseFloat(clean);
                return isNaN(num) ? 0 : num;
            };

            // Calculate Total Profit (Ganancia Total) - All Time
            const gananciaTotal = allConversationsRaw.reduce((sum, conv) => {
                const contactAttrs = conv.meta?.sender?.custom_attributes || {};
                const convAttrs = conv.custom_attributes || {};
                const montoVal = contactAttrs.monto_operacion || convAttrs.monto_operacion;
                const monto = parseMonto(montoVal);
                return sum + monto;
            }, 0);

            // 4. Filter Data for KPIs
            const kpiConversations = allConversationsRaw.filter(conv => {
                const convDate = new Date(conv.timestamp * 1000);
                return convDate >= globalStart && convDate <= globalEnd;
            });

            // Calculate Monthly/Period Profit (Ganancia Mensual) - Filtered
            const gananciaMensual = kpiConversations.reduce((sum, conv) => {
                const contactAttrs = conv.meta?.sender?.custom_attributes || {};
                const convAttrs = conv.custom_attributes || {};
                const montoVal = contactAttrs.monto_operacion || convAttrs.monto_operacion;
                const monto = parseMonto(montoVal);
                return sum + monto;
            }, 0);


            // Calculate KPIs from filtered data
            const totalLeads = kpiConversations.length;

            // Helper to count by label
            const countByLabel = (label: string) =>
                kpiConversations.filter(c => c.labels && c.labels.includes(label)).length;

            const leadsInteresados = countByLabel('interesado');
            const citasAgendadas = countByLabel('agenda_cita');
            const noAplicaCount = countByLabel('no_aplica');
            const noTieneJoyasCount = countByLabel('no_tiene_joyas_oro');
            const deseaCreditoCount = countByLabel('desea_un_credito');
            const tieneDudasCount = countByLabel('tiene_dudas');
            const solicitaInfoCount = countByLabel('solicita_informacion');

            const noCalifican = noAplicaCount + noTieneJoyasCount;
            const tasaAgendamiento = totalLeads > 0 ? Math.round((citasAgendadas / totalLeads) * 100) : 0;
            const tasaDescarte = totalLeads > 0 ? Math.round((noCalifican / totalLeads) * 100) : 0;

            // Calculate Response Rate (Tasa de Respuesta)
            const interactedConversations = kpiConversations.filter(c => c.status !== 'new').length;
            const tasaRespuesta = totalLeads > 0 ? Math.round((interactedConversations / totalLeads) * 100) : 0;

            // Recent Appointments (from filtered data)

            const recentAppointments = kpiConversations
                .filter(c => c.labels && c.labels.includes('agenda_cita'))
                .slice(0, 5)
                .map(conv => ({
                    id: conv.id,
                    nombre: conv.custom_attributes?.nombre_completo || conv.meta?.sender?.name || 'Sin Nombre',
                    celular: conv.custom_attributes?.celular || conv.meta?.sender?.phone_number || 'Sin Celular',
                    agencia: conv.custom_attributes?.agencia || 'Sin Agencia',
                    fecha: conv.custom_attributes?.fecha_visita || conv.custom_attributes?.fecha || 'Pendiente',
                    hora: conv.custom_attributes?.hora_visita || conv.custom_attributes?.hora || '',
                    status: 'Confirmada'
                }));

            // Funnel Data
            // Each step shows only leads that have that specific label
            const funnelData = [
                { label: "Solicita Información", value: solicitaInfoCount, percentage: totalLeads > 0 ? Math.round((solicitaInfoCount / totalLeads) * 100) : 0, color: "hsl(224, 62%, 32%)" },
                { label: "Interesado", value: leadsInteresados, percentage: totalLeads > 0 ? Math.round((leadsInteresados / totalLeads) * 100) : 0, color: "hsl(142, 60%, 45%)" },
                { label: "Agenda Cita", value: citasAgendadas, percentage: totalLeads > 0 ? Math.round((citasAgendadas / totalLeads) * 100) : 0, color: "hsl(45, 93%, 58%)" },
                { label: "Desea un Crédito", value: deseaCreditoCount, percentage: totalLeads > 0 ? Math.round((deseaCreditoCount / totalLeads) * 100) : 0, color: "hsl(142, 60%, 35%)" },
                { label: "Tiene Dudas", value: tieneDudasCount, percentage: totalLeads > 0 ? Math.round((tieneDudasCount / totalLeads) * 100) : 0, color: "hsl(224, 55%, 45%)" },
                { label: "No Tiene Joyas de Oro", value: noTieneJoyasCount, percentage: totalLeads > 0 ? Math.round((noTieneJoyasCount / totalLeads) * 100) : 0, color: "hsl(0, 70%, 60%)" },
                { label: "No Aplica", value: noAplicaCount, percentage: totalLeads > 0 ? Math.round((noAplicaCount / totalLeads) * 100) : 0, color: "hsl(0, 0%, 60%)" },
            ];

            // Debugging: Log all unique labels found to help verify KPIs
            const allLabels = new Set<string>();
            kpiConversations.forEach(c => c.labels?.forEach(l => allLabels.add(l)));
            console.log('Unique Labels Found in Dashboard Data:', Array.from(allLabels));
            console.log('Total Leads:', totalLeads);
            console.log('Leads Interesados Count:', leadsInteresados);

            // Channel Breakdown
            // Fetch inboxes to map IDs to Names/Types
            const inboxes = await chatwootService.getInboxes();
            const inboxMap = new Map(inboxes.map((inbox: any) => [inbox.id, inbox]));

            const channelCounts = new Map<string, number>();
            kpiConversations.forEach(conv => {
                const inbox = inboxMap.get(conv.inbox_id);
                let channelName = 'Otros';

                if (inbox) {
                    // Map channel type to display name
                    const type = inbox.channel_type;
                    if (type === 'Channel::Whatsapp') channelName = 'WhatsApp';
                    else if (type === 'Channel::FacebookPage') channelName = 'Facebook'; // Could be Messenger or Instagram depending on config, but usually FB
                    else if (type === 'Channel::Instagram') channelName = 'Instagram'; // If specific Instagram channel exists
                    else channelName = inbox.name; // Fallback to inbox name
                }

                channelCounts.set(channelName, (channelCounts.get(channelName) || 0) + 1);
            });

            const channelData = Array.from(channelCounts.entries()).map(([name, count]) => {
                let icon = "MessageCircle";
                let color = "bg-gray-500";

                if (name === 'WhatsApp') {
                    icon = "MessageCircle";
                    color = "bg-green-500";
                } else if (name === 'Facebook') {
                    icon = "Facebook";
                    color = "bg-blue-600";
                } else if (name === 'Instagram') {
                    icon = "Instagram";
                    color = "bg-pink-600";
                }

                return {
                    name,
                    count,
                    percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
                    icon,
                    color
                };
            });

            // If no data, show empty state or default
            if (channelData.length === 0 && totalLeads > 0) {
                // Fallback if something went wrong with mapping but we have leads
                channelData.push({ name: "Desconocido", count: totalLeads, percentage: 100, icon: "HelpCircle", color: "bg-gray-400" });
            }

            // 5. Weekly Trend Calculation (Specific Week of Selected Month)
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const weeklyTrendMap = new Map<string, { leads: number; citas: number }>();
            days.forEach(day => weeklyTrendMap.set(day, { leads: 0, citas: 0 }));

            // Determine the date range for the selected week
            // Logic: trendStart is the 1st of the month (or current month).
            // We need to find the start and end dates of "Week X" within that month.
            // Week 1 starts on trendStart.
            // But we need to align with "Sem 1" logic from getWeekNumber.

            const getWeekNumber = (d: Date) => {
                const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                const pastDaysOfMonth = (d.getTime() - firstDayOfMonth.getTime()) / 86400000;
                return Math.ceil((pastDaysOfMonth + firstDayOfMonth.getDay() + 1) / 7);
            };

            // Filter conversations for the selected week
            const targetWeek = parseInt(selectedWeek);
            const weeklyConversations = allConversationsRaw.filter(conv => {
                const d = new Date(conv.timestamp * 1000);
                // Must be within the trend month AND match the week number
                if (d >= trendStart && d <= trendEnd) {
                    return getWeekNumber(d) === targetWeek;
                }
                return false;
            });

            // Map days to specific dates for the selected week
            const dayToDateMap = new Map<string, number>();
            let tempDate = new Date(trendStart);
            while (tempDate <= trendEnd) {
                if (getWeekNumber(tempDate) === targetWeek) {
                    const dayName = days[tempDate.getDay()];
                    dayToDateMap.set(dayName, tempDate.getDate());
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }

            weeklyConversations.forEach(conv => {
                const date = new Date(conv.timestamp * 1000);
                const dayName = days[date.getDay()];
                const current = weeklyTrendMap.get(dayName)!;

                current.leads++;
                if (conv.labels && conv.labels.includes('agenda_cita')) {
                    current.citas++;
                }
                weeklyTrendMap.set(dayName, current);
            });

            const weeklyTrend = days.map(day => {
                const dateNum = dayToDateMap.get(day);
                // If date exists for this day in the selected week, append it (e.g., "Lun 20")
                // Otherwise keep just the day name (e.g. for days outside the month boundary)
                const label = dateNum ? `${day} ${dateNum}` : day;
                return {
                    week: label,
                    leads: weeklyTrendMap.get(day)!.leads,
                    citas: weeklyTrendMap.get(day)!.citas
                };
            });

            // 6. Monthly Trend Calculation
            const monthlyTrendMap = new Map<string, { leads: number; sqls: number; citas: number }>();
            // Initialize 5 weeks
            for (let i = 1; i <= 5; i++) {
                monthlyTrendMap.set(`Sem ${i}`, { leads: 0, sqls: 0, citas: 0 });
            }

            const trendConversations = allConversationsRaw.filter(conv => {
                const d = new Date(conv.timestamp * 1000);
                return d >= trendStart && d <= trendEnd;
            });

            trendConversations.forEach(conv => {
                const date = new Date(conv.timestamp * 1000);
                const week = `Sem ${getWeekNumber(date)}`;
                if (monthlyTrendMap.has(week)) {
                    const current = monthlyTrendMap.get(week)!;
                    current.leads++;
                    if (conv.labels && conv.labels.includes('interesado')) current.sqls++;
                    if (conv.labels && conv.labels.includes('agenda_cita')) current.citas++;
                    monthlyTrendMap.set(week, current);
                }
            });

            const monthlyTrend = Array.from(monthlyTrendMap.entries())
                .map(([date, counts]) => ({ date, ...counts }));

            // Disqualification Reasons
            const totalDisqualified = noCalifican;
            const disqualificationReasons = [
                { reason: "No tiene joyas de oro", count: noTieneJoyasCount, percentage: totalDisqualified > 0 ? Math.round((noTieneJoyasCount / totalDisqualified) * 100) : 0 },
                { reason: "No aplica", count: noAplicaCount, percentage: totalDisqualified > 0 ? Math.round((noAplicaCount / totalDisqualified) * 100) : 0 },
            ].sort((a, b) => b.count - a.count);

            // Data Capture Stats
            const targetConversations = kpiConversations.filter(c =>
                c.labels && (c.labels.includes('interesado') || c.labels.includes('agenda_cita'))
            );
            const totalTarget = targetConversations.length;

            const fields = ['nombre_completo', 'celular', 'agencia', 'fecha_visita', 'hora_visita'];
            const fieldCounts = fields.reduce((acc, field) => {
                acc[field] = 0;
                return acc;
            }, {} as Record<string, number>);

            let completeConversations = 0;
            let incompleteConversations = 0;

            targetConversations.forEach(conv => {
                const attrs = conv.custom_attributes || {};
                let fieldsPresent = 0;

                fields.forEach(field => {
                    if (attrs[field]) {
                        fieldCounts[field]++;
                        fieldsPresent++;
                    }
                });

                if (fieldsPresent === fields.length) {
                    completeConversations++;
                } else if (fieldsPresent > 0) {
                    incompleteConversations++;
                }
            });

            const completionRate = totalTarget > 0 ? Math.round((completeConversations / totalTarget) * 100) : 0;
            const fieldRates = fields.map(field => ({
                field,
                rate: totalTarget > 0 ? Math.round((fieldCounts[field] / totalTarget) * 100) : 0
            })).sort((a, b) => b.rate - a.rate);

            const dataCapture = {
                completionRate,
                fieldRates,
                incomplete: incompleteConversations,
                funnelDropoff: 0
            };

            const responseTime = 0;

            setData({
                kpis: {
                    totalLeads,
                    leadsInteresados,
                    citasAgendadas,
                    deseaCreditoCount,
                    noCalifican,
                    tasaAgendamiento,
                    tasaDescarte,
                    tasaRespuesta,
                    gananciaMensual,
                    gananciaTotal
                },
                funnelData,
                recentAppointments,
                channelData,
                weeklyTrend,
                monthlyTrend,
                disqualificationReasons,
                dataCapture,
                responseTime
            });
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch dashboard data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [selectedMonth, selectedWeek]); // Re-fetch when month or week changes

    return { loading, error, data };
};

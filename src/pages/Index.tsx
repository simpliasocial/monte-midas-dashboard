import { Users, Target, Calendar, TrendingUp, Zap, Database, Clock, MessageSquare, AlertTriangle, CheckCircle, Filter, BarChart3 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { ResponseTimeGauge } from "@/components/dashboard/ResponseTimeGauge";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { DataCaptureChart } from "@/components/dashboard/DataCaptureChart";
import { DisqualificationReasons } from "@/components/dashboard/DisqualificationReasons";
import { WeeklyTrend } from "@/components/dashboard/WeeklyTrend";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";

// Mock data
const funnelStages = [
  { label: "Leads Entrantes", value: 1485, percentage: 100, color: "hsl(224, 62%, 32%)" },
  { label: "Solicita Información", value: 1124, percentage: 76, color: "hsl(224, 55%, 45%)" },
  { label: "No Aplica", value: 348, percentage: 23, color: "hsl(220, 30%, 65%)" },
  { label: "Interesado", value: 776, percentage: 52, color: "hsl(142, 60%, 45%)" },
  { label: "Agenda Cita", value: 356, percentage: 24, color: "hsl(45, 93%, 58%)" },
];

const monthlyTrendData = [
  { date: "Sem 1", leads: 320, sqls: 198, citas: 78 },
  { date: "Sem 2", leads: 385, sqls: 245, citas: 95 },
  { date: "Sem 3", leads: 412, sqls: 278, citas: 102 },
  { date: "Sem 4", leads: 368, sqls: 251, citas: 81 },
];

const weeklyTrendData = [
  { week: "Lun", leads: 58, citas: 12 },
  { week: "Mar", leads: 72, citas: 18 },
  { week: "Mié", leads: 65, citas: 15 },
  { week: "Jue", leads: 81, citas: 22 },
  { week: "Vie", leads: 54, citas: 14 },
  { week: "Sáb", leads: 38, citas: 8 },
  { week: "Dom", leads: 22, citas: 5 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardHeader />

        {/* Main KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Total de Leads Entrantes"
            value="1,485"
            icon={Users}
            variant="primary"
            size="lg"
            trend={{ value: 12.5, isPositive: true }}
          />
          <KPICard
            title="SQL Totales"
            value="972"
            subtitle="Leads calificados"
            icon={Target}
            size="lg"
            trend={{ value: 8.3, isPositive: true }}
          />
          <KPICard
            title="Citas Agendadas"
            value="356"
            subtitle="Confirmadas"
            icon={Calendar}
            size="lg"
            trend={{ value: 15.2, isPositive: true }}
          />
          <KPICard
            title="Appointment Rate"
            value="24%"
            subtitle="Leads → Citas"
            icon={TrendingUp}
            variant="accent"
            size="lg"
            trend={{ value: 3.1, isPositive: true }}
          />
        </div>

        {/* Funnel & Mini KPIs */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <SectionCard 
            title="Funnel Principal" 
            subtitle="Conversión por etapa"
            icon={Filter}
            className="xl:col-span-2"
          >
            <FunnelChart stages={funnelStages} />
          </SectionCard>

          <div className="space-y-4">
            <KPICard
              title="Interest Rate"
              value="52%"
              subtitle="Leads interesados"
              icon={Zap}
              variant="success"
            />
            <KPICard
              title="Qualification Rate"
              value="65%"
              subtitle="SQLs del total"
              icon={CheckCircle}
            />
            <KPICard
              title="Appointment Rate"
              value="24%"
              subtitle="Citas del total"
              icon={Calendar}
            />
            <KPICard
              title="Disqualification Rate"
              value="23%"
              subtitle="No califican"
              icon={AlertTriangle}
              variant="warning"
            />
          </div>
        </div>

        {/* Channel Breakdown & Weekly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SectionCard
            title="Desglose por Canal"
            subtitle="Rendimiento por plataforma"
            icon={MessageSquare}
          >
            <ChannelBreakdown />
          </SectionCard>

          <SectionCard
            title="Tendencia Semanal"
            subtitle="Leads y citas por día"
            icon={TrendingUp}
          >
            <WeeklyTrend data={weeklyTrendData} />
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">Citas</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* SQLs & Disqualification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SectionCard
            title="KPIs de Calificación"
            subtitle="SQLs y rendimiento"
            icon={Target}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-3xl font-bold text-primary font-display">972</p>
                  <p className="text-sm text-muted-foreground">SQL Totales</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-3xl font-bold text-success font-display">65%</p>
                  <p className="text-sm text-muted-foreground">SQL Rate</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tiempo Promedio de Calificación</span>
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary font-display">4.2 min</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Motivos de Descalificación"
            subtitle="Top razones de no calificación"
            icon={AlertTriangle}
            className="lg:col-span-2"
          >
            <DisqualificationReasons />
          </SectionCard>
        </div>

        {/* Data Capture */}
        <SectionCard
          title="Captura de Datos"
          subtitle="Eficiencia de recolección de información"
          icon={Database}
          className="mb-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard title="Completion Rate" value="78%" variant="success" size="sm" />
            <KPICard title="Conversaciones Incompletas" value="327" size="sm" />
            <KPICard title="Abandono del Funnel" value="22%" variant="warning" size="sm" />
            <KPICard title="Tiempo Promedio Captura" value="2.8 min" size="sm" />
          </div>
          <DataCaptureChart />
        </SectionCard>

        {/* Operational Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SectionCard
            title="Tiempo de Respuesta"
            subtitle="Promedio del agente IA"
            icon={Clock}
            className="flex flex-col items-center"
          >
            <ResponseTimeGauge value={1.8} />
          </SectionCard>

          <SectionCard
            title="Desempeño Operativo"
            subtitle="Métricas del agente IA"
            icon={Zap}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-primary font-display">8.4</p>
                <p className="text-xs text-muted-foreground">Mensajes/Conversación</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-success font-display">99.7%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-warning font-display">23</p>
                <p className="text-xs text-muted-foreground">Errores del Agente</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-2xl font-bold text-primary font-display">1.5%</p>
                <p className="text-xs text-muted-foreground">Tasa de Error</p>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">SLA Cumplido</p>
                  <p className="text-sm text-muted-foreground">
                    Tiempo de respuesta promedio dentro del objetivo (≤5 min)
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Monthly Trend */}
        <SectionCard
          title="Tendencia Mensual Completa"
          subtitle="Evolución de métricas - Noviembre 2025"
          icon={BarChart3}
        >
          <TrendChart data={monthlyTrendData} />
          <div className="mt-4 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Leads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">SQLs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Citas</span>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Dashboard de Desempeño – Agente Funnel Monte Midas · Powered by{" "}
            <span className="font-semibold text-primary">Simplia IA</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

import { Users, Target, Calendar, TrendingUp, Zap, Database, Clock, MessageSquare, AlertTriangle, CheckCircle, Filter, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { ResponseTimeGauge } from "@/components/dashboard/ResponseTimeGauge";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { DataCaptureChart } from "@/components/dashboard/DataCaptureChart";
import { DisqualificationReasons } from "@/components/dashboard/DisqualificationReasons";
import { WeeklyTrend } from "@/components/dashboard/WeeklyTrend";
import { RecentAppointments } from "@/components/dashboard/RecentAppointments";

import { SectionCard } from "@/components/dashboard/SectionCard";

// Mock data based on User's Script Context
const funnelStages = [
  { label: "Solicita Información", value: 1200, percentage: 100, color: "hsl(224, 62%, 32%)" },
  { label: "Tiene Dudas", value: 950, percentage: 79, color: "hsl(224, 55%, 45%)" },
  { label: "Interesado", value: 800, percentage: 66, color: "hsl(142, 60%, 45%)" },
  { label: "Desea un Crédito", value: 600, percentage: 50, color: "hsl(142, 60%, 35%)" },
  { label: "Agenda Cita", value: 356, percentage: 29, color: "hsl(45, 93%, 58%)" },
  { label: "No Tiene Joyas de Oro", value: 200, percentage: 16, color: "hsl(0, 70%, 60%)" },
  { label: "No Aplica", value: 150, percentage: 12, color: "hsl(0, 0%, 60%)" },
];

const monthlyTrendData = [
  { date: "Sem 1", leads: 200, sqls: 80, citas: 20 },
  { date: "Sem 2", leads: 250, sqls: 100, citas: 25 },
  { date: "Sem 3", leads: 280, sqls: 110, citas: 28 },
  { date: "Sem 4", leads: 270, sqls: 110, citas: 27 },
];

const weeklyTrendData = [
  { week: "Lun", leads: 40, citas: 5 },
  { week: "Mar", leads: 45, citas: 8 },
  { week: "Mié", leads: 42, citas: 6 },
  { week: "Jue", leads: 50, citas: 10 },
  { week: "Vie", leads: 35, citas: 4 },
  { week: "Sáb", leads: 25, citas: 3 },
  { week: "Dom", leads: 15, citas: 2 },
];

const Index = () => {
  return (
    <div className="space-y-6">

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          title="Total de Leads Entrantes"
          value="1,485"
          icon={Users}
          variant="primary"
          size="lg"
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Leads Interesados"
          value="972"
          subtitle="Interés confirmado"
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
          title="No Califican"
          value="350"
          subtitle="No Joyas / No Aplica"
          icon={AlertTriangle}
          variant="warning"
          size="lg"
          trend={{ value: 2.1, isPositive: false }}
        />
        <KPICard
          title="Tasa de Agendamiento"
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
            title="Tasa de Respuesta"
            value="76%"
            subtitle="Interacción inicial"
            icon={MessageSquare}
            variant="success"
          />
          <KPICard
            title="Tasa de Interés"
            value="65%"
            subtitle="Leads interesados"
            icon={CheckCircle}
          />
          <KPICard
            title="Tasa de Agendamiento"
            value="24%"
            subtitle="Citas del total"
            icon={Calendar}
          />
          <KPICard
            title="Tasa de Descarte"
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

      {/* Recent Appointments Table */}
      <SectionCard
        title="Últimas Citas Agendadas"
        subtitle="Datos capturados: Nombre, Celular, Agencia, Fecha, Hora"
        icon={Calendar}
        className="mb-8"
      >
        <RecentAppointments />
      </SectionCard>

      {/* SQLs & Disqualification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SectionCard
          title="KPIs de Interés"
          subtitle="Interesados y rendimiento"
          icon={Target}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-3xl font-bold text-primary font-display">972</p>
                <p className="text-sm text-muted-foreground">Leads Interesados</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-3xl font-bold text-success font-display">65%</p>
                <p className="text-sm text-muted-foreground">Tasa de Interés</p>
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
          <KPICard title="Tasa de Completitud" value="78%" variant="success" size="sm" />
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
            <span className="text-sm text-muted-foreground">Interesados</span>
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
  );
};

export default Index;

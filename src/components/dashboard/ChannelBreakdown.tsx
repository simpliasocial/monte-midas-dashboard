import { cn } from "@/lib/utils";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

interface ChannelData {
  name: string;
  leads: number;
  sqlRate: number;
  appointmentRate: number;
  icon: typeof MessageCircle;
  color: string;
}

const channels: ChannelData[] = [
  { name: "WhatsApp", leads: 847, sqlRate: 68, appointmentRate: 24, icon: MessageCircle, color: "bg-success" },
  { name: "Instagram DM", leads: 423, sqlRate: 52, appointmentRate: 18, icon: Instagram, color: "bg-pink-500" },
  { name: "Messenger", leads: 215, sqlRate: 45, appointmentRate: 12, icon: Facebook, color: "bg-blue-500" },
];

export function ChannelBreakdown({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {channels.map((channel, index) => (
        <div
          key={channel.name}
          className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-lg", channel.color)}>
              <channel.icon className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">{channel.name}</span>
            <span className="ml-auto text-lg font-bold text-primary">{channel.leads}</span>
            <span className="text-sm text-muted-foreground">leads</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">SQL Rate</span>
                <span className="font-medium">{channel.sqlRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${channel.sqlRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Appointment Rate</span>
                <span className="font-medium">{channel.appointmentRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${channel.appointmentRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { MessageCircle, Facebook, Instagram, Video } from "lucide-react";

interface ChannelData {
  name: string;
  count: number;
  percentage: number;
  icon: any;
  color: string;
}

const channels: ChannelData[] = [
  { name: "WhatsApp", count: 850, percentage: 55, icon: MessageCircle, color: "bg-green-500" },
  { name: "Facebook", count: 350, percentage: 23, icon: Facebook, color: "bg-blue-600" },
  { name: "Instagram", count: 200, percentage: 13, icon: Instagram, color: "bg-pink-500" },
  { name: "TikTok", count: 150, percentage: 9, icon: Video, color: "bg-black" },
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
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg", channel.color)}>
              <channel.icon className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">{channel.name}</span>
            <span className="ml-auto text-lg font-bold text-primary">{channel.count}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={cn("h-2.5 rounded-full", channel.color)}
              style={{ width: `${channel.percentage}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-muted-foreground mt-1">
            {channel.percentage}% del total
          </div>
        </div>
      ))}
    </div>
  );
}

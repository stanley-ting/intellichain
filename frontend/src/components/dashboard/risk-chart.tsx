"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface RiskChartProps {
  data: RiskDistribution;
}

const RISK_COLORS = {
  low: "hsl(142 71% 45%)",
  medium: "hsl(48 96% 53%)",
  high: "hsl(25 95% 53%)",
  critical: "hsl(0 72% 51%)",
};

export function RiskChart({ data }: RiskChartProps) {
  const chartData = [
    { name: "Low", value: data.low, color: RISK_COLORS.low },
    { name: "Medium", value: data.medium, color: RISK_COLORS.medium },
    { name: "High", value: data.high, color: RISK_COLORS.high },
    { name: "Critical", value: data.critical, color: RISK_COLORS.critical },
  ].filter((d) => d.value > 0);

  const total = data.low + data.medium + data.high + data.critical;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Chart */}
          <div className="relative h-32 w-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-md bg-popover px-3 py-1.5 text-xs shadow-md border border-border">
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {item.value}
                        </span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name}
                </span>
                <span className="ml-auto text-xs font-medium data-text">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

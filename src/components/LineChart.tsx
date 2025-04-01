"use client"

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
    data: {
        date: string;
        clicks: number;
    }[];
}

export default function LineChart({ data }: LineChartProps) {
    return (
        <div className="w-full h-[300px] mt-5">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                        stroke="#9CA3AF"
                        allowDecimals={false}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#9CA3AF'
                        }}
                        labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', strokeWidth: 2 }}
                    />
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
} 
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const RADIAN = Math.PI / 180;
const cx = 150;
const cy = 100;
const iR = 50;
const oR = 80;

export default function DriftGraph({ severity }) {
    // Severity is 0.0 to 1.0 (or higher)
    // We want a gauge from 0 to 100%
    // Colors: Green -> Yellow -> Red

    const value = Math.min(Math.max(severity || 0, 0), 1) * 100;

    const data = [
        { name: 'A', value: value, color: value > 60 ? 'var(--emotion-anger)' : value > 30 ? 'var(--emotion-surprise)' : 'var(--emotion-happy)' },
        { name: 'B', value: 100 - value, color: 'var(--bg-input)' },
    ];

    const needle = (value, data, cx, cy, iR, oR, color) => {
        let total = 0;
        data.forEach((v) => {
            total += v.value;
        });
        const ang = 180.0 * (1 - value / total);
        const length = (iR + 2 * oR) / 3;
        const sin = Math.sin(-RADIAN * ang);
        const cos = Math.cos(-RADIAN * ang);
        const r = 5;
        const x0 = cx;
        const y0 = cy;
        const xba = x0 + r * sin;
        const yba = y0 - r * cos;
        const xbb = x0 - r * sin;
        const ybb = y0 + r * cos;
        const xp = x0 + length * cos;
        const yp = y0 + length * sin;

        return [
            <circle key={1} cx={x0} cy={y0} r={r} fill={color} stroke="none" />,
            <path key={2} d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`} stroke="none" fill={color} />,
        ];
    };

    return (
        <div style={{ width: '300px', height: 160, position: 'relative', margin: '0 auto' }}>
            <PieChart width={300} height={160}>
                <Pie
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    data={data}
                    cx={cx}
                    cy={cy}
                    innerRadius={iR}
                    outerRadius={oR}
                    fill="#8884d8"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                {needle(value, data, cx, cy, iR, oR, 'var(--text-main)')}
            </PieChart>
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center'
            }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{value.toFixed(0)}%</span>
            </div>
        </div>
    );
}

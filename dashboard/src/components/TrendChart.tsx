import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { RunRow } from '../lib/supabase.ts';

interface Props {
  runs: RunRow[];
  threshold?: number;
  height?: number;
  mini?: boolean;
}

interface TooltipPayload {
  value: number;
  payload: RunRow;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const run = payload[0].payload as RunRow;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">
        {format(parseISO(run.created_at), 'MMM d, HH:mm')}
      </p>
      <p className={`font-medium ${run.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        Score: {run.overall_score.toFixed(1)}%
      </p>
      <p className="text-gray-500 dark:text-gray-400">
        {run.passed_tests}/{run.total_tests} passed
      </p>
      {run.branch && (
        <p className="text-gray-400 dark:text-gray-500 font-mono mt-1">{run.branch}</p>
      )}
    </div>
  );
}

export default function TrendChart({ runs, threshold = 85, height = 200, mini = false }: Props) {
  const data = [...runs]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r) => ({
      ...r,
      date: format(parseISO(r.created_at), mini ? 'MMM d' : 'MMM d HH:mm'),
      score: r.overall_score,
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-500">
        No runs yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: mini ? -24 : 0, bottom: 0 }}>
        {!mini && (
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
        )}
        {!mini && (
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-gray-400 dark:text-gray-500"
            tickLine={false}
            axisLine={false}
          />
        )}
        {!mini && (
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-gray-400 dark:text-gray-500"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={threshold}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={mini ? undefined : { value: `${threshold}%`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={(props) => {
            const run = props.payload as RunRow;
            return (
              <circle
                key={props.key}
                cx={props.cx}
                cy={props.cy}
                r={mini ? 2 : 4}
                fill={run.passed ? '#22c55e' : '#ef4444'}
                stroke="white"
                strokeWidth={1}
              />
            );
          }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

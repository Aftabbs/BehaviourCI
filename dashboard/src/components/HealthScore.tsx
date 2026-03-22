interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 85) return { stroke: '#22c55e', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' };
  if (score >= 70) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
}

const sizes = {
  sm: { outer: 48, stroke: 4, fontSize: 'text-xs', labelSize: 'text-[9px]' },
  md: { outer: 64, stroke: 5, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  lg: { outer: 96, stroke: 6, fontSize: 'text-xl', labelSize: 'text-xs' },
};

export default function HealthScore({ score, size = 'md', showLabel = true }: Props) {
  const { outer, stroke, fontSize, labelSize } = sizes[size];
  const { stroke: strokeColor, text } = getScoreColor(score);

  const radius = (outer - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const center = outer / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: outer, height: outer }}>
      <svg width={outer} height={outer} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold leading-none ${fontSize} ${text}`}>
          {score.toFixed(0)}
        </span>
        {showLabel && (
          <span className={`${labelSize} text-gray-400 dark:text-gray-500 mt-0.5`}>%</span>
        )}
      </div>
    </div>
  );
}

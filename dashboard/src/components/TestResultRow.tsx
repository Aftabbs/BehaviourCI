import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge.tsx';
import type { TestResultRow as TestResultRowType } from '../lib/supabase.ts';

interface Props {
  result: TestResultRowType;
}

export default function TestResultRow({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${!result.passed ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-gray-400 dark:text-gray-600">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>

        <StatusBadge passed={result.passed} size="sm" />

        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
          {result.behavior_name}
        </span>

        {result.score !== null && (
          <span className={`text-xs font-mono tabular-nums ${
            result.score >= 85 ? 'text-green-600 dark:text-green-400'
            : result.score >= 70 ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400'
          }`}>
            {result.score.toFixed(0)}
          </span>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {result.check_type === 'rule' ? '⚡ rule' : '🧠 semantic'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 animate-slide-up">
          {result.test_input && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Input</p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-3 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 font-mono max-h-32 overflow-y-auto">
                {result.test_input}
              </pre>
            </div>
          )}

          {result.actual_output && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Output</p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-3 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 font-mono max-h-32 overflow-y-auto">
                {result.actual_output}
              </pre>
            </div>
          )}

          {result.failure_reason && (
            <div>
              <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-1">Failure reason</p>
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                {result.failure_reason}
              </p>
            </div>
          )}

          {result.judge_reasoning && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Judge reasoning</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 italic">
                "{result.judge_reasoning}"
              </p>
            </div>
          )}

          {result.duration_ms && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{result.duration_ms}ms</p>
          )}
        </div>
      )}
    </div>
  );
}

import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  passed: boolean;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ passed, size = 'md' }: Props) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  if (passed) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${textSize} font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
        <CheckCircle2 className={iconSize} />
        Pass
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${textSize} font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
      <XCircle className={iconSize} />
      Fail
    </span>
  );
}

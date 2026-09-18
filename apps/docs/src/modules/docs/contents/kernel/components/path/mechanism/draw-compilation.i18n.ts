import type { Lang } from '@/i18n';

export const drawCompilationI18n: Record<Lang, { input: string; normalize: string; geometry: string; output: string }> =
  {
    zh: { input: '作者输入', normalize: '统一步骤与标记', geometry: '求出实际几何', output: '输出路径与装饰' },
    en: {
      input: 'Author input',
      normalize: 'Steps and marks',
      geometry: 'Resolve geometry',
      output: 'Path and decorations',
    },
  };

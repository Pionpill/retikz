import type { Lang } from '@/i18n';

export const sugarFlowI18n: Record<
  Lang,
  { input: string; process: string; output: string; expand: string; compile: string }
> = {
  zh: { input: '便捷写法', process: '基础 IR', output: 'Scene', expand: '解析 / 展开', compile: '编译' },
  en: { input: 'Sugar', process: 'Basic IR', output: 'Scene', expand: 'Parse / expand', compile: 'Compile' },
};

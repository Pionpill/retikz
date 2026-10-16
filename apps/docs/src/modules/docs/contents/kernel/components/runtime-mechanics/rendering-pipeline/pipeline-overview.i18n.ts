import type { Lang } from '@/i18n';

/** 渲染链路总览的双语文案 */
export const pipelineOverviewI18n: Record<
  Lang,
  { collect: string; input: string; external: string; prepare: string; runtime: string; compile: string }
> = {
  zh: {
    collect: 'Layout 收集',
    input: 'Vanilla Input',
    external: '已有 IR',
    prepare: '输入处理',
    runtime: 'retained 时构建',
    compile: '编译',
  },
  en: {
    collect: 'Layout collects',
    input: 'Vanilla Input',
    external: 'Existing IR',
    prepare: 'Prepare input',
    runtime: 'Built in retained mode',
    compile: 'Compile',
  },
};

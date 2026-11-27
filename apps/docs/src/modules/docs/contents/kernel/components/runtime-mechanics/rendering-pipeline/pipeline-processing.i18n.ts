import type { Lang } from '@/i18n';

/** 跨包交接图的双语文案 */
export const pipelineProcessingI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['输入配置', 'InputScene / IRScene'],
    prepare: ['输入准备', '统一 IR 与编译选项'],
    initial: ['首帧', '单次处理'],
    mounted: ['挂载后', '构建 Runtime 并维护更新'],
    core: ['Reconciler', '组合 Core 原子阶段'],
  },
  en: {
    input: ['Input', 'InputScene / IRScene'],
    prepare: ['Prepare input', 'IR + compile options'],
    initial: ['First render', 'Single pass'],
    mounted: ['After commit', 'Runtime + updates'],
    core: ['Reconciler', 'Compose Core stages'],
  },
};

import type { Lang } from '@/i18n';

/** 跨包交接图的双语文案 */
export const pipelineProcessingI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['输入配置', 'InputScene / IRScene'],
    prepare: ['输入准备', '统一 IR 与编译选项'],
    static: ['static', '单次处理'],
    retained: ['retained', '构建 Runtime 并维护更新'],
    core: ['Core', '执行编译'],
  },
  en: {
    input: ['Input', 'InputScene / IRScene'],
    prepare: ['Prepare input', 'IR + compile options'],
    static: ['static', 'Single pass'],
    retained: ['retained', 'Runtime + updates'],
    core: ['Core', 'Compile drawing'],
  },
};

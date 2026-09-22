import type { Lang } from '@/i18n';

/** 数据模型流程图的双语文案 */
export const dataModelPipelineI18n: Record<
  Lang,
  {
    contract: Readonly<{ title: string; detail: string }>;
    rows: Readonly<{ title: string; detail: string }>;
    canonical: Readonly<{ title: string; detail: string }>;
    consumers: Readonly<{ title: string; detail: string }>;
    parse: string;
    handoff: string;
    constrain: string;
  }
> = {
  zh: {
    contract: { title: '字段契约', detail: '类型 · 格式 · 顺序' },
    rows: { title: '外部数据行', detail: '接口 · 文件 · 数据库' },
    canonical: { title: '规范化行', detail: '逻辑字段 · 标准值' },
    consumers: { title: '后续处理', detail: '数据变换 · 消费模块' },
    parse: '解析',
    handoff: '交付',
    constrain: '约束',
  },
  en: {
    contract: { title: 'Field contract', detail: 'type · format · order' },
    rows: { title: 'External rows', detail: 'APIs · files · databases' },
    canonical: { title: 'Canonical rows', detail: 'logical fields · values' },
    consumers: { title: 'Downstream use', detail: 'transforms · consumer modules' },
    parse: 'parse',
    handoff: 'handoff',
    constrain: 'constrain',
  },
};

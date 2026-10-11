import type { Lang } from '@/i18n';

/** 三个试验场共用的可见文案 */
export const provenanceDemoI18n: Record<
  Lang,
  {
    rows: string;
    source: string;
    provenance: string;
    output: string;
    operation: string;
    sort: string;
    select: string;
    annotate: string;
    summarize: string;
    smooth: string;
    records: string;
    scope: string;
    budget: string;
    full: string;
    maxIndices: string;
    steps: string;
    fields: string;
    reducers: string;
    selectors: string;
    samples: string;
    details: string;
    maxRows: string;
    delivery: string;
    sink: string;
    retain: string;
    count: string;
    configuration: string;
    eventType: string;
    eventContent: string;
    delivered: string;
    retained: string;
  }
> = {
  zh: {
    rows: '行来源',
    source: '输入明细',
    provenance: '建立行来源',
    output: '输出与来源',
    operation: '排序后的操作',
    sort: '仅排序',
    select: '每组选择最大行',
    annotate: '每行标注组总额',
    summarize: '每组汇总',
    smooth: '每组生成预测点',
    records: '链路事件',
    scope: '记录范围',
    budget: '记录上限',
    full: '完整来源索引',
    maxIndices: '摘要索引上限',
    steps: '变换阶段',
    fields: '字段流',
    reducers: '规约算子',
    selectors: '选择算子',
    samples: '输入与输出样本',
    details: '算子输入详情',
    maxRows: '每份样本行数',
    delivery: '事件消费',
    sink: '使用事件回调',
    retain: '同时保留事件数组',
    count: '输入 4 行',
    configuration: '溯源配置',
    eventType: '事件',
    eventContent: '记录内容',
    delivered: '回调接收',
    retained: '返回保留',
  },
  en: {
    rows: 'Row provenance',
    source: 'Input rows',
    provenance: 'Assign row sources',
    output: 'Output and sources',
    operation: 'Operation after sorting',
    sort: 'Sort only',
    select: 'Select each group’s maximum',
    annotate: 'Annotate group total',
    summarize: 'Summarize each group',
    smooth: 'Predict within each group',
    records: 'Lineage events',
    scope: 'Recording scope',
    budget: 'Recording limits',
    full: 'Full source indices',
    maxIndices: 'Summary index limit',
    steps: 'Transform steps',
    fields: 'Field flow',
    reducers: 'Reducer operations',
    selectors: 'Selector operations',
    samples: 'Input and output samples',
    details: 'Operator input details',
    maxRows: 'Rows per sample',
    delivery: 'Event consumption',
    sink: 'Use an event callback',
    retain: 'Also retain the event array',
    count: '4 input rows',
    configuration: 'Provenance options',
    eventType: 'Event',
    eventContent: 'Recorded content',
    delivered: 'Delivered',
    retained: 'Retained',
  },
};

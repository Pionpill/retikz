import type { Lang } from '@/i18n';

/** 同一布局结果的两个消费者 */
export const flowMaterializationI18n: Record<
  Lang,
  {
    receive: string;
    verify: string;
    output: string;
    graph: string;
    artifact: string;
    draw: string;
    record: string;
    offset: string;
  }
> = {
  zh: {
    receive: '接收',
    verify: '校验',
    output: 'FlowLayoutOutput · receive 摘录',
    graph: 'Graph · 绘图内容摘录',
    artifact: 'artifact.elements · receive 摘录',
    draw: '写入绘图位置',
    record: '记录结果几何',
    offset: '示例 drawingOffset = (0, 0)',
  },
  en: {
    receive: 'Receive',
    verify: 'Verify',
    output: 'FlowLayoutOutput · receive excerpt',
    graph: 'Graph · Drawing excerpt',
    artifact: 'artifact.elements · receive excerpt',
    draw: 'Apply drawing positions',
    record: 'Record result geometry',
    offset: 'Example drawingOffset = (0, 0)',
  },
};

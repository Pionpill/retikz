import type { FC } from 'react';

import type { TablePresentationFlowLabels } from './table-presentation-flow';

import { TablePresentationFlow } from './table-presentation-flow';

/** 中文 Presentation 流程图文本 */
const LABELS = {
  style: { title: '内置 preset < 用户 tokens', detail: '外观基线' },
  cell: { title: 'Cell 配置', detail: 'formatter · presentation · appearance' },
  encoding: { title: 'visual encodings', detail: '原始值颜色通道' },
  rules: { title: '有序 rules', detail: '最终匹配覆盖' },
  plan: { title: '已解析 Cell plan', detail: '胜出引用 + 最终外观' },
  raw: { title: '原始值', detail: 'canonical scalar' },
  formatter: { title: '已解析 formatter', detail: '原始 scalar → 显示 scalar' },
  presentation: { title: '已解析 Presentation', detail: '原始值 + 显示值 + 外观' },
  styled: { title: '带样式 Core child', detail: '保持顺序与可选 identity' },
  content: { title: 'content payload', detail: '可渲染 child' },
  contentStyle: { title: '已解析 content style', detail: '绕过两类 Definition' },
} satisfies TablePresentationFlowLabels;

/** 中文 Cell presentation 职责图 */
const Demo: FC = () => <TablePresentationFlow labels={LABELS} />;

export default Demo;

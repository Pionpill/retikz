import type { FC } from 'react';

import type { TablePresentationFlowLabels } from './table-presentation-flow';

import { TablePresentationFlow } from './table-presentation-flow';

/** 英文 Presentation 流程图文本 */
const LABELS = {
  style: { title: 'preset < user tokens', detail: 'appearance baseline' },
  cell: { title: 'Cell configuration', detail: 'formatter · presentation · appearance' },
  encoding: { title: 'visual encodings', detail: 'raw-value color channels' },
  rules: { title: 'ordered rules', detail: 'final matching override' },
  plan: { title: 'resolved Cell plan', detail: 'winning references + final appearance' },
  raw: { title: 'raw value', detail: 'canonical scalar' },
  formatter: { title: 'resolved formatter', detail: 'raw scalar → display scalar' },
  presentation: { title: 'resolved Presentation', detail: 'raw + value + appearance' },
  styled: { title: 'styled Core child', detail: 'same Cell identity' },
  content: { title: 'content payload', detail: 'renderable child' },
  contentStyle: { title: 'resolved content style', detail: 'bypass both Definitions' },
} satisfies TablePresentationFlowLabels;

/** 英文 Cell presentation 职责图 */
const Demo: FC = () => <TablePresentationFlow labels={LABELS} />;

export default Demo;

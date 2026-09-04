import type { IRFlowDiagram } from '../../src/flow';

import { FlowDiagramSchema } from '../../src/flow';

/** 在测试入口解析正式的平级 Flow Source fixture */
export const parseTestFlowDiagram = (source: IRFlowDiagram): IRFlowDiagram => FlowDiagramSchema.parse(source);

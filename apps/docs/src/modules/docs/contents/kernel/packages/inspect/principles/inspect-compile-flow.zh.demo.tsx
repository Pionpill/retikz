import type { FC } from 'react';

import type { InspectCompileFlowLabels } from './inspect-compile-flow';

import { InspectCompileFlowFigure } from './inspect-compile-flow';

const labels = {
  observedCompile: { title: '已观测编译', detail: 'IR → 最终版本' },
  ownerOutput: { title: '最终所属者产物', detail: '实例 + 检查对象' },
  primaryScene: { title: '主 Scene', detail: '主图保持不变', shortDetail: '保持不变' },
  inspectorCallback: { title: '检查器回调', detail: '检查对象 → IRChild' },
  sealedFragment: { title: '隔离片段', detail: '独立 Scene 条目' },
  inspectionInputs: { title: '选择 + 注册表', detail: '仅运行时输入', shortDetail: '仅运行时' },
  atomicFrame: { title: '原子提交', detail: '主图 + 只读图层' },
} satisfies InspectCompileFlowLabels;

const Demo: FC = () => <InspectCompileFlowFigure labels={labels} />;

export default Demo;

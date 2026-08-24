import type { FC } from 'react';

import type { InspectCompileFlowLabels } from './inspect-compile-flow';

import { InspectCompileFlowFigure } from './inspect-compile-flow';

const labels = {
  observedCompile: { title: 'Observed compile', detail: 'IR → final revision' },
  ownerOutput: { title: 'Final owner output', detail: 'occurrence + subject' },
  primaryScene: { title: 'Primary Scene', detail: 'unchanged main figure', shortDetail: 'unchanged' },
  inspectorCallback: { title: 'Inspector callback', detail: 'subject → IRChild' },
  sealedFragment: { title: 'Sealed fragment', detail: 'isolated Scene entry' },
  inspectionInputs: { title: 'Selection + registry', detail: 'runtime-only input', shortDetail: 'runtime-only' },
  atomicFrame: { title: 'Atomic frame', detail: 'primary + readonly layers' },
} satisfies InspectCompileFlowLabels;

const Demo: FC = () => <InspectCompileFlowFigure labels={labels} />;

export default Demo;

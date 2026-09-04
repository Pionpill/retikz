import type { IRFlowDiagram } from '@retikz/diagram/flow';

import type { InputFlowDiagram } from './types';

/** 将类型化 Flow authoring 输入组装为唯一 Diagram Source IR */
export const normalizeFlowDiagram = (input: InputFlowDiagram): IRFlowDiagram => {
  const { entities, groups, layouts, children, relations, ...root } = input;
  return {
    namespace: 'diagram',
    type: 'flow',
    ...root,
    entities: [...entities],
    groups: groups.map(group => ({ ...group, children: [...group.children] })),
    layouts: layouts.map(layout => ({ ...layout, children: [...layout.children] })),
    children: [...children],
    ...(relations === undefined ? {} : { relations: [...relations] }),
  };
};

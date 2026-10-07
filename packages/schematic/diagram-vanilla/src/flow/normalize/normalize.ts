import type { IRFlowDiagram } from '@retikz/diagram/flow';

import type { InputFlowDiagram } from './types';

/**
 * 将类型化 Flow authoring 输入组装为唯一 Diagram Source IR
 * @param input 不含 namespace 与 type 的类型化 Flow 声明
 * @returns 补入固定判别字段并复制目录与 children 数组的 Source；不执行布局或 Schema 解析
 */
export const normalizeFlowDiagram = (input: InputFlowDiagram): IRFlowDiagram => {
  const { entities, groups, layouts, relations, children, ...root } = input;
  return {
    namespace: 'diagram',
    type: 'flow',
    ...root,
    entities: [...entities],
    ...(groups?.length ? { groups: groups.map(group => ({ ...group, children: [...group.children] })) } : {}),
    ...(layouts?.length ? { layouts: layouts.map(layout => ({ ...layout, children: [...layout.children] })) } : {}),
    ...(relations === undefined ? {} : { relations: [...relations] }),
    children: [...children],
  };
};

import * as Graph from '../../src';

/** 将测试 fixture 的 family 分组展开为当前 Graph children Source IR */
export const graphSource = (input: Readonly<Record<string, unknown>>) => {
  const { entities, relations, children, ...root } = input;
  const hasChildren = entities !== undefined || relations !== undefined || children !== undefined;
  if (!hasChildren) return Graph.GraphSchema.parse(root);
  return Graph.GraphSchema.parse({
    ...root,
    children: [
      ...(Array.isArray(entities) ? entities : []),
      ...(Array.isArray(relations) ? relations : []),
      ...(Array.isArray(children) ? children : []),
    ],
  });
};

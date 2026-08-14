import type { IRAtPosition, IRNode, IRNodeLabel } from '@retikz/core';

import type { InputNode, InputNodeLabel } from './types';

/** 将一个作者侧节点标签组装为 Source IR 标签 */
const normalizeNodeLabel = (input: InputNodeLabel): IRNodeLabel => ({ ...input });

/** 判断节点标签是否为列表写法 */
const isNodeLabelList = (input: InputNode['label']): input is ReadonlyArray<InputNodeLabel> => Array.isArray(input);

/** 将作者侧相对定位组装为 Source IR 定位 */
const normalizeAtPosition = (input: InputNode['position']): InputNode['position'] | IRAtPosition => input;

/** 将作者侧节点输入组装为 Source IR */
export const normalizeNode = (input: InputNode): IRNode => {
  const { type: _type, label, ...node } = input;
  void _type;
  return {
    type: 'node',
    ...node,
    position: normalizeAtPosition(input.position),
    ...(label === undefined
      ? {}
      : {
          label: isNodeLabelList(label) ? [...label].map(normalizeNodeLabel) : normalizeNodeLabel(label),
        }),
  };
};

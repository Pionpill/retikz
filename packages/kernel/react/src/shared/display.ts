import type { ValueOf } from '@retikz/foundation';
import type { ReactElement } from 'react';

/** Kernel 组件的展示名称；其中图元标记也用于 JSX 收集 */
export const KernelDisplayName = {
  Coordinate: 'RetikzKernelCoordinate',
  Draw: 'RetikzKernelDraw',
  Layout: 'RetikzKernelLayout',
  Node: 'RetikzKernelNode',
  NodeLabel: 'RetikzKernelNodeLabel',
  Path: 'RetikzKernelPath',
  PathLabel: 'RetikzKernelPathLabel',
  Scope: 'RetikzKernelScope',
  Step: 'RetikzKernelStep',
  StepLabel: 'RetikzKernelStepLabel',
  Text: 'RetikzKernelText',
} as const;

export type KernelDisplayName = ValueOf<typeof KernelDisplayName>;

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回，用于识别 Kernel/Sugar 组件 */
export const getDisplayName = (element: ReactElement): string | undefined => {
  const type = element.type as { displayName?: string } | string;
  if (typeof type === 'string') return type;
  return type.displayName;
};

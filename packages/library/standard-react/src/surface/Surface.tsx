import type { ReactInputEmbedContext } from '@retikz/react';
import type { SurfaceInput } from '@retikz/standard';
import type { InputSurface } from '@retikz/standard-vanilla';
import type { FC, ReactNode } from 'react';

import { createInputScene, withInputEmbedAdapters } from '@retikz/react';
import { SurfaceInputEmbedAdapter } from '@retikz/standard-vanilla';

import type { StandardEmbeddableComponent } from '../shared';

/** React Surface 组件接受的 Standard authoring 输入 */
export type SurfaceProps = Omit<SurfaceInput, 'namespace' | 'type' | 'child'> & {
  /** 恰好一个可转换为 Core IR 的 Kernel、Sugar 或 Tier 2 child */
  children: ReactNode;
};

/** 将唯一 React child 收集为 Standard Vanilla Input */
const createSurfaceInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as SurfaceProps;
  const childInput = createInputScene(children, { embedIdPrefix: `${context.id}:child` });
  const childrenInput = childInput.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error('Surface children must contain exactly one authoring child.');
  }
  const inputProps: InputSurface = {
    ...input,
    child: childrenInput[0],
  };
  return withInputEmbedAdapters(inputProps, childInput.adapters);
};

const SurfaceComponent: FC<SurfaceProps> = () => null;

/** Standard Surface 的 React Tier 2 authoring 组件 */
export const Surface = SurfaceComponent as StandardEmbeddableComponent<SurfaceProps>;

Surface.displayName = 'Surface';
Surface.isTier2Embeddable = true;
Surface.inputEmbedAdapter = SurfaceInputEmbedAdapter;
Surface.createInputEmbedProps = createSurfaceInput;

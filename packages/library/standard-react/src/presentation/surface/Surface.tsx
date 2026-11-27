import type { ReactInputEmbedContext } from '@retikz/react';
import { convertReactToInputScene } from '@retikz/react';
import type { InputSurface } from '@retikz/standard-vanilla/presentation';
import { surfaceInputEmbedAdapter } from '@retikz/standard-vanilla/presentation';
import type { InputSurfaceConfig } from '@retikz/standard/presentation';
import { RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/presentation';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';

/** React Surface 组件接受的 Standard authoring 输入 */
export type SurfaceProps = Omit<InputSurfaceConfig, 'namespace' | 'type' | 'child'> & {
  /** 恰好一个可转换为 Core IR 的 Kernel、Sugar 或 Tier 2 child */
  children: ReactNode;
};

/** 将唯一 React child 收集为 Standard Vanilla Input */
const createSurfaceInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as SurfaceProps;
  const childInput = convertReactToInputScene(children, { embedIdPrefix: `${context.id}:child` });
  const childrenInput = childInput.children;
  if (childrenInput.length !== 1) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Surface children must contain exactly one authoring child.',
      details: { childCount: childrenInput.length, component: 'Surface' },
    });
  }

  const inputProps: InputSurface = {
    ...input,
    child: childrenInput[0],
  };

  return inputProps;
};

const SurfaceComponent: FC<SurfaceProps> = () => null;

/** Standard Surface 的 React Tier 2 authoring 组件 */
export const Surface = SurfaceComponent as StandardEmbeddableComponent<SurfaceProps>;

Surface.displayName = 'Surface';
Surface.isTier2Embeddable = true;
Surface.inputEmbedAdapter = surfaceInputEmbedAdapter;
Surface.createInputEmbedProps = createSurfaceInput;

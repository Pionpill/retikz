import type { Scene, IRScene } from '@retikz/core';
import type { CompositeArtifact } from '@retikz/reconciler';

import type { InputScene } from '../normalize';
import { compileToScene } from '../runtime';
import type { CommonOptions } from './types';

/** 预编译场景没有编译产物 */
export const EMPTY_ARTIFACTS: ReadonlyArray<CompositeArtifact> = Object.freeze([]);

/** 为静态 DOM 视图取得场景；只有从声明编译时才附带编译结果 */
export const resolveStaticMountScene = (input: Scene | InputScene | IRScene, options: CommonOptions) => {
  if ('primitives' in input) return { scene: input };

  const compileResult = compileToScene(input, options);
  return { scene: compileResult.scene, compileResult };
};

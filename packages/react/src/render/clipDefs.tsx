import type { FC } from 'react';
import type { SceneResource } from '@retikz/core';
import { buildClipDef } from '@retikz/svg';
import { svgToReact } from './svgToReact';

/**
 * Scene clip 资源 → `<clipPath>` 薄绑定层
 * @description 物化逻辑在 `@retikz/svg` 的 `buildClipDef`（产中性 `SvgNode`）；本层按 `kind` 取 clip 资源、
 *   经 `idFor` 加实例前缀后映射成 React element。`GroupPrim.clipRef` 经同 id 的 `url(#...)` 引用。
 */
export const ClipDefs: FC<{ resources: Array<SceneResource>; idFor: (id: string) => string }> = ({
  resources,
  idFor,
}) => (
  <>
    {resources.map(r =>
      r.kind === 'clip' ? svgToReact(buildClipDef(r, idFor(r.id)), r.id) : null,
    )}
  </>
);

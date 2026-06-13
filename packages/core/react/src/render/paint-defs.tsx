import type { FC } from 'react';
import type { SceneResource } from '@retikz/core';
import { buildPaintDef } from '@retikz/render/svg';
import { svgToReact } from './svg-to-react';

/**
 * Scene paint 资源 → SVG paint server（gradient / pattern / image）薄绑定层
 * @description 物化逻辑在 `@retikz/render/svg` 的 `buildPaintDef`（产中性 `SvgNode`）；本层按 `kind` 取 paint 资源、
 *   经 `idFor` 加实例前缀后映射成 React element。clip 资源走 `ClipDefs`。
 */
export const PaintDefs: FC<{ resources: Array<SceneResource>; idFor: (id: string) => string }> = ({
  resources,
  idFor,
}) => (
  <>
    {resources.map(r =>
      r.kind === 'paint' ? svgToReact(buildPaintDef(r, idFor(r.id)), r.id) : null,
    )}
  </>
);

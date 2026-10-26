import type { ResolvedArrowEnd, ScenePrimitive, SceneResource } from '@retikz/core';
import { buildArrowMarker, buildClipDef, buildPaintDef, buildPrim } from '@retikz/render/svg';
import type { Key, ReactElement } from 'react';

import { svgToReact } from '../../../src/render/svg';

/** 将 Render builder 输出转换为可断言的 React 图元 */
export const renderPrim = (primitive: ScenePrimitive, key: Key, context: Parameters<typeof buildPrim>[1] = {}) =>
  svgToReact(buildPrim(primitive, context), key) as ReactElement;

/** 验证中立 marker descriptor 到 React 的映射 */
export const renderArrowMarker = ({ id, spec }: { id: string; spec: ResolvedArrowEnd }) =>
  svgToReact(buildArrowMarker(id, spec)) as ReactElement;

/** 将测试资源中的 clip descriptor 映射为 React children */
export const renderClipDefs = ({
  resources,
  idFor,
}: {
  resources: Array<SceneResource>;
  idFor: (id: string) => string;
}) => (
  <>
    {resources.map(resource =>
      resource.kind === 'clip' ? svgToReact(buildClipDef(resource, idFor(resource.id)), resource.id) : null,
    )}
  </>
);

/** 将测试资源中的 paint descriptor 映射为 React children */
export const renderPaintDefs = ({
  resources,
  idFor,
}: {
  resources: Array<SceneResource>;
  idFor: (id: string) => string;
}) => (
  <>
    {resources.map(resource =>
      resource.kind === 'paint' ? svgToReact(buildPaintDef(resource, idFor(resource.id)), resource.id) : null,
    )}
  </>
);

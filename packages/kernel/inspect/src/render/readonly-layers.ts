import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import type { InspectionPlane } from '../compile';

/** 把 InspectionPlane entries 一对一映射为 Render 普通只读 layers */
export const inspectionPlaneToReadonlyLayers = (plane: InspectionPlane | null): ReadonlyArray<RenderReadonlyLayer> => {
  if (plane === null || plane.entries.length === 0) return Object.freeze([]);
  return Object.freeze(
    plane.entries.map((entry, index) =>
      Object.freeze({
        key: `inspect:${entry.inspector.namespace}/${entry.inspector.name}:${index}`,
        scene: entry.scene,
        transform: entry.transform,
      }),
    ),
  );
};

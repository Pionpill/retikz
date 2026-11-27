import type { SceneResource } from '@retikz/core';

import { buildClipDef, buildPaintDef } from '../../../src/svg';

type Resources = { resources: Array<SceneResource>; idFor: (id: string) => string };

export const renderClipDefs = ({ resources, idFor }: Resources) =>
  resources.flatMap(resource => (resource.kind === 'clip' ? [buildClipDef(resource, idFor(resource.id))] : []));

export const renderPaintDefs = ({ resources, idFor }: Resources) =>
  resources.flatMap(resource => (resource.kind === 'paint' ? [buildPaintDef(resource, idFor(resource.id))] : []));

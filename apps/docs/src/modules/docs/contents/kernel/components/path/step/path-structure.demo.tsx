import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathStructureControls, previewControlContract } from './path-structure.controls';
import { PathStructurePreview } from './path-structure.preview';

export const previewControls = pathStructureControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathStructurePreview({
    structure: values.structure,
    fill: values.fill,
  }),
);

export const previewSource = controlledPreview.source;

/** Path 基础结构 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

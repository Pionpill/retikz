import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  primitiveRelationsPlaygroundControls,
} from './primitive-relations-playground.controls';
import { PrimitiveRelationsPlaygroundPreview } from './primitive-relations-playground.preview';

export const previewControls = primitiveRelationsPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PrimitiveRelationsPlaygroundPreview({
    sourceAngle: values.sourceAngle,
    boundaryOverride: values.boundaryOverride,
    anchor: values.anchor,
    anchorAngle: values.anchorAngle,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 图元关系端点 playground
 * @description 固定目标与取景，让来源沿轨道移动，对比自动贴边、显式 anchor 与单条边 boundary 覆盖
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, wayCycleControls } from './way-cycle.controls';
import { WayCyclePreview } from './way-cycle.preview';

export const previewControls = wayCycleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  WayCyclePreview({
    state: values.state,
  }),
);

export const previewSource = controlledPreview.source;

/** 在固定三点路径上切换 DrawWay.Cycle */
const Demo: FC = controlledPreview.Component;

export default Demo;

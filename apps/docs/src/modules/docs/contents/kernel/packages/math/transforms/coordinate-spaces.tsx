import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { coordinateSpacesControls, previewControlContract } from './coordinate-spaces.controls';
import { CoordinateSpacesPreview } from './coordinate-spaces.preview';

export const previewControls = coordinateSpacesControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => CoordinateSpacesPreview(values));

export const previewSource = controlledPreview.source;

/** 通过控制图形中心、旋转角和局部点观察坐标变换 */
const Demo: FC<{ lang?: Lang }> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(coordinateSpacesControls);
  return CoordinateSpacesPreview(values, lang);
};

export default Demo;

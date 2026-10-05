import type { HydrationEventProps } from '@retikz/react';
import type { InputPolygon } from '@retikz/standard-vanilla/shape';
import { PolygonInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';

/** React Polygon 的作者输入与宿主事件 */
export type PolygonProps = InputPolygon &
  HydrationEventProps & {
    /** 显式路径身份 */
    id?: string;
  };

const PolygonComponent: FC<PolygonProps> = () => null;

/** 通过 Vanilla adapter 声明 Standard Polygon */
export const Polygon = PolygonComponent as StandardEmbeddableComponent<PolygonProps>;
Polygon.displayName = 'Polygon';
Polygon.isTier2Embeddable = true;
Polygon.inputEmbedAdapter = PolygonInputEmbedAdapter;
Polygon.createInputEmbedProps = shapeEmbedProps;

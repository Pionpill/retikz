import type { HydrationEventProps } from '@retikz/react';
import type { InputRegularPolygon } from '@retikz/standard-vanilla/shape';
import { RegularPolygonInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React RegularPolygon 的作者输入与宿主事件 */
export type RegularPolygonProps = InputRegularPolygon & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const RegularPolygonComponent: FC<RegularPolygonProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard RegularPolygon */
export const RegularPolygon = RegularPolygonComponent as StandardEmbeddableComponent<RegularPolygonProps>;
RegularPolygon.displayName = 'RegularPolygon';
RegularPolygon.isTier2Embeddable = true;
RegularPolygon.inputEmbedAdapter = RegularPolygonInputEmbedAdapter;
RegularPolygon.createInputEmbedProps = shapeEmbedProps;

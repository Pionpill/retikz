import type { HydrationEventProps } from '@retikz/react';
import type { InputRectangle } from '@retikz/standard-vanilla/shape';
import { RectangleInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Rectangle 的作者输入与宿主事件 */
export type RectangleProps = InputRectangle & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const RectangleComponent: FC<RectangleProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Rectangle */
export const Rectangle = RectangleComponent as StandardEmbeddableComponent<RectangleProps>;
Rectangle.displayName = 'Rectangle';
Rectangle.isTier2Embeddable = true;
Rectangle.inputEmbedAdapter = RectangleInputEmbedAdapter;
Rectangle.createInputEmbedProps = shapeEmbedProps;

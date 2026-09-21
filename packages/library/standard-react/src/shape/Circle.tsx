import type { HydrationEventProps } from '@retikz/react';
import type { InputCircle } from '@retikz/standard-vanilla/shape';
import { CircleInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Circle 的作者输入与宿主事件 */
export type CircleProps = InputCircle & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const CircleComponent: FC<CircleProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Circle */
export const Circle = CircleComponent as StandardEmbeddableComponent<CircleProps>;
Circle.displayName = 'Circle';
Circle.isTier2Embeddable = true;
Circle.inputEmbedAdapter = CircleInputEmbedAdapter;
Circle.createInputEmbedProps = shapeEmbedProps;

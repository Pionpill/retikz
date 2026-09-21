import type { HydrationEventProps } from '@retikz/react';
import type { InputStar } from '@retikz/standard-vanilla/shape';
import { StarInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Star 的作者输入与宿主事件 */
export type StarProps = InputStar & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const StarComponent: FC<StarProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Star */
export const Star = StarComponent as StandardEmbeddableComponent<StarProps>;
Star.displayName = 'Star';
Star.isTier2Embeddable = true;
Star.inputEmbedAdapter = StarInputEmbedAdapter;
Star.createInputEmbedProps = shapeEmbedProps;

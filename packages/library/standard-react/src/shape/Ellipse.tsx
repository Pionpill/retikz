import type { HydrationEventProps } from '@retikz/react';
import type { InputEllipse } from '@retikz/standard-vanilla/shape';
import { EllipseInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Ellipse 的作者输入与宿主事件 */
export type EllipseProps = InputEllipse & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const EllipseComponent: FC<EllipseProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Ellipse */
export const Ellipse = EllipseComponent as StandardEmbeddableComponent<EllipseProps>;
Ellipse.displayName = 'Ellipse';
Ellipse.isTier2Embeddable = true;
Ellipse.inputEmbedAdapter = EllipseInputEmbedAdapter;
Ellipse.createInputEmbedProps = shapeEmbedProps;

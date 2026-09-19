import type { HydrationEventProps } from '@retikz/react';
import type { InputArc } from '@retikz/standard-vanilla/shape';
import { ArcInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Arc 的作者输入与宿主事件 */
export type ArcProps = InputArc & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const ArcComponent: FC<ArcProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Arc */
export const Arc = ArcComponent as StandardEmbeddableComponent<ArcProps>;
Arc.displayName = 'Arc';
Arc.isTier2Embeddable = true;
Arc.inputEmbedAdapter = ArcInputEmbedAdapter;
Arc.createInputEmbedProps = shapeEmbedProps;

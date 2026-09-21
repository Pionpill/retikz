import type { HydrationEventProps } from '@retikz/react';
import type { InputSector } from '@retikz/standard-vanilla/shape';
import { SectorInputEmbedAdapter } from '@retikz/standard-vanilla/shape';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../shared';
import { shapeEmbedProps } from './shared';
/** React Sector 的作者输入与宿主事件 */
export type SectorProps = InputSector & HydrationEventProps & { /** 显式路径身份 */ id?: string };
const SectorComponent: FC<SectorProps> = () => null;
/** 通过 Vanilla adapter 声明 Standard Sector */
export const Sector = SectorComponent as StandardEmbeddableComponent<SectorProps>;
Sector.displayName = 'Sector';
Sector.isTier2Embeddable = true;
Sector.inputEmbedAdapter = SectorInputEmbedAdapter;
Sector.createInputEmbedProps = shapeEmbedProps;

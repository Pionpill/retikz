import { discriminatedUnion } from 'zod';

import { FlexLayoutArtifactSchema, FlexLayoutItemSchema } from './flex-layout';
import { GridLayoutArtifactSchema, GridLayoutItemSchema } from './grid-layout';
import { OverlayLayoutArtifactSchema, OverlayLayoutItemSchema } from './overlay-layout';

/** 按 kind 校验 Flex、Grid 或 Overlay 的编译观测产物 */
export const LayoutArtifactSchema = discriminatedUnion('kind', [
  FlexLayoutArtifactSchema,
  GridLayoutArtifactSchema,
  OverlayLayoutArtifactSchema,
]).describe('Closed union of Layout compile artifact payloads.');

/** 按 kind 校验 Flex、Grid 或 Overlay 容器接受的子项 */
export const LayoutItemSchema = discriminatedUnion('kind', [
  FlexLayoutItemSchema,
  GridLayoutItemSchema,
  OverlayLayoutItemSchema,
]).describe('Closed union of items accepted by Layout containers.');

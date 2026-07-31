import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  LayoutArtifactAlignmentGuideSchema,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactOverflowSchema,
  LayoutArtifactRectSchema,
  LayoutTrackArtifactSchema,
} from './artifact-schema';
import type { LayoutTrackSourceKind } from './constants';

/** Layout artifact track 来源取值 */
export type LayoutTrackSourceKindValue = ValueOf<typeof LayoutTrackSourceKind>;

/** Layout artifact 的 container-local 矩形 */
export type LayoutArtifactRect = z.infer<typeof LayoutArtifactRectSchema>;

/** Layout item 的可观察溢出状态 */
export type LayoutArtifactOverflow = z.infer<typeof LayoutArtifactOverflowSchema>;

/** Layout item 实际采用的 alignment guide */
export type LayoutArtifactAlignmentGuide = z.infer<typeof LayoutArtifactAlignmentGuideSchema>;

/** 三种布局 item 共用的 placement artifact */
export type LayoutArtifactItemBase = z.infer<typeof LayoutArtifactItemBaseSchema>;

/** 三种布局 container 共用的几何 artifact */
export type LayoutArtifactContainer = z.infer<typeof LayoutArtifactContainerSchema>;

/** GridLayout resolved track artifact */
export type LayoutTrackArtifact = z.infer<typeof LayoutTrackArtifactSchema>;

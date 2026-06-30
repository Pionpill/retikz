import type { z } from 'zod';

import type { ClipShape } from '../../primitive';
import type { IRClipSpec } from '../../schemas/clip';

export type ClipSpecLike = { kind: string };

export type ClipResolveContext = {
  round: (value: number) => number;
  resolve: (clip: IRClipSpec) => ClipShape;
};

export type ClipDefinitionInput<TSpec extends ClipSpecLike> = {
  kind: TSpec['kind'];
  schema: z.ZodType<TSpec>;
  resolve: (spec: TSpec, context: ClipResolveContext) => ClipShape;
};

export type ClipDefinition = ClipDefinitionInput<ClipSpecLike>;

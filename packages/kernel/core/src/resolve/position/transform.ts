import type {
  IRAtTranslateTransform,
  IRBetweenPosition,
  IRBetweenTranslateTransform,
  IROffsetTranslateTransform,
  IRPolarTranslateTransform,
  IRTranslateTransform,
  PolarPosition,
} from '../../schemas';
import type { PositionResolution, PositionResolveContext } from './types';

import { resolvePosition } from './resolve';

/** Position resolver 支持的 translate transform Source IR */
export type IRTranslationTransform =
  | IRTranslateTransform
  | IRPolarTranslateTransform
  | IRAtTranslateTransform
  | IROffsetTranslateTransform
  | IRBetweenTranslateTransform;

/** 将 Scope translate 变体确定为当前 Scope 的局部与世界坐标 */
export const resolveTransformTranslation = (
  source: IRTranslationTransform,
  context: PositionResolveContext,
): PositionResolution | null => {
  switch (source.kind) {
    case 'translate': {
      const localPoint: [number, number] = [source.x, source.y];
      return { localPoint, worldPoint: context.toWorld(localPoint) };
    }
    case 'polar-translate': {
      const position: PolarPosition = { angle: source.angle, radius: source.radius };
      if (source.origin !== undefined) position.origin = source.origin;
      return resolvePosition(position, context);
    }
    case 'at-translate':
      return resolvePosition(
        {
          direction: source.direction,
          of: source.of,
          ...(source.distance === undefined ? {} : { distance: source.distance }),
        },
        context,
      );
    case 'offset-translate':
      return resolvePosition({ of: source.of, offset: source.offset ?? [0, 0] }, context);
    case 'between-translate': {
      const position: IRBetweenPosition = { between: source.between, fraction: source.fraction };
      return resolvePosition(position, context);
    }
  }
};

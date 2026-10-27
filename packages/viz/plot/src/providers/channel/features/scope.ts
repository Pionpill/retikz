import type { AnyChannelDefinition, ScopeChannelDefinition } from '../../../contract';
import { defineScopeChannel, markProperty } from '../../../contract';
import { OPACITY_MIN, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from './node';

const numericScopeChannel = (
  channel: 'strokeWidth' | 'opacity' | 'fillOpacity' | 'strokeOpacity',
  output: ScopeChannelDefinition<number>['output'],
  deliver: ScopeChannelDefinition<number>['deliver'],
  legend?: ScopeChannelDefinition<number>['legend'],
): ScopeChannelDefinition<number> =>
  defineScopeChannel<number>({
    channel,
    output,
    ...(legend !== undefined ? { legend } : {}),
    resolve: (_ctx, mark) => {
      const value = markProperty<number>(mark, channel);
      return value === undefined ? undefined : { value };
    },
    deliver,
  });

/** 允许直接交付到 core Scope 的内置通道名集合 */
const BUILTIN_SCOPE_CHANNELS = {
  strokeWidth: numericScopeChannel(
    'strokeWidth',
    { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    (scope, value) => {
      scope.defaults = { ...scope.defaults, style: { ...scope.defaults?.style, strokeWidth: value } };
    },
  ),
  opacity: numericScopeChannel(
    'opacity',
    { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    (scope, value) => {
      scope.defaults = {
        ...scope.defaults,
        style: {
          ...scope.defaults?.style,
          opacity: {
            ...(typeof scope.defaults?.style?.opacity === 'number'
              ? { overall: scope.defaults.style.opacity }
              : scope.defaults?.style?.opacity),
            overall: value,
          },
        },
      };
    },
    'ramp',
  ),
  fillOpacity: numericScopeChannel(
    'fillOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    (scope, value) => {
      scope.defaults = {
        ...scope.defaults,
        style: {
          ...scope.defaults?.style,
          opacity: {
            ...(typeof scope.defaults?.style?.opacity === 'number'
              ? { overall: scope.defaults.style.opacity }
              : scope.defaults?.style?.opacity),
            fill: value,
          },
        },
      };
    },
  ),
  strokeOpacity: numericScopeChannel(
    'strokeOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    (scope, value) => {
      scope.defaults = {
        ...scope.defaults,
        style: {
          ...scope.defaults?.style,
          opacity: {
            ...(typeof scope.defaults?.style?.opacity === 'number'
              ? { overall: scope.defaults.style.opacity }
              : scope.defaults?.style?.opacity),
            stroke: value,
          },
        },
      };
    },
  ),
};

const eraseScopeChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Scope 通道 definition 集合 */
export const SCOPE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_SCOPE_CHANNELS).map(def =>
  eraseScopeChannelDefinition(def),
);

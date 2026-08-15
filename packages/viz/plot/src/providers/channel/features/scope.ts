import type { AnyChannelDefinition, ScopeChannelDefinition } from '../../../contract';
import type { IRPlotMarkOperation, IRPlotPointNumberStyle } from '../../../schemas';

import { defineScopeChannel } from '../../../contract';
import { MarkValueKind } from '../../../schemas';
import { OPACITY_MIN, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from './node';

type MarkStyleValue<T> =
  | Extract<IRPlotPointNumberStyle, { kind: typeof MarkValueKind.Field }>
  | (Omit<Extract<IRPlotPointNumberStyle, { kind: typeof MarkValueKind.Constant }>, 'value'> & { value: T });

const isMarkStyleValue = <T>(value: unknown): value is MarkStyleValue<T> =>
  value !== null &&
  typeof value === 'object' &&
  ((value as { kind?: unknown }).kind === MarkValueKind.Field ||
    (value as { kind?: unknown }).kind === MarkValueKind.Constant) &&
  'value' in value;

const pickConstantStyleChannel = <T>(mark: IRPlotMarkOperation, channel: string): T | undefined => {
  const value = (mark as Record<string, unknown>)[channel];
  if (!isMarkStyleValue<T>(value) || value.kind !== MarkValueKind.Constant) return undefined;
  return value.value;
};

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
    resolve: () => mark => {
      const value = pickConstantStyleChannel<number>(mark, channel);
      return value === undefined ? undefined : { value };
    },
    deliver,
  });

/** 允许直接交付到 core Scope 的内置通道名集合 */
export const BUILTIN_SCOPE_CHANNELS = {
  strokeWidth: numericScopeChannel(
    'strokeWidth',
    { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    (scope, value) => {
      scope.strokeWidth = value;
    },
  ),
  opacity: numericScopeChannel(
    'opacity',
    { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    (scope, value) => {
      scope.opacity = value;
    },
    'ramp',
  ),
  fillOpacity: numericScopeChannel(
    'fillOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    (scope, value) => {
      scope.fillOpacity = value;
    },
  ),
  strokeOpacity: numericScopeChannel(
    'strokeOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    (scope, value) => {
      scope.strokeOpacity = value;
    },
  ),
};

const eraseScopeChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Scope 通道 definition 集合 */
export const SCOPE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_SCOPE_CHANNELS).map(def =>
  eraseScopeChannelDefinition(def),
);

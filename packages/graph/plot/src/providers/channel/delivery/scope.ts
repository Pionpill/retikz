import { type AnyChannelDefinition, type ScopeChannelDefinition, defineScopeChannel } from '../../../contract';
import { type MarkOperation, type ScaledMarkValueType } from '../../../schemas';
import { OPACITY_MIN, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from './node';

const isScaledMarkValue = <T>(value: unknown): value is ScaledMarkValueType<T> =>
  value !== null &&
  typeof value === 'object' &&
  ((value as { kind?: unknown }).kind === 'field' || (value as { kind?: unknown }).kind === 'constant') &&
  'value' in value;

const pickConstantStyleChannel = <T>(mark: MarkOperation, channel: string): T | undefined => {
  const value = (mark as Record<string, unknown>)[channel];
  if (!isScaledMarkValue<T>(value) || value.kind !== 'constant') return undefined;
  return value.value;
};

const numericScopeChannel = (
  channel: 'strokeWidth' | 'opacity' | 'fillOpacity' | 'drawOpacity' | 'zIndex',
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
  drawOpacity: numericScopeChannel(
    'drawOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    (scope, value) => {
      scope.drawOpacity = value;
    },
  ),
  zIndex: numericScopeChannel(
    'zIndex',
    { outputKind: 'number', range: [0, 0] },
    (scope, value) => {
      scope.zIndex = Math.trunc(value);
    },
  ),
};

const eraseScopeChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

export const SCOPE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_SCOPE_CHANNELS).map(def => eraseScopeChannelDefinition(def));

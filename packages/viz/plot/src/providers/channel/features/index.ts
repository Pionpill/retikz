import { type AnyChannelDefinition } from '../../../contract';
import { NODE_CHANNELS } from './node';
import { PATH_CHANNELS } from './path';
import { SCOPE_CHANNELS } from './scope';

export {
  BUILTIN_NODE_CHANNELS,
  NODE_CHANNELS,
  OPACITY_MIN,
  PLOT_SHAPE_PALETTE,
  SIZE_MAX_RADIUS,
  SIZE_MIN_RADIUS,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
} from './node';
export * from './paint';
export { BUILTIN_PATH_CHANNELS, PATH_CHANNELS } from './path';
export * from './position';
export { BUILTIN_SCOPE_CHANNELS, SCOPE_CHANNELS } from './scope';
export * from './text';

export const DELIVERY_CHANNELS: ReadonlyArray<AnyChannelDefinition> = [
  ...NODE_CHANNELS,
  ...PATH_CHANNELS,
  ...SCOPE_CHANNELS,
];

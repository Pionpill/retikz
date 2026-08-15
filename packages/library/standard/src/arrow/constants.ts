import type { ValueOf } from '@retikz/foundation';

/** Standard 提供的可选箭头 provider 名称 */
export const StandardArrowName = {
  Diamond: 'diamond',
  OpenDiamond: 'openDiamond',
} as const;

/** Standard 箭头 provider 名称取值 */
export type StandardArrowNameValue = ValueOf<typeof StandardArrowName>;

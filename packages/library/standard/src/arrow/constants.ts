import type { ValueOf } from '@retikz/foundation';

/** Standard 提供的可选箭头 provider 名称 */
export const StandardArrowName = {
  /** 实心菱形箭头 */
  Diamond: 'diamond',
  /** 空心菱形箭头 */
  OpenDiamond: 'openDiamond',
  /** 垂直阻断线端点 */
  Bar: 'bar',
  /** 三叉端点 */
  CrowFoot: 'crowFoot',
  /** 开放直线倒钩箭头 */
  StraightBarb: 'straightBarb',
  /** 实心风筝形箭头 */
  Kite: 'kite',
  /** 空心风筝形箭头 */
  OpenKite: 'openKite',
  /** 实心方形箭头 */
  Square: 'square',
  /** 空心方形箭头 */
  OpenSquare: 'openSquare',
} as const;

/** Standard 箭头 provider 名称取值 */
export type StandardArrowNameValue = ValueOf<typeof StandardArrowName>;

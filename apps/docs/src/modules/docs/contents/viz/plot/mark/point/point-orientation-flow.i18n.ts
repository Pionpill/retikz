import type { Lang } from '@/i18n';

/** 坐标方向查询与节点旋转的流程文案 */
export const pointOrientationFlowI18n: Record<
  Lang,
  Record<'input' | 'channels' | 'position' | 'node' | 'scene' | 'render', string>
> = {
  zh: {
    input: '坐标系提供方向查询\ntangentAt',
    channels: 'PointMark 查询\n传入当前位置与坐标方向',
    position: '坐标系返回切向\n这个位置朝哪边走',
    node: 'PointMark 选择方向\n切向，或转 90° 得到法向',
    scene: '合成旋转角\n方向角 + rotate',
    render: 'Node 应用位置与角度\n旋转形状、文字及连接边界',
  },
  en: {
    input: 'Coordinate offers direction queries\ntangentAt',
    channels: 'PointMark queries\nCurrent position and coordinate role',
    position: 'Coordinate returns a tangent\nWhich way to move from this point',
    node: 'PointMark selects direction\nTangent, or turn 90° for the normal',
    scene: 'Compose rotation\nDirection angle + rotate',
    render: 'Node applies position and angle\nRotate shape, text, and boundary',
  },
};

export enum Quadrant {
  I = 'first', // 第一象限
  II = 'second', // 第二象限
  III = 'third', // 第三象限
  IV = 'forth', // 第四象限
}

export enum Axis {
  X_POS = 'positive-x', // 正x轴
  Y_POS = 'positive-y', // 正y轴
  X_NEG = 'negative-x', // 负x轴
  Y_NEG = 'negative-y', // 负y轴
  CENTER = 'center', // 中心
}

export enum Direction {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}

export enum RectEndPoint {
  LEFT_TOP = 'left-top',
  LEFT_BOTTOM = 'left-bottom',
  RIGHT_TOP = 'right-top',
  RIGHT_BOTTOM = 'right-bottom',
}

export type RectCoordinateLocation = Quadrant | Axis;
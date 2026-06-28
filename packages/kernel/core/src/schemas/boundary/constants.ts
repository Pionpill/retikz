/** 连接面保留关键字：非「借用已注册 shape」的两个内置语义（编译期消解） */
export const Boundary = {
  /** 连接面 = 节点自身视觉形状（默认） */
  Self: 'shape',
  /** 真圆：半径 = 节点 AABB 较长半轴 max(halfWidth, halfHeight) */
  Circle: 'circle',
} as const;

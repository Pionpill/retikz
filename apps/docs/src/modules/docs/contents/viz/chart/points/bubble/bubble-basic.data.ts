/** Bubble Showcase 使用的车辆性能样本 */
export type VehicleBubbleDatum = {
  model: string;
  weight: number;
  efficiency: number;
  power: number | null;
  price: number;
  group: 'Compact' | 'Sedan' | 'SUV';
};

/** 用两个定量字段演示气泡面积编码的数据集 */
export const vehicleBubbleData: Array<VehicleBubbleDatum> = [
  { model: 'Aster', weight: 1080, efficiency: 20.8, power: 92, price: 14.8, group: 'Compact' },
  { model: 'Birch', weight: 1210, efficiency: 18.9, power: 108, price: 17.2, group: 'Compact' },
  { model: 'Cedar', weight: 1370, efficiency: 17.6, power: 126, price: 21.4, group: 'Sedan' },
  { model: 'Dune', weight: 1490, efficiency: 16.2, power: null, price: 24.9, group: 'Sedan' },
  { model: 'Elm', weight: 1580, efficiency: 15.4, power: 162, price: 28.6, group: 'Sedan' },
  { model: 'Flint', weight: 1740, efficiency: 13.8, power: 188, price: 33.1, group: 'SUV' },
  { model: 'Grove', weight: 1890, efficiency: 12.9, power: 214, price: 38.7, group: 'SUV' },
  { model: 'Harbor', weight: 2050, efficiency: 11.7, power: 242, price: 44.5, group: 'SUV' },
];

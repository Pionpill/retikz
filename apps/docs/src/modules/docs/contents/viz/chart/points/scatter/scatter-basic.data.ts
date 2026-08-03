/** Scatter Showcase 使用的车辆性能样本 */
export type VehicleScatterDatum = {
  model: string;
  weight: number;
  efficiency: number;
  power: number;
  group: 'Compact' | 'Sedan' | 'SUV';
};

/** 同时支持基础散点与气泡编码的稳定数据集 */
export const vehicleScatterData: Array<VehicleScatterDatum> = [
  { model: 'Aster', weight: 1080, efficiency: 20.8, power: 92, group: 'Compact' },
  { model: 'Birch', weight: 1210, efficiency: 18.9, power: 108, group: 'Compact' },
  { model: 'Cedar', weight: 1370, efficiency: 17.6, power: 126, group: 'Sedan' },
  { model: 'Dune', weight: 1490, efficiency: 16.2, power: 148, group: 'Sedan' },
  { model: 'Elm', weight: 1580, efficiency: 15.4, power: 162, group: 'Sedan' },
  { model: 'Flint', weight: 1740, efficiency: 13.8, power: 188, group: 'SUV' },
  { model: 'Grove', weight: 1890, efficiency: 12.9, power: 214, group: 'SUV' },
  { model: 'Harbor', weight: 2050, efficiency: 11.7, power: 242, group: 'SUV' },
];

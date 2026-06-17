/**
 * demo 自造数据集：喇叭带（源端宽 ≠ 目标端宽），喂 ribbon-flared.demo.tsx 的 <Plot data>（不进 IR）。
 * 每行给独立的 value（源端宽）与 endValue（目标端宽），<LinkMark endWidth> 让带子两端宽度不同。
 */
export const streams: Array<Record<string, string | number>> = [
  { sourceX: 0, sourceY: 70, targetX: 160, targetY: 72, value: 40, endValue: 12, stage: 'Visit → Cart' },
  { sourceX: 0, sourceY: 30, targetX: 160, targetY: 28, value: 24, endValue: 40, stage: 'Cart → Pay' },
];

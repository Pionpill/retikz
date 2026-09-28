/** 同类别、同数值的重复观测用于展示 placement */
export const stripPlacementFigureData = Array.from({ length: 18 }, (_, index) => ({
  group: index < 9 ? 'A' : 'B',
  value: (index % 3) + 1,
}));

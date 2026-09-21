/** 将项目均匀分配到不超过最大列数的行中 */
export const getLinkedSectionRowSizes = (itemCount: number, maxColumns: number): Array<number> => {
  if (itemCount === 0) return [];

  const rowCount = Math.ceil(itemCount / maxColumns);
  const baseRowSize = Math.floor(itemCount / rowCount);
  const largerRowCount = itemCount % rowCount;

  return Array.from({ length: rowCount }, (_, index) => baseRowSize + (index < largerRowCount ? 1 : 0));
};

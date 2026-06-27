/** Paired interval rows; RelationMark derives one before-to-after relation per pair. */
export const intervalRelations: Array<Record<string, string | number>> = [
  { pair: 'p1', order: 1, decreaseOrder: 1, slot: 'p1-before', phase: 'before', value: 137, routeY: 168, labelY: 122, label: '137' },
  { pair: 'p1', order: 2, decreaseOrder: 2, slot: 'p1-after', phase: 'after', value: 128, routeY: 168, labelY: 113, label: '128' },
  { pair: 'p2', order: 1, decreaseOrder: 1, slot: 'p2-before', phase: 'before', value: 292, routeY: 352, labelY: 274, label: '292' },
  { pair: 'p2', order: 2, decreaseOrder: 2, slot: 'p2-after', phase: 'after', value: 109, routeY: 352, labelY: 94, label: '109' },
  { pair: 'p3', order: 1, decreaseOrder: 1, slot: 'p3-before', phase: 'before', value: 286, routeY: 348, labelY: 268, label: '286' },
  { pair: 'p3', order: 2, decreaseOrder: 2, slot: 'p3-after', phase: 'after', value: 104, routeY: 348, labelY: 89, label: '104' },
  { pair: 'p4', order: 1, increaseOrder: 1, slot: 'p4-before', phase: 'before', value: 116, routeY: 232, labelY: 101, label: '116' },
  { pair: 'p4', order: 2, increaseOrder: 2, slot: 'p4-after', phase: 'after', value: 173, routeY: 232, labelY: 157, label: '173' },
  { pair: 'p5', order: 1, decreaseOrder: 1, slot: 'p5-before', phase: 'before', value: 299, routeY: 360, labelY: 281, label: '299' },
  { pair: 'p5', order: 2, decreaseOrder: 2, slot: 'p5-after', phase: 'after', value: 134, routeY: 360, labelY: 119, label: '134' },
];

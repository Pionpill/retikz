/** 三列节点及流量；每个单位对应两个绘图单位 */
const nodes = [
  { id: 'A', x: 30, top: 20, value: 50, color: '#4e79a7' },
  { id: 'B', x: 30, top: 160, value: 40, color: '#f28e2b' },
  { id: 'C', x: 300, top: 20, value: 30, color: '#59a14f' },
  { id: 'D', x: 300, top: 110, value: 35, color: '#76b7b2' },
  { id: 'E', x: 300, top: 210, value: 25, color: '#b07aa1' },
  { id: 'F', x: 570, top: 30, value: 45, color: '#edc949' },
  { id: 'G', x: 570, top: 160, value: 45, color: '#e15759' },
];
const links = [
  { source: 'A', target: 'C', value: 30 },
  { source: 'A', target: 'D', value: 20 },
  { source: 'B', target: 'D', value: 15 },
  { source: 'B', target: 'E', value: 25 },
  { source: 'C', target: 'F', value: 30 },
  { source: 'D', target: 'F', value: 15 },
  { source: 'D', target: 'G', value: 20 },
  { source: 'E', target: 'G', value: 25 },
];

/** 将流带与两端节点展开到同一张表，各图元按自己的身份字段去重 */
export const createRibbonRows = (curvature: number, widthFactor: number) => {
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  return links
    .flatMap((link, flowId) => {
      const source = nodes.find(node => node.id === link.source)!;
      const target = nodes.find(node => node.id === link.target)!;
      const sourceOffset = sourceOffsets.get(source.id) ?? 0;
      const targetOffset = targetOffsets.get(target.id) ?? 0;
      sourceOffsets.set(source.id, sourceOffset + link.value * 2);
      targetOffsets.set(target.id, targetOffset + link.value * 2);
      const sourceX = source.x + 12;
      const targetX = target.x;
      const distance = (targetX - sourceX) * curvature;
      const flow = {
        flowId,
        sourceX,
        targetX,
        sourceY: 300 - source.top - sourceOffset - link.value,
        targetY: 300 - target.top - targetOffset - link.value,
        control1X: sourceX + distance,
        control2X: targetX - distance,
        width: link.value * 2 * widthFactor,
        flowColor: source.color,
        label: String(link.value),
      };
      return [source, target].map(node => ({
        ...flow,
        nodeId: node.id,
        x0: node.x,
        x1: node.x + 12,
        y0: 300 - node.top - node.value * 2,
        y1: 300 - node.top,
        nodeColor: node.color,
      }));
    })
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
};

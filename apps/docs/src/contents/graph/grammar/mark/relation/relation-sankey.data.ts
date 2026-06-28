type SankeyDatum = Record<string, string | number | undefined>;

type NodeSpec = {
  id: string;
  column: 'left' | 'middle' | 'right';
  label: string;
  value: number;
  fill: string;
};

type FlowSpec = {
  source: string;
  target: string;
  value: number;
};

type PositionedNode = NodeSpec & {
  x: number;
  y: number;
  top: number;
  sourceCursor: number;
  targetCursor: number;
};

const PLOT_WIDTH = 620;
const PLOT_HEIGHT = 320;
const X_DOMAIN_MAX = 3;
const Y_DOMAIN_MAX = 100;
const NODE_WIDTH = 8;

const xOf = (screenX: number): number => (screenX / PLOT_WIDTH) * X_DOMAIN_MAX;

const yOf = (screenY: number): number => ((PLOT_HEIGHT - screenY) / PLOT_HEIGHT) * Y_DOMAIN_MAX;

const nodeRows = (nodes: Array<PositionedNode>): Array<SankeyDatum> =>
  nodes.map(node => ({
    id: node.id,
    nodeX: xOf(node.x),
    nodeY: yOf(node.y),
    nodeHeight: node.value,
    nodeFill: node.fill,
    nodeLabel: node.label,
  }));

const domainSentinels = (): Array<SankeyDatum> => [
  {
    sourceX: xOf(0),
    sourceY: yOf(PLOT_HEIGHT),
    targetX: xOf(PLOT_WIDTH),
    targetY: yOf(0),
    width: 0,
    flowFill: 'transparent',
  },
];

const stackColumn = (
  specs: Array<NodeSpec>,
  x: number,
  top: number,
  gap: number,
): Array<PositionedNode> => {
  let cursor = top;
  return specs.map(spec => {
    const node: PositionedNode = {
      ...spec,
      x,
      y: cursor + spec.value / 2,
      top: cursor,
      sourceCursor: cursor,
      targetCursor: cursor,
    };
    cursor += spec.value + gap;
    return node;
  });
};

const sideX = (node: PositionedNode, side: 'source' | 'target'): number =>
  node.x + (side === 'source' ? NODE_WIDTH / 2 : -NODE_WIDTH / 2);

const nextSlotY = (node: PositionedNode, side: 'source' | 'target', width: number): number => {
  const key = side === 'source' ? 'sourceCursor' : 'targetCursor';
  const y = node[key] + width / 2;
  node[key] += width;
  return y;
};

const buildFlowRows = (
  flows: Array<FlowSpec>,
  nodesById: Map<string, PositionedNode>,
): Array<SankeyDatum> =>
  flows.map(flow => {
    const source = nodesById.get(flow.source);
    const target = nodesById.get(flow.target);
    if (source === undefined || target === undefined) {
      throw new Error(`Unknown sankey flow endpoint: ${flow.source} -> ${flow.target}`);
    }
    return {
      sourceX: xOf(sideX(source, 'source')),
      sourceY: yOf(nextSlotY(source, 'source', flow.value)),
      targetX: xOf(sideX(target, 'target')),
      targetY: yOf(nextSlotY(target, 'target', flow.value)),
      width: flow.value,
      flowFill: source.fill,
    };
  });

const leftNodes: Array<NodeSpec> = [
  { id: 'a1', column: 'left', label: 'a1', value: 28, fill: '#3b82f6' },
  { id: 'a2', column: 'left', label: 'a2', value: 16, fill: '#f59e0b' },
  { id: 'a3', column: 'left', label: 'a3', value: 26, fill: '#ef4444' },
  { id: 'b1', column: 'left', label: 'b1', value: 8, fill: '#0e7490' },
  { id: 'b2', column: 'left', label: 'b2', value: 18, fill: '#cbd5e1' },
  { id: 'b3', column: 'left', label: 'b3', value: 26, fill: '#1e3a8a' },
  { id: 'c1', column: 'left', label: 'c1', value: 20, fill: '#fde68a' },
  { id: 'c2', column: 'left', label: 'c2', value: 16, fill: '#0ea5e9' },
  { id: 'c3', column: 'left', label: 'c3', value: 16, fill: '#d97745' },
];

const middleNodes: Array<NodeSpec> = [
  { id: 'A', column: 'middle', label: 'A', value: 52, fill: '#0f62c8' },
  { id: 'B', column: 'middle', label: 'B', value: 62, fill: '#f7c873' },
  { id: 'C', column: 'middle', label: 'C', value: 60, fill: '#475569' },
];

const rightNodes: Array<NodeSpec> = [
  { id: 'AA', column: 'right', label: 'AA', value: 84, fill: '#f4a999' },
  { id: 'BB', column: 'right', label: 'BB', value: 90, fill: '#ea8a00' },
];

const flows: Array<FlowSpec> = [
  { source: 'a1', target: 'A', value: 18 },
  { source: 'a1', target: 'B', value: 10 },
  { source: 'a2', target: 'A', value: 16 },
  { source: 'a3', target: 'A', value: 18 },
  { source: 'a3', target: 'C', value: 8 },
  { source: 'b1', target: 'B', value: 8 },
  { source: 'b2', target: 'B', value: 18 },
  { source: 'b3', target: 'B', value: 26 },
  { source: 'c1', target: 'C', value: 20 },
  { source: 'c2', target: 'C', value: 16 },
  { source: 'c3', target: 'C', value: 16 },
  { source: 'A', target: 'AA', value: 34 },
  { source: 'A', target: 'BB', value: 18 },
  { source: 'B', target: 'AA', value: 30 },
  { source: 'B', target: 'BB', value: 32 },
  { source: 'C', target: 'AA', value: 20 },
  { source: 'C', target: 'BB', value: 40 },
];

const positionedNodes = [
  ...stackColumn(leftNodes, 54, 40, 8),
  ...stackColumn(middleNodes, 310, 55, 18),
  ...stackColumn(rightNodes, 566, 59, 28),
];

const nodesById = new Map(positionedNodes.map(node => [node.id, node]));

export const sankeyNodeColors: Array<string> = positionedNodes.map(node => node.fill);

export const sankeyRelations: Array<SankeyDatum> = [
  ...domainSentinels(),
  ...nodeRows(positionedNodes),
  ...buildFlowRows(flows, nodesById),
];

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../../errors';

export type LayeredRankElement = Readonly<{
  id: string;
  rank?: number;
}>;

export type LayeredRankEdge = Readonly<{
  source: string;
  target: string;
}>;

const getStronglyConnectedComponents = (
  elements: ReadonlyArray<LayeredRankElement>,
  edges: ReadonlyArray<LayeredRankEdge>,
): ReadonlyMap<string, number> => {
  const adjacency = new Map<string, Array<string>>();
  for (const element of elements) adjacency.set(element.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: Array<string> = [];
  const onStack = new Set<string>();
  const components = new Map<string, number>();
  let componentIndex = 0;

  const visit = (id: string): void => {
    indices.set(id, nextIndex);
    lowLinks.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    for (const target of adjacency.get(id) ?? []) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(id, Math.min(lowLinks.get(id) ?? 0, lowLinks.get(target) ?? 0));
      } else if (onStack.has(target)) {
        lowLinks.set(id, Math.min(lowLinks.get(id) ?? 0, indices.get(target) ?? 0));
      }
    }

    if (lowLinks.get(id) !== indices.get(id)) return;
    while (stack.length > 0) {
      const member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      components.set(member, componentIndex);
      if (member === id) break;
    }
    componentIndex += 1;
  };

  for (const element of elements) {
    if (!indices.has(element.id)) visit(element.id);
  }
  return components;
};

/** 用稳定 SCC condensation 与硬 rank 约束解析一个 scope 的最小 rank */
export const resolveLayeredRanks = (
  elements: ReadonlyArray<LayeredRankElement>,
  edges: ReadonlyArray<LayeredRankEdge>,
): ReadonlyMap<string, number> => {
  const components = getStronglyConnectedComponents(elements, edges);
  const normalEdges = edges.filter(edge => components.get(edge.source) !== components.get(edge.target));
  const explicit = new Map(
    elements.flatMap(element => (element.rank === undefined ? [] : [[element.id, element.rank]])),
  );
  const ranks = new Map(elements.map(element => [element.id, element.rank ?? 0]));

  let remainingIterations = elements.length;
  while (remainingIterations > 0) {
    remainingIterations -= 1;
    let changed = false;
    for (const edge of normalEdges) {
      const required = (ranks.get(edge.source) ?? 0) + 1;
      const targetRank = ranks.get(edge.target) ?? 0;
      if (explicit.has(edge.target) && required > targetRank) {
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.FlowConstraintUnsatisfiable,
          message: `Flow rank constraint '${edge.source}' -> '${edge.target}' is unsatisfiable.`,
          details: { relatedIds: [edge.source, edge.target] },
        });
      }
      if (!explicit.has(edge.target) && required > targetRank) {
        ranks.set(edge.target, required);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return ranks;
};

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import type { BranchLayoutDefinition, BranchLayoutInput, BranchLayoutOutput } from '../contract';

/** 隔离外部 callback 并验证节点、拓扑、主线和有限几何 */
export const executeBranchLayout = (
  definition: BranchLayoutDefinition,
  input: BranchLayoutInput,
): BranchLayoutOutput => {
  let output: BranchLayoutOutput;

  try {
    output = structuredClone(definition.layout(structuredClone(input)));
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
      message: `Branch layout '${definition.name}' failed.`,
      details: { stage: 'layout', definition: definition.name },
      cause,
    });
  }

  const fail = (reason: string, outputPath: Array<string | number>): never => {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.BranchLayoutOutputInvalid,
      message: reason,
      details: { stage: 'layout', definition: definition.name, outputPath },
    });
  };

  const nodes = new Map(output.nodes.map(node => [node.id, node]));
  if (
    nodes.size !== input.nodes.length ||
    output.nodes.length !== nodes.size ||
    input.nodes.some(node => !nodes.has(node.id))
  )
    fail('Branch layout must return each node exactly once.', ['nodes']);

  const vertical = input.layout.direction === 'down' || input.layout.direction === 'up';
  const sign = input.layout.direction === 'left' || input.layout.direction === 'up' ? -1 : 1;
  output.nodes.forEach((node, index) => {
    if (!node.position.every(Number.isFinite) || !Number.isInteger(node.lane) || node.lane < 0)
      fail('Branch node geometry must be finite.', ['nodes', index]);
  });
  const expected = new Set<string>();

  for (const branch of input.branches) {
    const first = nodes.get(branch.nodes[0])!;

    for (const [index, id] of branch.nodes.entries()) {
      const node = nodes.get(id)!;
      if (
        branch.id === input.mainBranch &&
        (node.lane !== first.lane || node.position[vertical ? 0 : 1] !== first.position[vertical ? 0 : 1])
      )
        fail('Main branch must remain on one lane.', ['nodes']);

      if (index > 0) {
        const previous = nodes.get(branch.nodes[index - 1])!;
        if ((node.position[vertical ? 1 : 0] - previous.position[vertical ? 1 : 0]) * sign <= 0)
          fail('Branch progression must be strict.', ['nodes']);
        expected.add(JSON.stringify([previous.id, node.id]));
      }
    }
  }

  const seen = new Set<string>();
  output.segments.forEach((segment, index) => {
    const key = JSON.stringify([segment.source, segment.target]);
    if (!expected.has(key) || seen.has(key)) fail('Unexpected or duplicate Branch segment.', ['segments', index]);
    seen.add(key);
    if (
      segment.points.length < 2 ||
      segment.points.some(point => !point.every(Number.isFinite)) ||
      !Number.isFinite(segment.cornerRadius) ||
      segment.cornerRadius < 0
    )
      fail('Branch route geometry must be finite.', ['segments', index]);

    const source = nodes.get(segment.source)!.position;
    const target = nodes.get(segment.target)!.position;
    if (
      segment.points[0].some((value, axis) => value !== source[axis]) ||
      segment.points.at(-1)!.some((value, axis) => value !== target[axis])
    )
      fail('Reference route endpoints must match node positions.', ['segments', index, 'points']);
  });
  if (seen.size !== expected.size) fail('Branch layout omitted a segment.', ['segments']);

  for (let index = 0; index < input.nodes.length; index += 1)
    for (let other = index + 1; other < input.nodes.length; other += 1) {
      const a = input.nodes[index];
      const b = input.nodes[other];
      const ap = nodes.get(a.id)!;
      const bp = nodes.get(b.id)!;
      const gapX = Math.max(
        bp.position[0] + b.visualBounds.x - ap.position[0] - a.visualBounds.x - a.visualBounds.width,
        ap.position[0] + a.visualBounds.x - bp.position[0] - b.visualBounds.x - b.visualBounds.width,
      );
      const gapY = Math.max(
        bp.position[1] + b.visualBounds.y - ap.position[1] - a.visualBounds.y - a.visualBounds.height,
        ap.position[1] + a.visualBounds.y - bp.position[1] - b.visualBounds.y - b.visualBounds.height,
      );
      const gap = ap.lane === bp.lane ? (vertical ? gapY : gapX) : vertical ? gapX : gapY;
      if (gap + 1e-8 < (ap.lane === bp.lane ? input.layout.nodeGap : input.layout.laneGap))
        fail('Branch node occupancy violates net gaps.', ['nodes']);
    }

  return output;
};

import type { IRChild, IRScope, LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';
import type { IRGraphRelation } from '@retikz/graph';
import { resolveGraphDefinitionOptions, resolveRelation, resolveRelationAppearance } from '@retikz/graph';
import { createOverlayLayout } from '@retikz/layout';
import { intrinsicLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';
import type { BoundsRect, Position } from '@retikz/math';

import { composeDiagramFoundation, resolveDiagramDefinitionOptions, resolveDiagramFoundation } from '../../_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import type { BranchDiagramDefinitionOptions, BranchLayoutDefinition } from '../contract';
import { resolveBranchDiagram } from '../resolve';
import type { BranchDiagramArtifact, IRBranchDiagram } from '../schemas';
import { executeBranchLayout } from './layout';

const translateBounds = (bounds: Readonly<BoundsRect>, position: Readonly<Position>): BoundsRect => ({
  ...bounds,
  x: bounds.x + position[0],
  y: bounds.y + position[1],
});

/** 从相同布局结果生成 Graph 路由、Foundation 和参考 artifact */
export const compileBranchDiagram = (
  source: IRBranchDiagram,
  context: LayoutCompositeCompileContext,
  definition: BranchLayoutDefinition,
  options: BranchDiagramDefinitionOptions,
): LayoutCompositeCompileResult<BranchDiagramArtifact> => {
  const diagram = resolveBranchDiagram(source);
  const measurements = diagram.nodes.map(node => {
    try {
      const probe = requiredLayoutProbe(context, { child: node, occurrence: 0 }, intrinsicLayoutProposal('natural'));
      return { id: node.id, markerBounds: probe.allocationBounds, visualBounds: probe.visualBounds };
    } catch (cause) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.BranchMeasurementFailed,
        message: `Cannot measure Branch node '${node.id}'.`,
        details: {
          stage: 'measure',
          path: ['nodes', source.nodes.findIndex(value => value.id === node.id)],
          relatedIds: [node.id],
        },
        cause,
      });
    }
  });
  const graphOptions = resolveGraphDefinitionOptions(options);
  const relations = new Map<string, { source: IRGraphRelation; appearance: string }>();

  for (const [branchIndex, branch] of source.branches.entries())
    for (let index = 1; index < branch.nodes.length; index += 1) {
      const relation: IRGraphRelation = {
        namespace: 'graph',
        type: 'relation',
        role: 'association',
        direction: 'none',
        source: { id: branch.nodes[index - 1] },
        target: { id: branch.nodes[index] },
        ...(branch.style === undefined ? {} : { style: branch.style }),
      };
      const effective = resolveRelationAppearance(resolveRelation(relation, graphOptions), {
        ...graphOptions,
        theme: context.theme,
      });
      const appearance = JSON.stringify(effective);
      const key = JSON.stringify([relation.source.id, relation.target.id]);
      const previous = relations.get(key);
      if (previous !== undefined && previous.appearance !== appearance)
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.BranchSharedStyleConflict,
          message: 'Shared Branch segment has conflicting effective appearances.',
          details: { path: ['branches', branchIndex, 'style'], relatedIds: [relation.source.id, relation.target.id] },
        });

      if (previous === undefined) relations.set(key, { source: relation, appearance });
    }

  const output = executeBranchLayout(definition, {
    layout: diagram.layout,
    nodes: measurements,
    branches: source.branches.map(({ id, nodes }) => ({ id, nodes })),
    mainBranch: source.mainBranch,
  });
  const positions = new Map(output.nodes.map(node => [node.id, node]));
  const children: Array<IRChild> = diagram.nodes.map(node => ({
    ...node,
    position: [...positions.get(node.id)!.position] as Position,
  }));

  for (const segment of output.segments) {
    const relation = relations.get(JSON.stringify([segment.source, segment.target]))!.source;
    children.push({
      ...relation,
      roundedCorners: segment.cornerRadius,
      route: [
        { type: 'step', kind: 'move', to: relation.source },
        ...segment.points
          .slice(1, -1)
          .map(point => ({ type: 'step' as const, kind: 'line' as const, to: [...point] as Position })),
        { type: 'step', kind: 'line', to: relation.target },
      ],
    });
  }

  const drawing: IRScope = { type: 'scope', children };

  try {
    const probe = requiredLayoutProbe(context, { child: drawing, occurrence: 0 }, intrinsicLayoutProposal('natural'));
    const bounds = probe.visualBounds;
    const wrapped = createOverlayLayout({
      size: { x: { kind: 'fixed', value: bounds.width }, y: { kind: 'fixed', value: bounds.height } },
      children: [
        {
          kind: 'overlay',
          child: drawing,
          placement: {
            kind: 'positioned',
            at: { x: probe.allocationBounds.x - bounds.x, y: probe.allocationBounds.y - bounds.y },
            anchor: { x: 0, y: 0 },
          },
        },
      ],
    });

    const foundation = composeDiagramFoundation(
      resolveDiagramFoundation(source, { ...resolveDiagramDefinitionOptions(options), theme: context.theme }),
      wrapped,
      context,
    );
    const offset: Position = [foundation.drawingOffset[0] - bounds.x, foundation.drawingOffset[1] - bounds.y];
    const translated = (position: Readonly<Position>): Position => [position[0] + offset[0], position[1] + offset[1]];
    const segmentIndexes = new Map(
      output.segments.map((segment, index) => [JSON.stringify([segment.source, segment.target]), index]),
    );

    const artifact: BranchDiagramArtifact = {
      layout: { definition: definition.name },
      frame: { allocationBounds: foundation.frame.allocationBounds, visualBounds: foundation.frame.visualBounds },
      regions: foundation.regions,
      nodes: measurements.map(node => ({
        id: node.id,
        position: translated(positions.get(node.id)!.position),
        lane: positions.get(node.id)!.lane,
        markerBounds: translateBounds(node.markerBounds, translated(positions.get(node.id)!.position)),
        visualBounds: translateBounds(node.visualBounds, translated(positions.get(node.id)!.position)),
      })),
      segments: output.segments.map(segment => ({ ...segment, points: segment.points.map(translated) })),
      branches: source.branches.map(branch => ({
        id: branch.id,
        segments: branch.nodes
          .slice(1)
          .map((target, index) => segmentIndexes.get(JSON.stringify([branch.nodes[index], target]))!),
      })),
    };

    const {
      namespace: _namespace,
      type: _type,
      nodes: _nodes,
      branches: _branches,
      mainBranch: _mainBranch,
      layout: _layout,
      presentation: _presentation,
      frame: _frame,
      diagramDefaults: _defaults,
      ...scope
    } = source;

    return {
      allocationBounds: foundation.frame.allocationBounds,
      children: [
        context.scope(
          scope,
          [context.replay(foundation.frame)],
          artifact.nodes.map(node => ({
            id: `node:${node.id}`,
            role: 'node',
            bounds: node.visualBounds,
            payload: { id: node.id },
          })),
        ),
      ],
      artifact,
    };
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.BranchMaterializationFailed,
      message: 'Branch drawing or Foundation could not be materialized.',
      details: { stage: 'materialize', path: [] },
      cause,
    });
  }
};

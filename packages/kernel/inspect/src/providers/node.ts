import type { IRChild, IRPosition, NodeOwnerOutput } from '@retikz/core';
import type { output as ZodOutput } from 'zod';

import { NodeOwnerOutputSchema } from '@retikz/core';

import type { InspectorContext, InspectorOutput } from '../contract';

import { defineInspector } from '../contract';
import { NodeInspectOptionsSchema } from '../schema';
import {
  cornersOfRect,
  isolateInspectionChildren,
  labelNode,
  markerNode,
  pathCommandsToChildren,
  pathStyle,
  rectCornersToPath,
  sceneBoundsOfRect,
} from './geometry';

type NodeInspectorOptions = ZodOutput<typeof NodeInspectOptionsSchema>;

/** 内置 Core Node Inspector key */
export const NODE_INSPECTOR_KEY = Object.freeze({ namespace: 'core', type: 'node' });

/** 从 PathCommand 列表取第一个可标记位置 */
const firstPathPosition = (commands: NodeOwnerOutput['shape']['outline']): IRPosition | undefined => {
  const command = commands?.find(candidate => candidate.kind === 'move');
  return command?.kind === 'move' ? command.to : undefined;
};

/** 创建 Node 几何检查输出，并保持每个 facet 的样式独立 */
const inspectNodeGeometry = (
  subject: NodeOwnerOutput,
  context: InspectorContext<NodeInspectorOptions>,
): InspectorOutput => {
  const color = context.appearance.scopeColor;
  const output: Array<IRChild> = [];
  const labels: Array<IRChild> = [];

  if (context.options.outline) {
    if (subject.shape.outline === null) {
      context.warn('UnsupportedGeometry', `Shape '${subject.shape.name}' does not provide an outline.`);
    } else {
      const outline = pathCommandsToChildren(subject.shape.outline, pathStyle(color, { dashPattern: [6, 3] }));
      output.push(...outline);
      if (context.options.labels) {
        const position = firstPathPosition(subject.shape.outline);
        if (position !== undefined) labels.push(labelNode([position[0] + 6, position[1] - 12], 'shape', color));
      }
    }
  }

  if (context.options.boundary) {
    if (subject.boundary.outline === null) {
      context.warn('UnsupportedGeometry', `Boundary '${subject.boundary.name}' does not provide an outline.`);
    } else {
      output.push(...pathCommandsToChildren(subject.boundary.outline, pathStyle(color, { dashPattern: [3, 2] })));
      if (context.options.labels) {
        const position = firstPathPosition(subject.boundary.outline);
        if (position !== undefined) labels.push(labelNode([position[0] + 6, position[1] + 12], 'boundary', color));
      }
    }
  }

  if (context.options.box) {
    const corners = cornersOfRect(subject.rect);
    output.push(rectCornersToPath(corners, pathStyle(color, { dashPattern: [8, 3] })));
    if (context.options.labels) {
      const [topLeft] = corners;
      labels.push(labelNode([topLeft[0] + 6, topLeft[1] - 12], 'box', color));
    }
  }

  if (subject.content !== null) {
    if (context.options.content) {
      output.push(rectCornersToPath(subject.content.corners, pathStyle(color, { dashPattern: [1, 2] })));
      if (context.options.labels) {
        const [topLeft] = subject.content.corners;
        labels.push(labelNode([topLeft[0] + 6, topLeft[1] - 12], 'content', color));
      }
    }
    if (context.options.baselines && subject.content.baselines.length > 0) {
      const baselineSteps = subject.content.baselines.flatMap(baseline => [
        { type: 'step' as const, kind: 'move' as const, to: baseline.from },
        { type: 'step' as const, kind: 'line' as const, to: baseline.to },
      ]);
      output.push({
        type: 'path',
        children: baselineSteps,
        style: pathStyle(color, { dashPattern: [2, 2], strokeOpacity: 0.8 }),
      });
      if (context.options.labels) {
        const baseline = subject.content.baselines[0];
        labels.push(labelNode([baseline.from[0] + 6, baseline.from[1] - 12], 'baseline', color));
      }
    }
  }

  if (context.options.keyPoints) {
    if (subject.shape.keyPoints === null) {
      context.warn('UnsupportedGeometry', `Shape '${subject.shape.name}' does not provide key points.`);
    } else {
      output.push(...subject.shape.keyPoints.map(point => markerNode(point.position, color, 5)));
      if (context.options.labels) {
        labels.push(
          ...subject.shape.keyPoints.map(point =>
            labelNode([point.position[0] + 6, point.position[1] + 12], point.name, color),
          ),
        );
      }
    }
  }

  if (context.options.labels) output.push(...labels);
  const localOutput = isolateInspectionChildren(output);
  if (!context.options.bounds) return localOutput;
  const {
    bounds: [minX, minY, maxX, maxY],
  } = sceneBoundsOfRect(subject.rect, context.transform);
  const sceneOutput: Array<IRChild> = [
    rectCornersToPath(
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      pathStyle(color, { dashPattern: [4, 2] }),
    ),
  ];
  if (context.options.labels) sceneOutput.push(labelNode([minX + 6, minY - 12], 'bounds', color));
  return [
    ...localOutput,
    ...isolateInspectionChildren(sceneOutput).map(child => ({
      type: 'fragment' as const,
      coordinateSpace: 'scene' as const,
      child,
    })),
  ];
};

/** 内置 Node 几何 Inspector */
export const NODE_INSPECTOR = defineInspector({
  ...NODE_INSPECTOR_KEY,
  owner: { kind: 'node' },
  subjectSchema: NodeOwnerOutputSchema,
  optionsSchema: NodeInspectOptionsSchema,
  mergeOptionsInput: (inherited, local) => {
    const merged = { ...inherited };
    if (local.outline !== undefined) merged.outline = local.outline;
    if (local.boundary !== undefined) merged.boundary = local.boundary;
    if (local.box !== undefined) merged.box = local.box;
    if (local.bounds !== undefined) merged.bounds = local.bounds;
    if (local.content !== undefined) merged.content = local.content;
    if (local.baselines !== undefined) merged.baselines = local.baselines;
    if (local.keyPoints !== undefined) merged.keyPoints = local.keyPoints;
    if (local.labels !== undefined) merged.labels = local.labels;
    return merged;
  },
  inspect: inspectNodeGeometry,
});

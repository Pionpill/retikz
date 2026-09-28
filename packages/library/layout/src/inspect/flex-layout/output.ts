import type { InspectorContext } from '@retikz/inspect';

import type { FlexLayoutArtifact } from '../../composites/flex-layout';
import type { CanonicalFlexLayoutInspectOptions } from '../resolve/flex-layout';
import type { LayoutInspectionChild, LayoutInspectionLineMark } from '../shared';
import {
  inspectLayoutArtifactBase,
  inspectLayoutSpacing,
  inspectLayoutStructureRect,
  lowerLayoutInspectionMarks,
  normalizeLayoutBoundaryGroups,
} from '../shared';

/** 把 Flex 布局产物转换为普通 Core 辅助子元素
 * @param artifact 同次编译已求解的布局产物
 * @param context 包含已解析检查选项与主题外观的检查上下文
 * @returns 只读辅助子图形列表，不重新求解或修改布局产物
 */
export const inspectFlexLayoutArtifact = (
  artifact: FlexLayoutArtifact,
  context: InspectorContext<CanonicalFlexLayoutInspectOptions>,
): ReadonlyArray<LayoutInspectionChild> => {
  const alignmentGuideDimension = artifact.lines[0]?.mainAxis === 'y' ? 'x' : 'y';
  const base = inspectLayoutArtifactBase(
    artifact.container,
    artifact.items,
    context.options,
    context.appearance,
    alignmentGuideDimension,
  );
  const structureLines: Array<LayoutInspectionLineMark> = [];
  if (context.options.lines) {
    artifact.lines.forEach(line => {
      const horizontal = line.mainAxis === 'x';
      structureLines.push(
        ...inspectLayoutStructureRect(
          'flex.line',
          {
            x: horizontal ? line.mainStart : line.crossStart,
            y: horizontal ? line.crossStart : line.mainStart,
            width: horizontal ? line.mainSize : line.crossSize,
            height: horizontal ? line.crossSize : line.mainSize,
          },
          context.appearance.scopeColor,
        ),
      );
    });
  }
  const spacing = inspectLayoutSpacing('flex', artifact.spacing, context.options, context.appearance);
  const [boxes = [], structure = [], underlay = [], normalizedSpacing = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structureLines,
    base.underlay,
    spacing,
  ]);
  return lowerLayoutInspectionMarks([
    ...underlay,
    ...normalizedSpacing,
    ...structure,
    ...boxes,
    ...base.warnings,
    ...base.guides,
    ...base.labels,
  ]);
};

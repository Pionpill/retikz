import type { JsonValue } from '@retikz/foundation';

import { isJsonObject } from '../../../../../scripts/evals';

/** 将无参数形状引用折为同义名称，保留未知字段供误填检查 */
const projectShape = (input: JsonValue): JsonValue => {
  if (!isJsonObject(input) || typeof input.type !== 'string') return input;
  if (Object.keys(input).some(key => key !== 'type' && key !== 'params')) return input;
  return !Object.hasOwn(input, 'params') || (isJsonObject(input.params) && Object.keys(input.params).length === 0)
    ? input.type
    : input;
};

/** 定位分支仅补其明示的静态缺省；引用和配置层级不会被求值 */
const projectPosition = (input: JsonValue): JsonValue => {
  if (!isJsonObject(input)) return input;
  const position = { ...input };
  if (position.kind === 'anchor') {
    if (isJsonObject(position.target)) {
      position.target = projectPosition(position.target);
    }
    position.selfAnchor ??= 'center';
  } else if (typeof position.id === 'string') {
    position.anchor ??= 'center';
    if (Object.hasOwn(position, 'boundary')) position.boundary = projectShape(position.boundary);
  } else if ('angle' in position && 'radius' in position) {
    position.origin = Object.hasOwn(position, 'origin') ? projectPosition(position.origin) : [0, 0];
  } else if (Array.isArray(position.between)) {
    position.between = position.between.map(projectPosition);
  } else if ('offset' in position && Object.hasOwn(position, 'of')) {
    position.of = projectPosition(position.of);
  }
  return position;
};

/** 仅在题目采用统一简写时接受按轴/边表达的有效值等价 */
const projectDimensions = (input: JsonValue, fields: Array<string>, fallback: number): JsonValue => {
  if (typeof input === 'number') return Object.fromEntries(fields.map(field => [field, input]));
  if (!isJsonObject(input)) return input;
  const known = new Set(['default', ...fields]);
  if (Object.keys(input).some(field => !known.has(field))) return input;
  return Object.fromEntries(fields.map(field => [field, input[field] ?? input.default ?? fallback]));
};

/** 间距标量允许同义稀疏对象，但不丢弃输入中的额外字段 */
const projectSpacing = (input: JsonValue): JsonValue => {
  if (typeof input === 'number') return { top: input, right: input, bottom: input, left: input };
  if (!isJsonObject(input)) return input;
  const known = new Set(['default', 'x', 'y', 'top', 'right', 'bottom', 'left']);
  if (Object.keys(input).some(field => !known.has(field))) return input;
  return {
    top: input.top ?? input.y ?? input.default ?? 0,
    bottom: input.bottom ?? input.y ?? input.default ?? 0,
    left: input.left ?? input.x ?? input.default ?? 0,
    right: input.right ?? input.x ?? input.default ?? 0,
  };
};

/** 同一文本块的字符串、硬换行及无覆盖行对象采用一致表示，公式只补明示的行内缺省 */
const projectText = (input: JsonValue): JsonValue => {
  const lines = typeof input === 'string' ? [input] : input;
  if (!Array.isArray(lines)) return input;
  return lines.flatMap((line): Array<JsonValue> => {
    if (typeof line === 'string') return line.split('\n');
    if (!isJsonObject(line)) return [line];
    if (typeof line.text === 'string' && Object.keys(line).length === 1) return line.text.split('\n');
    if (Array.isArray(line.segments)) {
      return [
        {
          ...line,
          segments: line.segments.map(segment =>
            isJsonObject(segment) && typeof segment.tex === 'string'
              ? { ...segment, displayMode: segment.displayMode ?? false }
              : segment,
          ),
        },
      ];
    }
    return [line];
  });
};

/** 绘制资源只补模型可见且无上下文依赖的默认值 */
const projectPaint = (input: JsonValue): JsonValue => {
  if (!isJsonObject(input)) return input;
  const paint = { ...input };
  if (['linearGradient', 'radialGradient', 'conicGradient'].includes(String(paint.kind))) {
    if (Array.isArray(paint.stops))
      paint.stops = paint.stops.map(stop => (isJsonObject(stop) ? { ...stop, opacity: stop.opacity ?? 1 } : stop));
  }
  if (paint.kind === 'radialGradient') {
    paint.center ??= [0.5, 0.5];
    paint.radius ??= 0.5;
  } else if (paint.kind === 'conicGradient') {
    paint.center ??= [0.5, 0.5];
    paint.angle ??= 0;
  } else if (paint.kind === 'image') {
    paint.fit ??= 'cover';
  }
  return paint;
};

/** 描边端点与转角的静态等价，其他继承字段保持省略 */
const projectStroke = (input: Record<string, JsonValue>, reference: JsonValue = {}): Record<string, JsonValue> => ({
  ...input,
  ...(isJsonObject(reference) && reference.lineCap === 'butt' ? { lineCap: input.lineCap ?? 'butt' } : {}),
  ...(isJsonObject(reference) && reference.lineJoin === 'miter' ? { lineJoin: input.lineJoin ?? 'miter' } : {}),
  ...(Object.hasOwn(input, 'stroke') ? { stroke: projectPaint(input.stroke) } : {}),
});

/** 主体样式只接受明确的标量整体透明度和预设阴影等价 */
const projectStyle = (input: JsonValue, reference: JsonValue): JsonValue => {
  if (!isJsonObject(input)) return input;
  const style = projectStroke(input, reference);
  if (typeof style.opacity === 'number') style.opacity = { overall: style.opacity };
  if (typeof style.shadow === 'string') style.shadow = { preset: style.shadow };
  if (Object.hasOwn(style, 'fill')) style.fill = projectPaint(style.fill);
  // “仅点线”任务明确允许省略或关闭 dashed；不把该等价推广到稀疏继承任务
  if (
    isJsonObject(reference) &&
    reference.dotted === true &&
    !Object.hasOwn(reference, 'dashed') &&
    !Object.hasOwn(reference, 'dashPattern') &&
    style.dashed === false
  )
    delete style.dashed;
  return style;
};

/** 单标签和单元素数组等价；同一题的多个标签按内容匹配 */
const projectLabels = (input: JsonValue): JsonValue => {
  const labels = Array.isArray(input) ? input : [input];
  return labels
    .map((label): JsonValue => {
      if (!isJsonObject(label)) return label;
      const projected = { ...label };
      if (Object.hasOwn(label, 'text')) projected.text = projectText(label.text);
      projected.position ??= 'top';
      if (isJsonObject(projected.position) && typeof projected.position.side === 'string') {
        projected.position = { ...projected.position, fraction: projected.position.fraction ?? 0.5 };
      }
      projected.placement ??= 'outside';
      projected.align ??= 'middle';
      projected.rotate ??= 'none';
      projected.keepUpright ??= false;
      projected.pin =
        !Object.hasOwn(label, 'pin') || label.pin === false
          ? false
          : label.pin === true
            ? projectStroke({})
            : isJsonObject(label.pin)
              ? projectStroke(label.pin)
              : label.pin;
      return projected;
    })
    .sort((left, right) => {
      const leftText = isJsonObject(left) ? left.text : left;
      const rightText = isJsonObject(right) ? right.text : right;
      return String(JSON.stringify(leftText)).localeCompare(String(JSON.stringify(rightText)));
    });
};

/** 关键帧使用绝对值，缺省段缓动继承轨道，变换支点缺省为中心 */
const projectAnimations = (input: JsonValue): JsonValue => {
  if (!Array.isArray(input)) return input;
  return input
    .map((track): JsonValue => {
      if (!isJsonObject(track)) return track;
      const projected = { ...track };
      projected.delay ??= 0;
      projected.easing ??= 'linear';
      projected.iterations ??= 1;
      projected.direction ??= 'normal';
      projected.fill ??= 'forwards';
      projected.trigger ??= 'load';
      if (['scale', 'scaleX', 'scaleY', 'rotate'].includes(String(track.property))) projected.origin ??= 'center';
      if (Array.isArray(track.keyframes))
        projected.keyframes = track.keyframes.map(frame =>
          isJsonObject(frame) ? { ...frame, easing: frame.easing ?? projected.easing } : frame,
        );
      return projected;
    })
    .sort((left, right) =>
      String(isJsonObject(left) ? left.property : left).localeCompare(
        String(isJsonObject(right) ? right.property : right),
      ),
    );
};

/**
 * 为配置事实比较建立临时语义投影，不代替 NodeSchema 或改写原始回答
 * @description 开放 meta/params 原样保留；对象后备配置不折叠，仅统一简写允许有效值等价
 */
export const projectNodeAnswer = (input: JsonValue, reference: JsonValue): JsonValue => {
  if (!isJsonObject(input) || !isJsonObject(reference)) return input;
  const node = { ...input };
  node.shape = Object.hasOwn(node, 'shape') ? projectShape(node.shape) : 'rectangle';
  node.position = Object.hasOwn(node, 'position') ? projectPosition(node.position) : [0, 0];
  if (Array.isArray(node.aliasIds)) node.aliasIds = [...node.aliasIds].sort();
  if (node.rotate === 0 && !Object.hasOwn(reference, 'rotate')) delete node.rotate;
  if (typeof reference.scale === 'number' && Object.hasOwn(node, 'scale')) {
    node.scale = projectDimensions(node.scale, ['x', 'y'], 1);
  }
  if (Object.hasOwn(node, 'boundary')) node.boundary = projectShape(node.boundary);
  if (Object.hasOwn(node, 'text')) node.text = projectText(node.text);
  if (Object.hasOwn(node, 'label')) node.label = projectLabels(node.label);
  node.style = projectStyle(Object.hasOwn(node, 'style') ? node.style : {}, reference.style ?? {});
  if (isJsonObject(node.layout) && isJsonObject(reference.layout)) {
    const layout = { ...node.layout };
    if (typeof reference.layout.minimumSize === 'number' && Object.hasOwn(layout, 'minimumSize')) {
      layout.minimumSize = projectDimensions(layout.minimumSize, ['width', 'height'], 0);
    }
    for (const field of ['padding', 'margin']) {
      if (typeof reference.layout[field] === 'number' && Object.hasOwn(layout, field)) {
        layout[field] = projectSpacing(layout[field]);
      }
    }
    node.layout = layout;
  }
  if (Object.hasOwn(node, 'animations')) node.animations = projectAnimations(node.animations);
  return node;
};

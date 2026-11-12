import type { PathCommand } from '../../contract';

/** 将路径命令编码为带类型标签的定长元组，仅用于资源摘要，外层数组由消费者组装 */
export const encodePathCommandSequence = (pathCommands: ReadonlyArray<PathCommand>): string => {
  /** 保持 JSON 数值语义，包括负零与非有限值 */
  const serializeNumber = (value: number): string => (Number.isFinite(value) ? String(value) : 'null');
  /** 坐标元组只含数值，无需调用通用 JSON 遍历 */
  const serializePoint = (point: readonly [number, number]): string =>
    `${serializeNumber(point[0])},${serializeNumber(point[1])}`;
  // ⚡用命令标签和固定位置代替重复字段名，减少序列化分配与 hash 字节数
  // 可选字段以 null 表示缺省，不能与显式 false / 0 合并
  const commands = pathCommands.map((command): string => {
    switch (command.kind) {
      case 'move':
        return `["m",${serializePoint(command.to)}]`;
      case 'line':
        return `["l",${serializePoint(command.to)}]`;
      case 'quad':
        return `["q",${serializePoint(command.control)},${serializePoint(command.to)}]`;
      case 'cubic':
        return `["c",${serializePoint(command.control1)},${serializePoint(command.control2)},${serializePoint(command.to)}]`;
      case 'arc':
        return `["a",${serializePoint(command.center)},${serializeNumber(command.radius)},${serializeNumber(command.startAngle)},${serializeNumber(command.endAngle)},${command.counterClockwise ?? 'null'}]`;
      case 'ellipseArc':
        return `["e",${serializePoint(command.center)},${serializeNumber(command.radiusX)},${serializeNumber(command.radiusY)},${command.rotation === undefined ? 'null' : serializeNumber(command.rotation)},${serializeNumber(command.startAngle)},${serializeNumber(command.endAngle)},${command.counterClockwise ?? 'null'}]`;
      case 'close':
        return '["z"]';
    }
  });
  return commands.join(',');
};

import type { PathCommand } from '../../contract';

/** 按字段字典序输出逗号分隔的命令 JSON，外层数组由消费者组装 */
export const serializePathCommandSequence = (pathCommands: ReadonlyArray<PathCommand>): string => {
  /** 保持 JSON 数值语义，包括负零与非有限值 */
  const serializeNumber = (value: number): string => (Number.isFinite(value) ? String(value) : 'null');
  /** 坐标元组只含数值，无需调用通用 JSON 遍历 */
  const serializePoint = (point: readonly [number, number]): string =>
    `[${serializeNumber(point[0])},${serializeNumber(point[1])}]`;
  // ⚡按命令直接写出有序字段与数值元组，避免临时对象及逐坐标通用 JSON 遍历
  const commands = pathCommands.map((command): string => {
    switch (command.kind) {
      case 'move':
      case 'line':
        return `{"kind":"${command.kind}","to":${serializePoint(command.to)}}`;
      case 'quad':
        return `{"control":${serializePoint(command.control)},"kind":"quad","to":${serializePoint(command.to)}}`;
      case 'cubic':
        return `{"control1":${serializePoint(command.control1)},"control2":${serializePoint(command.control2)},"kind":"cubic","to":${serializePoint(command.to)}}`;
      case 'arc':
        return `{"center":${serializePoint(command.center)}${command.counterClockwise === undefined ? '' : `,"counterClockwise":${command.counterClockwise}`},"endAngle":${serializeNumber(command.endAngle)},"kind":"arc","radius":${serializeNumber(command.radius)},"startAngle":${serializeNumber(command.startAngle)}}`;
      case 'ellipseArc':
        return `{"center":${serializePoint(command.center)}${command.counterClockwise === undefined ? '' : `,"counterClockwise":${command.counterClockwise}`},"endAngle":${serializeNumber(command.endAngle)},"kind":"ellipseArc","radiusX":${serializeNumber(command.radiusX)},"radiusY":${serializeNumber(command.radiusY)}${command.rotation === undefined ? '' : `,"rotation":${serializeNumber(command.rotation)}`},"startAngle":${serializeNumber(command.startAngle)}}`;
      case 'close':
        return '{"kind":"close"}';
    }
  });
  return commands.join(',');
};

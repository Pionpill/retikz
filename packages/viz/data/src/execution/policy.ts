import type { IRDataExecution } from '../transform';

/**
 * 分别继承 mode/external，完整继承后才补 builtin 默认
 * @param defaults 执行器默认配置；省略时没有这一层覆盖
 * @param root 宿主根配置，优先于执行器默认值
 * @param declaration 单条声明配置，优先于宿主根配置
 * @returns 分别继承 mode 与 external 的配置；mode 最终缺省为 builtin
 */
export const resolveDataExecution = (
  defaults?: IRDataExecution,
  root?: IRDataExecution,
  declaration?: IRDataExecution,
): Required<Pick<IRDataExecution, 'mode'>> & Pick<IRDataExecution, 'external'> => ({
  mode: declaration?.mode ?? root?.mode ?? defaults?.mode ?? 'builtin',
  external: declaration?.external ?? root?.external ?? defaults?.external,
});

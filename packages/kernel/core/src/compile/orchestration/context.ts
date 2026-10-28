import type { CompositeRuntimeInputScope } from '../../contract/composite';
import { resolveCompositeInputScope } from '../../contract/composite';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../resolve';
import type { IRScene } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompileEnvironment } from '../environment';
import { createCompileEnvironment } from '../environment';
import type { NodeGeometryContext } from '../node';
import { createNodeGeometryContext } from '../node';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { createTextMeasurement } from '../text';
import type { CompileOptions } from '../types';
import type { InputCompileWarning } from '../warning';
import { formatCompileWarning } from '../warning';

/** 本次全量编译的独占工作区，稳定能力来自环境 */
export type CompileContext = CompileEnvironment & {
  /** 本次几何缓存与诊断去重 */
  nodeGeometry: NodeGeometryContext;
  /** 与本次输入配对的 Composite 实例输入 */
  runtimeInputs: CompositeRuntimeInputScope;
  /** 本次完整输入 */
  loweredIr: IRScene;
  /** Scene 根有效主题 */
  theme: CanonicalTheme;
  /** 本次诊断收集器 */
  onWarn: (warning: InputCompileWarning) => void;
  /** 本次绘制资源注册表 */
  paint: ReturnType<typeof createPaintRegistry>;
  /** 本次裁剪资源注册表 */
  clip: ReturnType<typeof createClipRegistry>;
};

type CompileContextOptions = Omit<CompileOptions, 'onWarn'> & {
  onWarn?: (warning: InputCompileWarning) => void;
};

/** 从稳定环境创建独占编译工作区，文本缓存不跨次共享 */
export const createCompileContext = (
  ir: IRScene,
  options: CompileContextOptions,
  environment = createCompileEnvironment(options),
): CompileContext => {
  const measureText = createTextMeasurement(environment.measureText);
  const onWarn =
    options.onWarn ??
    ((warning: InputCompileWarning): void => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
      console.warn(formatCompileWarning({ ...warning, origin: warning.origin ?? { kind: 'primary' } }));
    });
  return {
    ...environment,
    nodeGeometry: createNodeGeometryContext(),
    runtimeInputs: resolveCompositeInputScope(ir, options.compositeInputs),
    loweredIr: ir,
    theme: resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme', environment.themeDefinitions),
    measureText,
    onWarn,
    paint: createPaintRegistry(environment.round),
    clip: createClipRegistry(environment.round, environment.maxClipDepth),
  };
};

import type { LayoutContribution } from '../../../contract';
import type { LayoutProbeFailureEntry } from '../../probe-failure';
import type { CompositeLayoutResultEntry, CompositeReplayTransaction, CompositeRuntimeOutputEntry } from './types';

/** 单次顶层编译共享的组件句柄和有界测量缓存，隔离试编译复用同一会话 */
export class CompositeCompileSession {
  /** 有界的编译内成功贡献缓存 */
  private measurements: Map<string, LayoutContribution> = new Map();

  /** 对象依赖的编译内身份 */
  private measurementIdentities: WeakMap<object, number> = new WeakMap();

  /** 不可 JSON 编码的原始运行时输入也按值身份区分 */
  private measurementPrimitiveIdentities: Map<unknown, number> = new Map();

  /** 下一个局部身份序号 */
  private nextMeasurementIdentity = 0;

  /** token → 隔离 probe 结果；不跨 compile 共享 */
  readonly replayTransactions: WeakMap<object, CompositeReplayTransaction> = new WeakMap();

  /** LayoutChildResult identity → replay token；拒绝复制或伪造 result */
  readonly layoutResults: WeakMap<object, CompositeLayoutResultEntry> = new WeakMap();

  /** opaque handle → runtime output 节点；不跨 compile 共享 */
  readonly outputChildren: WeakMap<object, CompositeRuntimeOutputEntry> = new WeakMap();

  /** 以不透明布局失败标识索引当前回调或编译内的失败元数据 */
  readonly failures: WeakMap<object, LayoutProbeFailureEntry> = new WeakMap();
  /** 为运行时依赖分配编译内身份，不将其写入作者输入 */
  identityOf(dependency: unknown): number {
    if ((typeof dependency !== 'object' || dependency === null) && typeof dependency !== 'function') {
      const existing = this.measurementPrimitiveIdentities.get(dependency);
      if (existing !== undefined) return existing;
      const identity = this.nextMeasurementIdentity++;
      if (this.measurementPrimitiveIdentities.size >= 4096) this.measurementPrimitiveIdentities.clear();
      this.measurementPrimitiveIdentities.set(dependency, identity);
      return identity;
    }
    const existing = this.measurementIdentities.get(dependency);
    if (existing !== undefined) return existing;
    const identity = this.nextMeasurementIdentity++;
    this.measurementIdentities.set(dependency, identity);
    return identity;
  }
  /** 读取成功测量并更新最近使用顺序 */
  getMeasurement(key: string): LayoutContribution | undefined {
    const result = this.measurements.get(key);
    if (result !== undefined) {
      this.measurements.delete(key);
      this.measurements.set(key, result);
    }
    return result;
  }
  /** 保存成功贡献并限制同次编译的缓存规模 */
  setMeasurement(key: string, result: LayoutContribution): void {
    this.measurements.set(key, result);
    if (this.measurements.size > 4096) {
      const oldest = this.measurements.keys().next();
      if (!oldest.done) this.measurements.delete(oldest.value);
    }
  }
}

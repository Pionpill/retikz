import type { Transform } from '../../contract';
import type { IRPosition } from '../../schemas';
import type { ComposedScopeTransform } from '../shared';
import { composeScopeTransform, applyScopeTransform, inverseScopeTransform } from '../shared';

/**
 * 单次编译遍历共享的 Scope 变换组合器
 * @description 当前变换链由调用方传入，本对象不维护当前 Scope；组合操作不原位修改输入链或已有合成结果
 * @remarks 缓存按数组对象身份命中，内容相同但引用不同的链不共享缓存；输入链及其变换项在缓存期间应保持不变
 */
export class ScopeTransformComposer {
  /** 按变换链数组身份缓存合成矩阵及累计旋转、缩放信息 */
  private readonly transformCache = new WeakMap<ReadonlyArray<Transform>, ComposedScopeTransform>();
  /** 按原链、插入序列的数组身份及插入位置缓存组合后的链，复用数组身份以命中合成结果缓存 */
  private readonly insertions = new WeakMap<
    ReadonlyArray<Transform>,
    WeakMap<ReadonlyArray<Transform>, Map<number, ReadonlyArray<Transform>>>
  >();

  /** 获取变换链的合成结果；空链复用单位变换，非空链仅在首次访问时计算 */
  readonly resolve = (chain: ReadonlyArray<Transform>): ComposedScopeTransform => {
    if (chain.length === 0) return composeScopeTransform(chain);
    let value = this.transformCache.get(chain);
    if (value === undefined) {
      value = composeScopeTransform(chain);
      this.transformCache.set(chain, value);
    }
    return value;
  };

  /**
   * 将一组变换插入原链指定位置，并缓存组合链与合成结果
   * @param chain 按祖先到当前层排列的原变换链
   * @param index 插入位置，等于原链长度时表示追加
   * @param transforms 保持自身顺序插入的变换序列
   * @returns 非空组合返回新链或已有缓存；任一输入为空时直接复用另一输入
   */
  readonly insert = (
    chain: ReadonlyArray<Transform>,
    index: number,
    transforms: ReadonlyArray<Transform>,
  ): ReadonlyArray<Transform> => {
    if (transforms.length === 0) return chain;
    if (chain.length === 0) return transforms;
    // 逐层定位原链、插入序列和位置，避免重复构造同一组合的数组
    let byTransforms = this.insertions.get(chain);
    if (byTransforms === undefined) {
      byTransforms = new WeakMap();
      this.insertions.set(chain, byTransforms);
    }
    let byIndex = byTransforms.get(transforms);
    if (byIndex === undefined) {
      byIndex = new Map();
      byTransforms.set(transforms, byIndex);
    }
    const previous = byIndex.get(index);
    if (previous !== undefined) return previous;
    const next =
      index === chain.length
        ? [...chain, ...transforms]
        : [...chain.slice(0, index), ...transforms, ...chain.slice(index)];
    // 尾部追加可复用原链合成结果；中间插入改变组合顺序，需要重新合成完整链
    const value =
      index === chain.length
        ? composeScopeTransform(transforms, this.resolve(chain), next)
        : composeScopeTransform(next);
    this.transformCache.set(next, value);
    byIndex.set(index, next);
    return next;
  };

  /** 在祖先链末尾追加当前层变换，复用插入缓存 */
  readonly append = (chain: ReadonlyArray<Transform>, transforms: ReadonlyArray<Transform>) =>
    this.insert(chain, chain.length, transforms);

  /** 将局部点按给定链投影到全局坐标，复用合成结果 */
  readonly apply = (point: IRPosition, chain: ReadonlyArray<Transform>) =>
    applyScopeTransform(point, this.resolve(chain));

  /** 将全局点反投影到给定链的局部坐标；链包含零缩放轴时抛出不可逆错误 */
  readonly inverse = (point: IRPosition, chain: ReadonlyArray<Transform>) =>
    inverseScopeTransform(point, this.resolve(chain));
}

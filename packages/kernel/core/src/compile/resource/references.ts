import type { ScenePrimitive, SceneResource } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** provider 输出中的资源引用，不保存图元树 */
export type CompileResourceReference = {
  /** 被引用的资源标识 */
  id: string;
  /** 使用处要求的资源种类 */
  kind: SceneResource['kind'];
  /** provider 内容中的引用位置 */
  location: string;
};

/** 收集已物化图元中的引用；对象循环由 provider 物化边界处理 */
export const collectPrimitiveResourceReferences = (
  primitives: ReadonlyArray<ScenePrimitive>,
  owner: string,
): Array<CompileResourceReference> => {
  const references: Array<CompileResourceReference> = [];
  const visit = (primitive: ScenePrimitive, location: string): void => {
    if (primitive.type === 'group') {
      if (primitive.clipRef !== undefined)
        references.push({ id: primitive.clipRef, kind: 'clip', location: `${location}.clipRef` });
      primitive.children.forEach((child, index) => visit(child, `${location}.children[${index}]`));
      return;
    }
    if (primitive.type === 'text') return;
    for (const field of ['fill', 'stroke'] as const) {
      const paint = primitive[field];
      if (typeof paint === 'object' && paint.kind === 'resourceRef')
        references.push({ id: paint.id, kind: 'paint', location: `${location}.${field}` });
    }
    if (primitive.type === 'path') {
      for (const field of ['arrowStart', 'arrowEnd'] as const)
        primitive[field]?.marker.forEach((child, index) => visit(child, `${location}.${field}.marker[${index}]`));
    }
  };
  primitives.forEach((primitive, index) => visit(primitive, `${owner}[${index}]`));
  return references;
};

/** 当前资源收集完成后检查引用关系，不重新遍历图元 */
export const validateCompileResourceReferences = (
  references: Iterable<CompileResourceReference>,
  dependencies: ReadonlyMap<string, ReadonlyArray<CompileResourceReference>>,
  resources: ReadonlyArray<SceneResource>,
): void => {
  // ID 唯一性由 paint / clip registry 的独立前缀与递增分配保证
  const resourceMap = new Map(resources.map(resource => [resource.id, resource]));
  const validate = (reference: CompileResourceReference): void => {
    if (resourceMap.get(reference.id)?.kind !== reference.kind)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Scene content ${reference.location}: expected ${reference.kind} resource '${reference.id}'`,
      );
  };
  for (const reference of references) validate(reference);
  const active = new Set<string>();
  const completed = new Set<string>();
  const visit = (id: string): void => {
    if (active.has(id))
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Scene content resource '${id}': cyclic resource dependency`,
      );
    if (completed.has(id)) return;
    active.add(id);
    for (const reference of dependencies.get(id) ?? []) {
      validate(reference);
      visit(reference.id);
    }
    active.delete(id);
    completed.add(id);
  };
  for (const id of dependencies.keys()) visit(id);
};

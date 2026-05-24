import type { IRClipSpec } from '../ir';
import type { ClipResource, ClipShape } from '../primitive';

/** clip 登记表：编译期收集裁剪区、去重派稳定 id（`clip-1`…），最后产出 Scene clip 资源 */
export type ClipRegistry = {
  /** 把一个裁剪区去重派 id；返回资源 id（供 GroupPrim.clipRef） */
  resolve: (clip: IRClipSpec) => string;
  /** 产出收集到的全部 clip 资源 */
  resources: () => Array<ClipResource>;
};

/**
 * 裁剪区 finite 守卫 + round
 * @description schema 的 `.finite().positive()` 只在 IR parse 守门；compileToScene 直接收手搓 / LLM IR 会绕过，
 *   故 compile 是唯一真实关口——非 finite / 非正尺寸会污染 Scene round-trip（JSON.stringify(NaN/Infinity)=null）。
 *   在此抛清晰错（含 kind），对齐 arrow / pattern 的 finite 守卫。坐标 / 尺寸按 Scene precision round。
 */
const guardAndRound = (clip: IRClipSpec, round: (n: number) => number): ClipShape => {
  const bad = (field: string, v: number): never => {
    throw new Error(
      `Clip '${clip.kind}' has an invalid ${field} (${String(v)}); it must be a finite number${
        field === 'x' || field === 'y' || field === 'cx' || field === 'cy' ? '' : ' greater than 0'
      }.`,
    );
  };
  const fin = (field: string, v: number): number => {
    if (!Number.isFinite(v)) bad(field, v);
    return round(v);
  };
  const pos = (field: string, v: number): number => {
    if (!Number.isFinite(v) || v <= 0) bad(field, v);
    return round(v);
  };
  switch (clip.kind) {
    case 'rect':
      return {
        kind: 'rect',
        x: fin('x', clip.x),
        y: fin('y', clip.y),
        width: pos('width', clip.width),
        height: pos('height', clip.height),
      };
    case 'circle':
      return { kind: 'circle', cx: fin('cx', clip.cx), cy: fin('cy', clip.cy), r: pos('r', clip.r) };
    case 'ellipse':
      return {
        kind: 'ellipse',
        cx: fin('cx', clip.cx),
        cy: fin('cy', clip.cy),
        rx: pos('rx', clip.rx),
        ry: pos('ry', clip.ry),
      };
    case 'polygon': {
      if (clip.points.length < 3) {
        throw new Error(`Clip 'polygon' needs at least 3 points; got ${clip.points.length}.`);
      }
      return {
        kind: 'polygon',
        points: clip.points.map(([px, py], i): [number, number] => {
          if (!Number.isFinite(px) || !Number.isFinite(py)) {
            throw new Error(`Clip 'polygon' point[${i}] is not finite (${String(px)}, ${String(py)}).`);
          }
          return [round(px), round(py)];
        }),
      };
    }
  }
};

/**
 * 建一个 clip 登记表
 * @description resolve 对结构相同裁剪区（JSON 深比较）合并为一个资源、派稳定 id（`clip-1` / `clip-2`…，首见序）。
 *   同一份 IR 编译两次 → 同 id（快照稳定）。裁剪区坐标 / 尺寸经 finite 守卫 + round。
 * @param round 精度取整（与 compile / render 同一 round，保几何一致）
 */
export const createClipRegistry = (round: (n: number) => number): ClipRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<ClipResource> = [];
  let counter = 0;
  const resolve = (clip: IRClipSpec): string => {
    const shape = guardAndRound(clip, round);
    const key = JSON.stringify(shape);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `clip-${counter}`;
      idByKey.set(key, id);
      list.push({ kind: 'clip', id, shape });
    }
    return id;
  };
  return { resolve, resources: () => list };
};

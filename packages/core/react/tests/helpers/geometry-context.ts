/**
 * 几何忠实的 2D context test harness（canvas 水合 / parity 测试用）
 * @description jsdom 无真实 canvas 2D context；hitTest 靠把图元几何重建进 context 再调 isPointInPath /
 *   isPointInStroke 点测。本 harness 记录子路径、按仿射矩阵应用 transform，用射线法 / 点到线段距离回答点测，
 *   只提供 canvas 原语——hitTest / 控制器 / 坐标映射的真实逻辑仍受测。与 render 层 canvas-hittest 同款思路。
 */

type Pt = [number, number];

type SubPath = {
  points: Array<Pt>;
  closed: boolean;
};

/** 创建几何忠实 2D context */
export const createGeometryContext = (): CanvasRenderingContext2D => {
  let subPaths: Array<SubPath> = [];
  let current: SubPath | null = null;
  let cursor: Pt = [0, 0];
  let matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const stack: Array<[number, number, number, number, number, number]> = [];
  let lineWidth = 1;

  const apply = (x: number, y: number): Pt => {
    const [a, b, c, d, e, f] = matrix;
    return [a * x + c * y + e, b * x + d * y + f];
  };
  const multiply = (m: [number, number, number, number, number, number]): void => {
    const [a, b, c, d, e, f] = matrix;
    const [a2, b2, c2, d2, e2, f2] = m;
    matrix = [
      a * a2 + c * b2,
      b * a2 + d * b2,
      a * c2 + c * d2,
      b * c2 + d * d2,
      a * e2 + c * f2 + e,
      b * e2 + d * f2 + f,
    ];
  };
  const ensure = (): SubPath => {
    if (current === null) {
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    }
    return current;
  };

  const ctx = {
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(v: number) {
      lineWidth = v;
    },
    beginPath(): void {
      subPaths = [];
      current = null;
    },
    closePath(): void {
      if (current) current.closed = true;
    },
    moveTo(x: number, y: number): void {
      cursor = apply(x, y);
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    },
    lineTo(x: number, y: number): void {
      cursor = apply(x, y);
      ensure().points.push(cursor);
    },
    rect(x: number, y: number, w: number, h: number): void {
      subPaths.push({
        points: [apply(x, y), apply(x + w, y), apply(x + w, y + h), apply(x, y + h)],
        closed: true,
      });
      current = null;
    },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
      const sp = ensure();
      const from = cursor;
      const ctrl = apply(cx, cy);
      const to = apply(x, y);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const mt = 1 - t;
        sp.points.push([
          mt * mt * from[0] + 2 * mt * t * ctrl[0] + t * t * to[0],
          mt * mt * from[1] + 2 * mt * t * ctrl[1] + t * t * to[1],
        ]);
      }
      cursor = to;
    },
    bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
      const sp = ensure();
      const from = cursor;
      const c1 = apply(c1x, c1y);
      const c2 = apply(c2x, c2y);
      const to = apply(x, y);
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const mt = 1 - t;
        sp.points.push([
          mt * mt * mt * from[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * to[0],
          mt * mt * mt * from[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * to[1],
        ]);
      }
      cursor = to;
    },
    arc(cx: number, cy: number, r: number, start: number, end: number): void {
      const sp = ensure();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const ang = start + ((end - start) * i) / steps;
        sp.points.push(apply(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
      }
      sp.closed = true;
    },
    ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, start: number, end: number): void {
      const sp = ensure();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const ang = start + ((end - start) * i) / steps;
        const ex = Math.cos(ang) * rx;
        const ey = Math.sin(ang) * ry;
        const rx2 = ex * Math.cos(rot) - ey * Math.sin(rot);
        const ry2 = ex * Math.sin(rot) + ey * Math.cos(rot);
        sp.points.push(apply(cx + rx2, cy + ry2));
      }
      sp.closed = true;
    },
    save(): void {
      stack.push([...matrix]);
    },
    restore(): void {
      const m = stack.pop();
      if (m) matrix = m;
    },
    translate(x: number, y: number): void {
      multiply([1, 0, 0, 1, x, y]);
    },
    rotate(a: number): void {
      multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    },
    scale(x: number, y: number): void {
      multiply([x, 0, 0, y, 0, 0]);
    },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
      matrix = [a, b, c, d, e, f];
    },
    getTransform(): DOMMatrix {
      const [a, b, c, d, e, f] = matrix;
      return { a, b, c, d, e, f } as unknown as DOMMatrix;
    },
    setLineDash(): void {},
    clip(): void {},
    fill(): void {},
    stroke(): void {},
    clearRect(): void {},
    fillRect(): void {},
    measureText(): TextMetrics {
      return { width: 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 } as TextMetrics;
    },
    font: '',
    isPointInPath(px: number, py: number): boolean {
      let inside = false;
      for (const sp of subPaths) {
        const pts = sp.points;
        if (pts.length < 3) continue;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0];
          const yi = pts[i][1];
          const xj = pts[j][0];
          const yj = pts[j][1];
          const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
      }
      return inside;
    },
    isPointInStroke(px: number, py: number): boolean {
      const half = lineWidth / 2;
      for (const sp of subPaths) {
        const pts = sp.points;
        const limit = sp.closed ? pts.length : pts.length - 1;
        for (let i = 0; i < limit; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len2 = dx * dx + dy * dy;
          const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
          const cx = a[0] + t * dx;
          const cy = a[1] + t * dy;
          const dist = Math.hypot(px - cx, py - cy);
          if (dist <= half) return true;
        }
      }
      return false;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

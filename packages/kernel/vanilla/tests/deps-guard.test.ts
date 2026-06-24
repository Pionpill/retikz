import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * @retikz/vanilla 架构守卫（node 环境）
 * @description 钉死三条不可越界：仅依赖 core/render（无 react）、不复制 Scene→SVG 内核、
 *   作 SSR 门面必须「导入不触 DOM」（无 document 的 Node 下 import + renderToSvgString 不炸）。
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(here, '../package.json'), 'utf8'));
const readSrc = (f: string) => readFileSync(path.resolve(here, '../src', f), 'utf8');

describe('@retikz/vanilla 架构守卫', () => {
  it('no-react-dep：运行时依赖仅 core/render，无 react', () => {
    const deps = Object.keys(pkg.dependencies ?? {}).sort();
    expect(deps).toEqual(['@retikz/core', '@retikz/render']);
    expect(JSON.stringify(pkg)).not.toContain('@retikz/react');
    expect(pkg.dependencies).not.toHaveProperty('react');
  });

  it('no-renderer-core-duplication：经 @retikz/render/svg builder，不自写 Scene→SVG', () => {
    const mountSrc = readSrc('mount-svg.ts');
    const strSrc = readSrc('render-to-svg-string.ts');
    expect(mountSrc).toMatch(/from ['"]@retikz\/render\/svg['"]/);
    expect(mountSrc).toMatch(/buildSvgDocument/);
    expect(strSrc).toMatch(/from ['"]@retikz\/render\/svg['"]/);
    // 不在 vanilla 复制 prim→attrs（stroke-width 这类呈现属性映射是 svg 的活）
    expect(mountSrc + strSrc).not.toMatch(/['"]stroke-width['"]/);
  });

  it('ssr-import-no-dom：无 document 的 Node 下 import + renderToSvgString 不炸', async () => {
    expect(typeof document).toBe('undefined'); // 确认在无 DOM 的 node 环境
    const mod = await import('../src/index');
    expect(typeof mod.renderToSvgString).toBe('function');
    expect(typeof mod.mountSvg).toBe('function');
    const scene = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };
    expect(() => mod.renderToSvgString(scene as never)).not.toThrow();
  });
});

import { fileURLToPath } from 'node:url';

import { normalizePath } from 'vite';
import type { Plugin } from 'vite';

/** 只在基准加载源码时注入边界；源代码形状改变时失败，禁止静默漏计 */
export const integrationTimingPlugin = (): Plugin => {
  const timer = normalizePath(fileURLToPath(new URL('./integration/_timer.ts', import.meta.url)));
  const inject = (source: string, anchor: string, instrumented: string) => {
    if (source.split(anchor).length !== 2) throw new Error('Vanilla benchmark timing boundary changed: ' + anchor);
    return source.replace(anchor, instrumented);
  };
  return {
    name: 'vanilla-integration-timing',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'virtual:vanilla-integration-timer') return timer;
    },
    transform(source, id) {
      if (id.endsWith('/reconciler/src/reconcile/reconciler.ts')) {
        const start = 'let weave: WeaveManager<TComposite> | undefined;';
        const end = 'const candidate: ReconcilerResult<TComposite> =';
        return (
          "import {startCompute,endCompute} from 'virtual:vanilla-integration-timer';\n" +
          inject(
            inject(inject(source, start, 'startCompute();' + start), end, 'endCompute();' + end),
            'const prepared = this.weave.prepareUpdate(batch, this.execution.updateStrategy === ReconcilerUpdateStrategy.Full);',
            'startCompute();const prepared = this.weave.prepareUpdate(batch, this.execution.updateStrategy === ReconcilerUpdateStrategy.Full);endCompute();',
          )
        );
      }
      if (id.endsWith('/vanilla/src/runtime/runtime.ts')) {
        // 无 DOM 目标的 SSR 会话不应把空提交计作渲染
        const calls = [
          ['target ??= createTarget?.()', 'if(createTarget)target ??= timeRender(()=>createTarget())'],
          ['target?.prepare(candidate, previous)', 'target && timeRender(()=>target!.prepare(candidate, previous))'],
          ['token?.commit()', 'token && timeRender(()=>token.commit())'],
          ['token?.dispose()', 'token && timeRender(()=>token.dispose())'],
        ] as const;
        let result = source;
        for (const [call, wrapped] of calls) result = inject(result, call, wrapped);
        return "import {timeRender} from 'virtual:vanilla-integration-timer';\n" + result;
      }
    },
  };
};

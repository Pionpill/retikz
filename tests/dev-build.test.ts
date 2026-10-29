import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { build, createServer } from 'vite';
import type { Plugin } from 'vite';

import { createRetikzDevPlugin } from '../config/vite/dev-plugin.ts';

const fixtureId = 'virtual:retikz-dev-fixture';
const fixtureSource = `
const createDevMessage = () => ['DEV_ONLY_SENTINEL', 'detail'].join(':');
export const run = onWarn => {
  if (__DEV__) console.warn(createDevMessage());
  onWarn('caller-warning');
  return 'result';
};
`;

/** 通过虚拟入口验证真实构建输出，不写临时源码或产物 */
const createFixturePlugin = (source: string): Plugin => ({
  name: 'dev-build-fixture',
  resolveId: id => (id === fixtureId ? `\0${fixtureId}` : undefined),
  load: id => (id === `\0${fixtureId}` ? source : undefined),
});

/** 串行切换宿主环境，结束后恢复调用者配置 */
const withNodeEnvironment = async (environment: string, execute: () => Promise<void>): Promise<void> => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  try {
    await execute();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
};

/** 只返回内存中的单入口 JavaScript 产物 */
const buildFixture = async (source: string, library: boolean, useMacro: boolean): Promise<string> => {
  const result = await build({
    configFile: false,
    envFile: false,
    // 自定义 mode 不代表开发环境，开关应服从 NODE_ENV
    mode: 'staging',
    logLevel: 'silent',
    plugins: [...(useMacro ? [createRetikzDevPlugin()] : []), createFixturePlugin(source)],
    build: {
      write: false,
      minify: false,
      ...(library ? { lib: { entry: fixtureId, formats: ['es'], fileName: 'fixture' } } : {}),
      rollupOptions: {
        input: fixtureId,
        preserveEntrySignatures: 'strict',
        output: library ? { format: 'es' } : { format: 'iife', name: 'DevFixture' },
      },
    },
  });
  assert.ok(!('on' in result), '构建必须直接返回产物');
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs.flatMap(output => output.output).filter(output => output.type === 'chunk');
  assert.equal(chunks.length, 1);
  return chunks[0].code;
};

/** 在没有 process 的浏览器式环境执行应用产物 */
const assertApplicationBehavior = (code: string, development: boolean): void => {
  const warnings: Array<string> = [];
  const diagnostics: Array<string> = [];
  const sandbox = { console: { warn: (message: string) => warnings.push(message) }, diagnostics };
  const result: unknown = runInNewContext(`${code}\nDevFixture.run(message => diagnostics.push(message));`, sandbox);
  assert.equal(result, 'result');
  assert.deepEqual(warnings, development ? ['DEV_ONLY_SENTINEL:detail'] : []);
  assert.deepEqual(diagnostics, ['caller-warning']);
};

test('发布 ESM 保留环境判断，开发与生产消费者自行决定提示和裁剪', async () => {
  let published = '';
  await withNodeEnvironment('production', async () => {
    published = await buildFixture(fixtureSource, true, true);
  });
  assert.doesNotMatch(published, /__DEV__/);
  assert.match(published, /process\.env\.NODE_ENV/);
  assert.match(published, /DEV_ONLY_SENTINEL/);

  for (const environment of ['development', 'production']) {
    const development = environment === 'development';
    const native = spawnSync(process.execPath, ['--input-type=module', '--eval', `${published}\nrun(console.log);`], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: environment },
    });
    assert.equal(native.status, 0, native.stderr);
    assert.equal(native.stdout.trim(), 'caller-warning');
    assert.equal(native.stderr.includes('DEV_ONLY_SENTINEL'), development);
    await withNodeEnvironment(environment, async () => {
      const application = await buildFixture(published, false, false);
      assertApplicationBehavior(application, development);
      if (!development) {
        assert.doesNotMatch(application, /DEV_ONLY_SENTINEL|createDevMessage|process\.env\.NODE_ENV/);
      }
    });
  }
});

test('直接消费 workspace 源码时，开发和生产应用无需宿主 process', async () => {
  for (const environment of ['development', 'production']) {
    await withNodeEnvironment(environment, async () => {
      const application = await buildFixture(fixtureSource, false, true);
      assert.doesNotMatch(application, /__DEV__|process\.env\.NODE_ENV/);
      assertApplicationBehavior(application, environment === 'development');
      if (environment === 'production') assert.doesNotMatch(application, /DEV_ONLY_SENTINEL|createDevMessage/);
    });
  }
});

test('开发服务器向浏览器注入宏，无需宿主 process 或监听端口', async () => {
  await withNodeEnvironment('development', async () => {
    const server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      plugins: [createRetikzDevPlugin(), createFixturePlugin(fixtureSource)],
      server: { middlewareMode: true, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const transformed = await server.transformRequest(fixtureId);
      assert.ok(transformed);
      const envPath = fileURLToPath(new URL('./dist/client/env.mjs', import.meta.resolve('vite/package.json')));
      const environment = await server.transformRequest(`/@fs/${envPath.replaceAll('\\', '/')}`);
      assert.ok(environment);
      const script = transformed.code.replace('export const run', 'const run');
      assertApplicationBehavior(`${environment.code}\n${script}\nconst DevFixture = { run };`, true);
    } finally {
      await server.close();
    }
  });
});

test('Node/tsx 源码入口预加载宏，开发提示和生产诊断均可用', () => {
  const source = `
    import { compileToScene } from '@retikz/core';
    const scene = { version: 1, type: 'scene', children: [
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }
    ] };
    compileToScene(scene);
    compileToScene(scene, { onWarn: warning => console.log(warning.code) });
  `;
  for (const environment of ['development', 'production']) {
    const result = spawnSync(
      process.execPath,
      ['--import', '../../config/dev-runtime.mjs', '--import', 'tsx', '--input-type=module', '--eval', source],
      {
        cwd: fileURLToPath(new URL('../apps/eval/', import.meta.url)),
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: environment },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PATH_TOO_SHORT/);
    assert.equal(result.stderr.includes('PATH_TOO_SHORT'), environment === 'development');
  }
});

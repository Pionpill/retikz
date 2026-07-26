import { afterEach, describe, expect, it } from 'vitest';

import { readBenchPort } from '../src/browser-runner';

const originalPort = process.env.RETIKZ_BENCH_PORT;

afterEach(() => {
  if (originalPort === undefined) delete process.env.RETIKZ_BENCH_PORT;
  else process.env.RETIKZ_BENCH_PORT = originalPort;
});

describe('browser runner port', () => {
  it('接受 1 到 65535 的整数端口', () => {
    process.env.RETIKZ_BENCH_PORT = '5175';
    expect(readBenchPort()).toBe(5175);
  });

  it.each(['0', '65536', '1.5', 'not-a-port'])('拒绝非法端口 %s', value => {
    process.env.RETIKZ_BENCH_PORT = value;
    expect(() => readBenchPort()).toThrow(/1 and 65535/i);
  });
});

import { Star, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={140}>
    {/* 5 角星（默认内半径比 0.5）+ 6 角星（内半径比 0.6） */}
    <Star center={[70, 70]} outerRadius={55} points={5} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
    <Star center={[210, 70]} outerRadius={55} points={6} innerRatio={0.6} fill="#a78bfa" />
  </TikZ>
);

export default Demo;

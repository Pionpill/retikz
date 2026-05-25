import { Layout, Star } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={140}>
    {/* 5 角星（默认内半径比 0.5）+ 6 角星（内半径比 0.6） */}
    <Star center={[70, 70]} outerRadius={55} points={5} fill="orange" stroke="orange" strokeWidth={2} />
    <Star center={[210, 70]} outerRadius={55} points={6} innerRatio={0.6} fill="teal" />
  </Layout>
);

export default Demo;

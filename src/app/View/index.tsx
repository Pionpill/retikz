import Header from '@/app/View/Header';
import { FC } from 'react';
import { Outlet } from 'react-router';

const View: FC = () => (
  <div className="w-screen h-screen max-w-full max-h-full overflow-hidden">
    <Header />
    <Outlet />
  </div>
);

export default View;

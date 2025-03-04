import Header from '@/app/View/header';
import { FC } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';

const View: FC = () => (
  <div className="w-screen h-screen max-w-full max-h-full overflow-hidden">
    <Header />
    <Toaster />
    <Outlet />
  </div>
);

export default View;

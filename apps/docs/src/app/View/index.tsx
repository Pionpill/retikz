import { FC } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from 'sonner';

const View: FC = () => {
  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
};

export default View;

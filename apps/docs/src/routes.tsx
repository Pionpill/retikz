import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Doc from './app/doc';
import Home from './app/home';
import View from './app/View';

const AppRoute: FC = () => (
  <BrowserRouter basename="/retikz">
    <Routes>
      <Route path="/" element={<View />}>
        <Route index element={<Home />} />
        <Route path="doc/*" element={<Doc />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRoute;

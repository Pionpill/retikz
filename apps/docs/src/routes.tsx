import { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Doc from './app/doc';
import Home from './app/home';
import View from './app/view';

const AppRoute: FC = () => (
  <BrowserRouter basename="/retikz.doc">
    <Routes>
      <Route path="/" element={<View />}>
        <Route index element={<Home />} />
        <Route path="doc/*" element={<Doc />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRoute;

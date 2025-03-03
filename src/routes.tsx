import { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Home from './app/home';
import View from './app/View';

const AppRoute: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<View />}>
        <Route index element={<Home />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRoute;

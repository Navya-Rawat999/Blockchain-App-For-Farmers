import type { RouteObject } from 'react-router-dom'
import Home from './screens/Home'
import App from './App'
import Wallet from './screens/Wallet'
import Farmer from './screens/Farmer'
import Customer from './screens/Customer'
import Scan from './screens/Scan'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'wallet', element: <Wallet /> },
      { path: 'farmer', element: <Farmer /> },
      { path: 'customer', element: <Customer /> },
      { path: 'scan', element: <Scan /> },
    ],
  },
]

export default routes

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import Home from './pages/Home'
import Store from './pages/Store'
import Item from './pages/Item'
import Checkout from './pages/Checkout'
import Reservation from './pages/Reservation'
import StoreDetails from './pages/StoreDetails'
import './App.css'

function App() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey="6Lf1-AUrAAAAABh6UjNiSEuLRiWHDrOKawfVCD8L">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/store/:storeId" element={<Store />} />
          <Route path="/store/:storeId/item/:itemId" element={<Item />} />
          <Route path="/store/:storeId/details" element={<StoreDetails />} />
          <Route path="/checkout/:storeId" element={<Checkout />} />
          <Route path="/store/:storeId/reservation" element={<Reservation />} />
        </Routes>
      </Router>
    </GoogleReCaptchaProvider>
  )
}

export default App

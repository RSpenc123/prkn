
import './App.css';
import {Route, Routes} from "react-router-dom";
import { Landing } from './Pages/Landing';
import Carousel from './Pages/Carousel';
import Mobile from './Pages/Mobile';
import { BookingProvider } from './context/BookingContext';
import SpotsList from './Pages/Booking/SpotsList';
import SpotDetail from './Pages/Booking/SpotDetail';
import Auth from './Pages/Booking/Auth';
import VerifyCode from './Pages/Booking/VerifyCode';
import Profile from './Pages/Booking/Profile';
import Payment from './Pages/Booking/Payment';
import Confirmation from './Pages/Booking/Confirmation';
import { Outlet } from 'react-router-dom';

function BookingLayoutRoute() {
  return (
    <BookingProvider>
      <Outlet />
    </BookingProvider>
  );
}

function App() {
  return (
    <Routes>
   <Route path="/" element={<Landing/>} />
   <Route path="/test" element={<Carousel/>} />
   <Route path="/mobile" element={<Mobile/>} />

   <Route path="/r/:addressId" element={<BookingLayoutRoute/>}>
     <Route index element={<SpotsList/>} />
     <Route path=":spotId" element={<SpotDetail/>} />
     <Route path=":spotId/auth" element={<Auth/>} />
     <Route path=":spotId/verify" element={<VerifyCode/>} />
     <Route path=":spotId/profile" element={<Profile/>} />
     <Route path=":spotId/payment" element={<Payment/>} />
     <Route path=":spotId/confirmation" element={<Confirmation/>} />
   </Route>

   <Route />
    </Routes>

  );
}

export default App;

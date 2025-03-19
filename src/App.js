
import './App.css';
import {Route, Routes} from "react-router-dom";
import { Landing } from './Pages/Landing';
import Carousel from './Pages/Carousel';
import Mobile from './Pages/Mobile';


function App() {
  return (
    <Routes>
   <Route path="/" element={<Landing/>} />
   <Route path="/test" element={<Carousel/>} />
   <Route path="/mobile" element={<Mobile/>} />
   

   <Route />
    </Routes>
  
  );
}

export default App;

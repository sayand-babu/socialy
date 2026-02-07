import { Routes, Route, useLocation } from 'react-router-dom';

import Home from './pages/home';
import Marketplace from './pages/MarketPlace';
import MyListings from './pages/MyListing';
import ListingDetails from './pages/ListingDetails';
import ManageListing from './pages/ManageListing';
import Messages from './pages/Messages';
import MyOrders from './pages/MyOrders';
import Loading from './pages/Loading';
import Navbar from './components/Navbar';
import Chatbox from './components/Chatbox';
import Toaster from 'react-hot-toast';

const App = () => {
  const { pathname } = useLocation();
  return (
    <div>
      <Toaster position="top-right" />
      {!pathname.includes('/admin') && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/listing/:listingId" element={<ListingDetails />} />
        <Route path="/create-listing" element={<ManageListing />} />
        <Route path="/edit-listing/:id" element={<ManageListing />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/loading" element={<Loading />} />
      </Routes>
      <Chatbox />
    </div>
  );
};

export default App;

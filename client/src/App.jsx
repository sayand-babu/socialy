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
import { Toaster } from 'react-hot-toast';
import Layout from '../src/pages/admin/Layout';
import Dashboard from '../src/pages/admin/Dashboard';
import CredentialVerify from '../src/pages/admin/CredentialVerify';
import CredentialChange from '../src/pages/admin/CredentialChange';
import AllListings from '../src/pages/admin/AllListings';
import Transactions from '../src/pages/admin/Transactions';
import Withdrawal from '../src/pages/admin/Withdrawal';
import Disputes from '../src/pages/admin/Disputes';

const App = () => {
  const { pathname } = useLocation();
  return (
    <div>
      <Toaster />
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

        <Route path="/admin" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="verify-credentials" element={<CredentialVerify />} />
          <Route path="change-credentials" element={<CredentialChange />} />
          <Route path="list-listings" element={<AllListings />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="withdrawal" element={<Withdrawal />} />
          <Route path="disputes" element={<Disputes />} />
        </Route>
      </Routes>
      <Chatbox />
    </div>
  );
};

export default App;

import React from 'react';
import { assets } from '../assets/assets';
import { useNavigate, Link } from 'react-router-dom';
import {
  BoxIcon,
  GripIcon,
  ListIcon,
  MenuIcon,
  MessageCircleMoreIcon,
  XIcon,
  ShieldCheck,
} from 'lucide-react';
import { useUser, useClerk, UserButton } from '@clerk/clerk-react';

function Navbar() {
  const { user } = useUser();
  const { openSignIn } = useClerk();

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <nav className="h-20">
      <div className="fixed left-0 top-0 right-0 z-100 flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-300 bg-white transition-all">
        <img
          onClick={() => {
            navigate('/');
            scrollTo(0, 0);
          }}
          src={assets.logo}
          alt="Logo"
          className="h-10 cursor-pointer"
        />

        {/* Desktop Menu */}

        <div className="hidden sm:flex items-center gap-4 md:gap-8 max-md:text-sm text-gray-800">
          <Link to="/" onClick={scrollTo(0, 0)}>
            Home
          </Link>
          <Link to="/marketplace" onClick={() => scrollTo(0, 0)}>
            {' '}
            Marketplace{' '}
          </Link>
          <Link
            to={user ? '/messages' : '#'}
            onClick={() => (user ? scrollTo(0, 0) : openSignIn())}
          >
            {' '}
            Messages{' '}
          </Link>
          <Link
            to={user ? '/my-listings' : '#'}
            onClick={() => (user ? scrollTo(0, 0) : openSignIn())}
          >
            {' '}
            My Listings{' '}
          </Link>
        </div>

        <div>
          {!user ? (
            <button
              onClick={openSignIn}
              className="max-sm:hidden cursor-pointer px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full"
            >
              Login
            </button>
          ) : (
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Messages"
                  labelIcon={<MessageCircleMoreIcon size={16} />}
                  onClick={() => {
                    navigate('/messages');
                    scrollTo(0, 0);
                  }}
                />
              </UserButton.MenuItems>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="My Listings"
                  labelIcon={<ListIcon size={16} />}
                  onClick={() => {
                    navigate('/my-listings');
                    scrollTo(0, 0);
                  }}
                />
              </UserButton.MenuItems>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Marketplace"
                  labelIcon={<GripIcon size={16} />}
                  onClick={() => {
                    navigate('/marketplace');
                    scrollTo(0, 0);
                  }}
                />
              </UserButton.MenuItems>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="My Orders"
                  labelIcon={<BoxIcon size={16} />}
                  onClick={() => {
                    navigate('/my-orders');
                    scrollTo(0, 0);
                  }}
                />
              </UserButton.MenuItems>
              {user?.publicMetadata?.role === 'admin' && (
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Admin Portal"
                    labelIcon={<ShieldCheck size={16} />}
                    onClick={() => {
                      navigate('/admin');
                      scrollTo(0, 0);
                    }}
                  />
                </UserButton.MenuItems>
              )}
            </UserButton>
          )}
          <MenuIcon
            onClick={() => {
              setMenuOpen(true);
            }}
            className="sm:hidden"
          />
        </div>
      </div>
      {/* Mobile Menu */}
      <div
        className={`sm:hidden fixed inset-0 ${menuOpen ? 'w-full' : 'w-0'} overflow-hidden bg-white backdrop-blur shadow-xl rounded-lg z-200 text-sm transition-all`}
      >
        <div className="flex flex-col items-center justify-center h-full text-xl font-semibold gap-6 p-4">
          <Link to="/marketplace" onClick={() => setMenuOpen(false)}>
            {' '}
            Marketplace{' '}
          </Link>
          <button onClick={openSignIn}>MY Listing</button>
          <button onClick={openSignIn}>Messages</button>
          <button
            onClick={openSignIn}
            className=" cursor-pointer px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full"
          >
            Login
          </button>
          <XIcon onClick={() => setMenuOpen(false)} />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

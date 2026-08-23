import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Hero() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const onSubmitHandler = (e) => {
    e.preventDefault();
    navigate(`/marketplace?search=${input}`);
  };
  return (
    <>
      <div className="relative flex flex-col items-center justify-center text-sm px-4 md:px-16 lg:px-24 xl:px-40 text-gray-800">
        {/* Avatars + Stars */}
        <div className="flex items-center mt-24 md:mt-36">
          <div className="flex -space-x-3 pr-3">
            <img
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200"
              alt="user3"
              className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-[1]"
            />
            <img
              src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200"
              alt="user1"
              className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-2"
            />
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"
              alt="user2"
              className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-[3]"
            />
            <img
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200"
              alt="user3"
              className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-[4]"
            />
            <img
              src="https://randomuser.me/api/portraits/men/75.jpg"
              alt="user5"
              className="size-8 rounded-full border-2 border-white hover:-translate-y-0.5 transition z-[5]"
            />
          </div>

          <div>
            <div className="flex ">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-star text-transparent fill-indigo-600"
                    aria-hidden="true"
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                  </svg>
                ))}
            </div>
            <p className="text-sm text-gray-700"> Used by 10,000+ users </p>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-semibold max-w-lg md:max-w-2xl text-center mt-4 leading-tight md:leading-tight">
          Buy and Sell your{' '}
          <span className="relative bg-gradient-to-r from-purple-700 to-[#764de1] bg-clip-text text-transparent">
            social
            <div className="z-10 absolute -bottom-2 left-0 w-full pointer-events-none">
              <svg
                viewBox="0 0 100 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-3 overflow-visible"
              >
                <path
                  d="M2 9.5C25 2 75 2 98 9.5"
                  stroke="url(#hero-gradient-arc)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="hero-gradient-arc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="50%" stopColor="#764de1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </span>{' '}
          <span className="relative bg-gradient-to-r from-[#764de1] to-indigo-600 bg-clip-text text-transparent">
            Profiles
          </span>{' '}
          Online.
        </h1>

        <p className="max-w-xl text-center text-base my-7">
          a Secure Marketplace to Buy and Sell Instagram, Twitter, Youtube ,
          Telegram and more - fast safe and hassle-free.
        </p>

        {/* Search Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            navigate(`/marketplace?search=${encodeURIComponent(input.trim())}`);
          }}
          className="w-full flex justify-center group"
        >
          <div className="border border-gray-300 hover:border-indigo-400 bg-white/95 backdrop-blur rounded-2xl p-1.5 flex items-center w-full max-w-xl shadow-md transition-all focus-within:ring-2 focus-within:ring-indigo-500">
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="text"
              placeholder="Search by platform, niche, budget (e.g. monetized tech youtube under 50k)..."
              className="pl-4 flex-1 outline-none text-xs sm:text-sm text-gray-800 bg-transparent"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer transition shadow-xs"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default Hero;

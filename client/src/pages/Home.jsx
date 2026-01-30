import React from 'react';
import Hero from '../components/hero';
import LatestListin from '../components/LatestListing';
import Plan from '../components/Plan';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

function Home() {
  return (
    <>
      <Hero />
      <LatestListin />
      <Plan />
      <CTA />
      <Footer />
    </>
  );
}

export default Home;

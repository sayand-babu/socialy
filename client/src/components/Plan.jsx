import React from 'react';
import Title from './Title';
import { PricingTable } from '@clerk/clerk-react';
function Plan() {
  return (
    <div className="max-w-2xl mx-auto my-20">
      <Title
        title="Chose your Plan"
        description="start for free and level as u grow .find the perfect plan for your content creation platform"
      />
      <div className="mt-14">
        <PricingTable />
      </div>
    </div>
  );
}

export default Plan;

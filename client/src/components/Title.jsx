import React from 'react';

function Title({ title, description }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}

export default Title;

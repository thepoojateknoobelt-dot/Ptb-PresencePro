
import React, { useState } from 'react';
import { MOTIVATIONAL_QUOTES } from '../constants';

export const QuoteFrame: React.FC = () => {
  // Select one random quote on mount and keep it until site reopen/reload
  const [quote] = useState(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  });

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
      <div className="flex flex-col items-center text-center space-y-3">
        <i className="fas fa-quote-left text-indigo-300 text-3xl"></i>
        <p className="text-gray-700 italic font-medium leading-relaxed max-w-2xl">
          "{quote.text}"
        </p>
        <p className="text-indigo-600 font-semibold text-sm">
          — {quote.author}
        </p>
      </div>
    </div>
  );
};

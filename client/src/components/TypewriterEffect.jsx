import React, { useEffect, useState } from 'react';

const TypewriterEffect = ({ text, speed = 100, className = '' }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={`typewriter-container ${className}`}>
      {displayedText}
      <span className="typewriter-cursor">|</span>
      <style>{`
        .typewriter-cursor {
          font-weight: bold;
          color: var(--accent-yellow-dark);
          animation: blink 0.75s step-end infinite;
          margin-left: 2px;
        }
        @keyframes blink {
          from, to { color: transparent }
          50% { color: var(--accent-yellow-dark) }
        }
      `}</style>
    </span>
  );
};

export default TypewriterEffect;

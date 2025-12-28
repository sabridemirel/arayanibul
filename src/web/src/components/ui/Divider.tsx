import React from 'react';

interface DividerProps {
  text?: string;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({ text, className = '' }) => {
  if (text) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex-grow border-t border-border" />
        <span className="px-4 text-sm text-text-secondary">{text}</span>
        <div className="flex-grow border-t border-border" />
      </div>
    );
  }

  return <hr className={`border-t border-border ${className}`} />;
};

export default Divider;

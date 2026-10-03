import React from 'react';

interface LampSwitchProps {
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * LampSwitch has been permanently disabled because Dark Mode has been completely removed.
 * It returns null so it never renders anything.
 */
export const LampSwitch: React.FC<LampSwitchProps> = () => {
  return null;
};

import React from 'react';
import { WaitingDots } from './WaitingDots';

/** "Waiting for the customer to arrive": three amber dots that light up and swell one after another, then start again. */
export const DrivingToGarage: React.FC = () => <WaitingDots color="#f59e0b" />;

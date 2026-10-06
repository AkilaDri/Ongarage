import React from 'react';
import { Sheet as BaseSheet } from '@ongarage/shared';
import { Toast } from './Toast';

/** The shared bottom sheet, with the owner app's toasts shown above it. */
export const Sheet: React.FC<Omit<React.ComponentProps<typeof BaseSheet>, 'overlay'>> = (props) => <BaseSheet {...props} overlay={<Toast topOffset={40} />} />;

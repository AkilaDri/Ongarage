import React from 'react';
import { Sheet as BaseSheet } from '@ongarage/shared';
import { Toast } from './Toast';

/**
 * The shared bottom sheet, with the owner app's toasts shown above it. `overlayExtra` is anything else that must show above the sheet's own content, inside its window (a
 * message box: a window of its own would open behind a full-screen sheet).
 */
export const Sheet: React.FC<Omit<React.ComponentProps<typeof BaseSheet>, 'overlay'> & { overlayExtra?: React.ReactNode }> = ({ overlayExtra, ...props }) => (
  <BaseSheet
    {...props}
    overlay={
      <>
        <Toast topOffset={40} />
        {overlayExtra}
      </>
    }
  />
);

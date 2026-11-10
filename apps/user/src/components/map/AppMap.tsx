import React from 'react';
import { GoogleMap, type Project } from '@ongarage/shared';
import { DirectoryPins } from './DirectoryPins';

type Props = React.ComponentProps<typeof GoogleMap>;

/**
 * The app's map: the shared map, with every Sri Lanka garage pinned on it. Screens draw their own markers through renderOverlay,
 * which sit above the garage pins.
 */
export const AppMap: React.FC<Props> = ({ renderOverlay, ...rest }) => (
  <GoogleMap
    {...rest}
    renderOverlay={(project: Project) => (
      <>
        <DirectoryPins project={project} />
        {renderOverlay?.(project)}
      </>
    )}
  />
);

import React, { useEffect, useState } from 'react';
import type { Garage } from '@ongarage/shared';
import { Sheet } from '../Sheet';
import { GarageTile } from './GarageTile';

/** Every garage in a Home row (or an offer's garages), as full-width tiles. */
export const GarageListSheet: React.FC<{
  list: { title: string; garages: Garage[]; ad?: boolean } | null;
  onClose: () => void;
  onOpen: (g: Garage) => void;
  onSaveChange: (g: Garage, saved: boolean) => void;
}> = ({ list, onClose, onOpen, onSaveChange }) => {
  const [shown, setShown] = useState(list);
  useEffect(() => {
    if (list) setShown(list);
  }, [list]);
  const l = list ?? shown;
  if (!l) return null;
  return (
    <Sheet visible={!!list} title={l.title} subtitle={`ගරාජ ${l.garages.length}`} onClose={onClose}>
      {l.garages.map((g) => (
        <GarageTile key={g.id} garage={g} width="100%" ad={l.ad} onOpen={() => onOpen(g)} onSaveChange={(s) => onSaveChange(g, s)} />
      ))}
    </Sheet>
  );
};

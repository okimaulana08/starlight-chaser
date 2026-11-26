import React, { useEffect, useState } from 'react';
import { getFallbackCardSvg } from '../engine/AssetManager';

interface ArtImageProps {
  kind: 'HERO' | 'RELIC' | 'ENEMY';
  id: string;
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ArtImage: React.FC<ArtImageProps> = ({ kind, id, src, alt, className, style }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, id]);

  return (
    <img
      src={failed ? getFallbackCardSvg(kind, id) : src}
      onError={() => setFailed(true)}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
    />
  );
};

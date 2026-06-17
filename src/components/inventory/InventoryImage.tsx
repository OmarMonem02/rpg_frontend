"use client";

import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

type InventoryImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "onError"
> & {
  src: string;
  fallback?: ReactNode;
  onLoadError?: () => void;
};

export function InventoryImagePlaceholder({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden>
      {name.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

export function InventoryImage({
  src,
  alt = "",
  className,
  fallback = null,
  onLoadError,
  ...rest
}: InventoryImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setFailed(true);
        onLoadError?.();
      }}
      {...rest}
    />
  );
}

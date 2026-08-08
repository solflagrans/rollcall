"use client";

import { useCallback, useRef, useState } from "react";

export function useActionLock() {
  const lockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);

  const run = useCallback(async <Result>(operation: () => Promise<Result>) => {
    if (lockedRef.current) return undefined;

    lockedRef.current = true;
    setIsLocked(true);
    try {
      return await operation();
    } finally {
      lockedRef.current = false;
      setIsLocked(false);
    }
  }, []);

  return { isLocked, run };
}

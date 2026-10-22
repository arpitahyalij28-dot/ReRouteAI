import React, { useState, useEffect } from 'react';

export default function CountUp({
  value,
  durationMs = 600,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTime = null;
    const startVal = displayValue;
    const delta = value - startVal;
    if (delta === 0) return;

    let animId;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const fraction = Math.min(progress / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - fraction, 3);
      const current = startVal + delta * eased;

      setDisplayValue(current);

      if (fraction < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, durationMs]);

  const formatted = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

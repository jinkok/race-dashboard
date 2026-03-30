import React, { useEffect, useRef } from 'react';

const Icon = ({ name, size = 16, className = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons({
        root: ref.current,
        name,
        attrs: { width: size, height: size, class: className },
      });
    }
  }, [name, className, size]);
  return <i ref={ref} data-lucide={name}></i>;
};

export default Icon;


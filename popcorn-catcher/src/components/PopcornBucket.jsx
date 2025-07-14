// components/PopcornBucket.jsx
import React, { forwardRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

const PopcornBucket = forwardRef((props, ref) => {
  const { viewport } = useThree();
  const [x, setX] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      setX(ndcX * viewport.width / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [viewport.width]);

  return (
    <mesh ref={ref} position={[x, -viewport.height / 2 + 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
});

export default PopcornBucket;

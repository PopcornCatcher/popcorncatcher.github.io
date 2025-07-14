// components/FallingItem.jsx
import React from 'react';

export default function FallingItem({ position, type }) {
  const color = type === 'gold' ? 'yellow' : 'brown';

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

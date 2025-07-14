// hooks/useGameLogic.js
import { useRef, useState, useCallback } from 'react';
import { Vector3 } from 'three';

const spawnInterval = 1000; // ms
const fallSpeed = 0.02;
const bucketWidth = 1.0;

export default function useGameLogic() {
  const [items, setItems] = useState([]);
  const bucketRef = useRef();
  const [lastSpawn, setLastSpawn] = useState(Date.now());
  const [score, setScore] = useState(0);

  const update = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastSpawn;

    // Spawn new item
    if (elapsed > spawnInterval) {
      const x = (Math.random() - 0.5) * 6; // spawn within viewport
      const newItem = {
        position: new Vector3(x, 3, 0),
        type: Math.random() > 0.5 ? 'gold' : 'burnt',
      };
      setItems((prev) => [...prev, newItem]);
      setLastSpawn(now);
    }

    // Move and filter items
    setItems((prev) => {
      const updated = [];
      for (let item of prev) {
        item.position.y -= fallSpeed;
        if (item.position.y < -2.5) continue; // missed

        // Check catch
        if (bucketRef.current) {
          const bucketX = bucketRef.current.position.x;
          if (
            Math.abs(item.position.y + 2.4) < 0.1 &&
            Math.abs(item.position.x - bucketX) < bucketWidth / 2
          ) {
            setScore((s) => s + 1);
            continue; // caught
          }
        }
        updated.push(item);
      }
      return updated;
    });
  }, [lastSpawn]);

  return { items, bucketRef, score, update };
}

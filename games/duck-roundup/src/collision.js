// Shared collision helpers: push a circle out of rect/circle obstacles.
// Used by both the dog and the ducks so they slide along walls instead of clipping.

export function resolveCollisions(position, radius, obstacles) {
    for (const o of obstacles) {
        if (o.kind === 'rect') {
            // Closest point on rect to circle center
            const dx = position.x - o.x;
            const dz = position.z - o.z;
            const cx = Math.max(-o.hw, Math.min(o.hw, dx));
            const cz = Math.max(-o.hd, Math.min(o.hd, dz));
            const ox = dx - cx;
            const oz = dz - cz;
            const distSq = ox*ox + oz*oz;
            if (distSq < radius * radius) {
                const dist = Math.sqrt(distSq);
                if (dist > 0.0001) {
                    const push = (radius - dist) / dist;
                    position.x += ox * push;
                    position.z += oz * push;
                } else {
                    // Center inside rect — push out along nearest edge
                    const distLeft   = o.hw + dx;
                    const distRight  = o.hw - dx;
                    const distTop    = o.hd + dz;
                    const distBottom = o.hd - dz;
                    const min = Math.min(distLeft, distRight, distTop, distBottom);
                    if (min === distLeft)        position.x = o.x - o.hw - radius;
                    else if (min === distRight)  position.x = o.x + o.hw + radius;
                    else if (min === distTop)    position.z = o.z - o.hd - radius;
                    else                         position.z = o.z + o.hd + radius;
                }
            }
        } else if (o.kind === 'circle') {
            const dx = position.x - o.x;
            const dz = position.z - o.z;
            const dist = Math.hypot(dx, dz);
            const minDist = radius + o.r;
            if (dist < minDist && dist > 0.0001) {
                const push = (minDist - dist) / dist;
                position.x += dx * push;
                position.z += dz * push;
            }
        }
    }
}

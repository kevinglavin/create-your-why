// LevelBuilder: assembles the farmyard from primitives.
// Returns the root group plus a list of obstacles ({ type, x, z, ... })
// for the dog/duck movement code to test against.

import * as THREE from 'three';
import { WORLD, COOP, COLORS } from './constants.js';

export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.obstacles = []; // { kind: 'rect'|'circle', x, z, hw?, hd?, r? }
        scene.add(this.root);
    }

    build() {
        this._buildGround();
        this._buildFences();
        this._buildCoop();
        this._buildBales();
        this._buildTrees();
        this._buildProps();
        return { root: this.root, obstacles: this.obstacles };
    }

    _buildGround() {
        // Main packed-earth ground
        const groundGeo = new THREE.PlaneGeometry(WORLD.width, WORLD.depth, 1, 1);
        const groundMat = new THREE.MeshStandardMaterial({
            color: COLORS.groundDirt,
            roughness: 0.95,
            metalness: 0.0,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.root.add(ground);

        // Straw patch in front of coop entrance
        const strawGeo = new THREE.PlaneGeometry(8, 4);
        const strawMat = new THREE.MeshStandardMaterial({
            color: COLORS.groundStraw,
            roughness: 1.0,
        });
        const straw = new THREE.Mesh(strawGeo, strawMat);
        straw.rotation.x = -Math.PI / 2;
        straw.position.set(0, 0.01, 9.5);
        straw.receiveShadow = true;
        this.root.add(straw);

        // A second darker patch under the dog start area
        const patch2 = new THREE.Mesh(
            new THREE.CircleGeometry(3, 16),
            new THREE.MeshStandardMaterial({ color: 0x6f5530, roughness: 1.0 }),
        );
        patch2.rotation.x = -Math.PI / 2;
        patch2.position.set(2, 0.01, -10);
        patch2.receiveShadow = true;
        this.root.add(patch2);
    }

    _buildFences() {
        // Perimeter fence — line of posts + 2 horizontal rails.
        // Acts as visual boundary; movement is clamped via BOUNDS, not collision here.
        const postMat = new THREE.MeshStandardMaterial({ color: COLORS.fencePost, roughness: 0.9 });
        const railMat = new THREE.MeshStandardMaterial({ color: COLORS.fenceRail, roughness: 0.9 });
        const postGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);

        const halfW = WORLD.width / 2;
        const halfD = WORLD.depth / 2;
        const spacing = 2.0;

        const addPost = (x, z) => {
            const m = new THREE.Mesh(postGeo, postMat);
            m.position.set(x, 0.6, z);
            m.castShadow = true;
            m.receiveShadow = true;
            this.root.add(m);
        };
        const addRailX = (z, fromX, toX, y) => {
            const len = Math.abs(toX - fromX);
            const g = new THREE.BoxGeometry(len, 0.08, 0.06);
            const m = new THREE.Mesh(g, railMat);
            m.position.set((fromX + toX) / 2, y, z);
            m.castShadow = true;
            this.root.add(m);
        };
        const addRailZ = (x, fromZ, toZ, y) => {
            const len = Math.abs(toZ - fromZ);
            const g = new THREE.BoxGeometry(0.06, 0.08, len);
            const m = new THREE.Mesh(g, railMat);
            m.position.set(x, y, (fromZ + toZ) / 2);
            m.castShadow = true;
            this.root.add(m);
        };

        // Side fences (along z, full length)
        for (let z = -halfD; z <= halfD; z += spacing) {
            addPost(-halfW, z);
            addPost( halfW, z);
        }
        addRailZ(-halfW, -halfD, halfD, 0.45);
        addRailZ(-halfW, -halfD, halfD, 0.95);
        addRailZ( halfW, -halfD, halfD, 0.45);
        addRailZ( halfW, -halfD, halfD, 0.95);

        // South fence (player side, full)
        for (let x = -halfW; x <= halfW; x += spacing) addPost(x, -halfD);
        addRailX(-halfD, -halfW, halfW, 0.45);
        addRailX(-halfD, -halfW, halfW, 0.95);

        // North fence flanks the coop on either side
        const coopHalfW = COOP.width / 2 + 0.5;
        for (let x = -halfW; x <= -coopHalfW; x += spacing) addPost(x, halfD);
        for (let x =  coopHalfW; x <=  halfW; x += spacing) addPost(x, halfD);
        addRailX( halfD, -halfW, -coopHalfW, 0.45);
        addRailX( halfD, -halfW, -coopHalfW, 0.95);
        addRailX( halfD,  coopHalfW,  halfW, 0.45);
        addRailX( halfD,  coopHalfW,  halfW, 0.95);
    }

    _buildCoop() {
        const cx = COOP.position.x;
        const cz = COOP.position.z;
        const w = COOP.width;
        const d = COOP.depth;
        const h = COOP.height;
        const door = COOP.doorWidth;

        const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.coopFrame, roughness: 0.85 });
        const roofMat  = new THREE.MeshStandardMaterial({ color: COLORS.coopRoof, roughness: 0.7, side: THREE.DoubleSide });
        const meshMat  = new THREE.MeshStandardMaterial({ color: COLORS.coopMesh, roughness: 0.6 });
        const interiorMat = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 1.0 });

        // Floor of coop (slightly raised so the parked ducks stand on it)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), interiorMat);
        floor.position.set(cx, 0.05, cz);
        floor.receiveShadow = true;
        this.root.add(floor);

        // Side walls (left/right)
        const sideGeo = new THREE.BoxGeometry(0.2, h, d);
        const left = new THREE.Mesh(sideGeo, frameMat);
        left.position.set(cx - w/2, h/2, cz);
        left.castShadow = true;
        this.root.add(left);
        const right = new THREE.Mesh(sideGeo, frameMat);
        right.position.set(cx + w/2, h/2, cz);
        right.castShadow = true;
        this.root.add(right);

        // Back wall (north-facing)
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), frameMat);
        back.position.set(cx, h/2, cz + d/2);
        back.castShadow = true;
        this.root.add(back);

        // Hoop roof: half-cylinder spanning the coop length
        const roofRadius = w / 2 + 0.1;
        const roofGeo = new THREE.CylinderGeometry(
            roofRadius, roofRadius, d + 0.4, 20, 1, true,
            0, Math.PI, // half cylinder
        );
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.z = -Math.PI / 2;     // flat side down
        roof.position.set(cx, h, cz);
        roof.castShadow = true;
        this.root.add(roof);

        // Front wall: two stub frames flanking the doorway, with wire-mesh suggested by crossed slats
        const frontStubW = (w - door) / 2;
        const frontGeo = new THREE.BoxGeometry(frontStubW, h, 0.18);
        const stubL = new THREE.Mesh(frontGeo, frameMat);
        stubL.position.set(cx - door/2 - frontStubW/2, h/2, cz - d/2);
        stubL.castShadow = true;
        this.root.add(stubL);
        const stubR = new THREE.Mesh(frontGeo, frameMat);
        stubR.position.set(cx + door/2 + frontStubW/2, h/2, cz - d/2);
        stubR.castShadow = true;
        this.root.add(stubR);

        // Mesh slats over each stub (vertical + a couple horizontal)
        this._addMeshSlats(stubL.position, frontStubW, h, meshMat);
        this._addMeshSlats(stubR.position, frontStubW, h, meshMat);

        // Door header beam
        const header = new THREE.Mesh(new THREE.BoxGeometry(door + 0.2, 0.3, 0.2), frameMat);
        header.position.set(cx, h - 0.3, cz - d/2);
        header.castShadow = true;
        this.root.add(header);

        // Side walls of coop are obstacles for ducks (they should enter through the door)
        this.obstacles.push({ kind: 'rect', x: cx - w/2, z: cz, hw: 0.3, hd: d/2 + 0.2 });
        this.obstacles.push({ kind: 'rect', x: cx + w/2, z: cz, hw: 0.3, hd: d/2 + 0.2 });
        this.obstacles.push({ kind: 'rect', x: cx,       z: cz + d/2, hw: w/2, hd: 0.3 });
        // Front-wall stubs as obstacles
        this.obstacles.push({ kind: 'rect',
            x: cx - door/2 - frontStubW/2,
            z: cz - d/2,
            hw: frontStubW/2,
            hd: 0.3,
        });
        this.obstacles.push({ kind: 'rect',
            x: cx + door/2 + frontStubW/2,
            z: cz - d/2,
            hw: frontStubW/2,
            hd: 0.3,
        });
    }

    _addMeshSlats(centerPos, w, h, mat) {
        const slatT = 0.04;
        // 3 verticals
        for (let i = -1; i <= 1; i++) {
            const x = centerPos.x + (i * w / 4);
            const v = new THREE.Mesh(new THREE.BoxGeometry(slatT, h - 0.3, slatT), mat);
            v.position.set(x, h / 2, centerPos.z + 0.11);
            this.root.add(v);
        }
        // 2 horizontals
        for (let i = 0; i < 2; i++) {
            const y = (h * 0.35) + i * (h * 0.35);
            const hbar = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, slatT, slatT), mat);
            hbar.position.set(centerPos.x, y, centerPos.z + 0.11);
            this.root.add(hbar);
        }
    }

    _buildBales() {
        const baleMat = new THREE.MeshStandardMaterial({ color: COLORS.bale, roughness: 1.0 });
        const baleGeo = new THREE.BoxGeometry(1.4, 0.9, 0.9);
        const placements = [
            { x: -4.5, z: 11.0 },
            { x:  4.5, z: 11.0 },
            { x: -2.0, z: -4.0 },
        ];
        for (const p of placements) {
            const m = new THREE.Mesh(baleGeo, baleMat);
            m.position.set(p.x, 0.45, p.z);
            m.castShadow = true;
            m.receiveShadow = true;
            this.root.add(m);
            this.obstacles.push({ kind: 'rect', x: p.x, z: p.z, hw: 0.7, hd: 0.45 });
        }
    }

    _buildTrees() {
        // Cluster trees just outside the fence on the long sides for "wooded edge" feel
        const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.treeTrunk, roughness: 1.0 });
        const leafMat  = new THREE.MeshStandardMaterial({ color: COLORS.treeLeaves, roughness: 0.9 });

        const placeTree = (x, z) => {
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.32, 1.6, 8),
                trunkMat,
            );
            trunk.position.set(x, 0.8, z);
            trunk.castShadow = true;
            this.root.add(trunk);

            const leaves = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.3, 0),
                leafMat,
            );
            leaves.position.set(x, 2.4, z);
            leaves.castShadow = true;
            this.root.add(leaves);

            // Smaller leaf bunch
            const top = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.85, 0),
                leafMat,
            );
            top.position.set(x + 0.3, 3.3, z - 0.2);
            top.castShadow = true;
            this.root.add(top);
        };

        const halfW = WORLD.width / 2;
        const halfD = WORLD.depth / 2;
        for (let z = -halfD + 1; z <= halfD - 1; z += 3) {
            placeTree(-halfW - 1.4 - Math.random() * 0.6, z + (Math.random() - 0.5));
            placeTree( halfW + 1.4 + Math.random() * 0.6, z + (Math.random() - 0.5));
        }
        // Wood line behind coop too
        for (let x = -halfW - 1; x <= halfW + 1; x += 2.5) {
            placeTree(x + (Math.random()-0.5), halfD + 1.6 + Math.random() * 0.6);
        }
    }

    _buildProps() {
        // Water tub
        const tub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16),
            new THREE.MeshStandardMaterial({ color: 0x554a3a, roughness: 0.9 }),
        );
        tub.position.set(-5.5, 0.2, 2);
        tub.castShadow = true;
        this.root.add(tub);
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: COLORS.waterTub, roughness: 0.3, metalness: 0.0 }),
        );
        water.position.set(-5.5, 0.42, 2);
        this.root.add(water);
        this.obstacles.push({ kind: 'circle', x: -5.5, z: 2, r: 0.7 });

        // Feed bucket
        const bucket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.45, 0.55, 12),
            new THREE.MeshStandardMaterial({ color: COLORS.feedBucket, roughness: 0.6, metalness: 0.3 }),
        );
        bucket.position.set(5.0, 0.275, -1.5);
        bucket.castShadow = true;
        this.root.add(bucket);
        this.obstacles.push({ kind: 'circle', x: 5.0, z: -1.5, r: 0.45 });
    }
}

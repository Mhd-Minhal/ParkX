/**
 * PARKX — Smart Parking. Simple Access.
 * Futuristic 3D Product-Launch Engine & Controller
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. STARTUP ANIMATION LOADER (< 2 SECONDS)
    // =========================================================================
    const startupLoader = document.getElementById('startupLoader');
    const skipLoaderBtn = document.getElementById('skipLoaderBtn');

    function dismissLoader() {
        if (!startupLoader) return;
        startupLoader.style.opacity = '0';
        setTimeout(() => {
            startupLoader.classList.add('hidden');
        }, 500);
    }

    if (startupLoader) {
        const loaderTimer = setTimeout(dismissLoader, 1800);
        if (skipLoaderBtn) {
            skipLoaderBtn.addEventListener('click', () => {
                clearTimeout(loaderTimer);
                dismissLoader();
            });
        }
    }

    // =========================================================================
    // 2. CUSTOM DESKTOP CURSOR CONTROLLER
    // =========================================================================
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');
    const cursorViewTag = document.getElementById('cursorViewTag');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (cursorDot) {
            cursorDot.style.left = `${mouseX}px`;
            cursorDot.style.top = `${mouseY}px`;
        }
    });

    function animateCursor() {
        // Smooth lerp for outer ring
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;

        if (cursorRing) {
            cursorRing.style.left = `${ringX}px`;
            cursorRing.style.top = `${ringY}px`;
        }

        requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Cursor interactions
    document.querySelectorAll('a, button, [data-cursor="hover"]').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    const hero3DWrapper = document.getElementById('hero3DWrapper');
    if (hero3DWrapper) {
        hero3DWrapper.addEventListener('mouseenter', () => document.body.classList.add('cursor-3d'));
        hero3DWrapper.addEventListener('mouseleave', () => document.body.classList.remove('cursor-3d'));
    }

    // =========================================================================
    // 3. THREE.JS INTERACTIVE 3D MINIATURE PARKING ENVIRONMENT (REALISTIC KERALA)
    // =========================================================================
    const container = document.getElementById('threejs-canvas-container');
    const slotHoverHUD = document.getElementById('slotHoverHUD');
    const hudSlotId = document.getElementById('hudSlotId');
    const hudSlotStatus = document.getElementById('hudSlotStatus');
    const hudSensorStatus = document.getElementById('hudSensorStatus');

    let scene, camera, renderer, controls;
    let slotMeshes = {};
    let barrierArmMesh;
    let autonomousCar3D;
    let parkedCarP02Mesh;
    let car3DBrakeLights = [];
    let car3DReverseLights = [];
    let raycaster, mouse;
    let hoveredSlot = null;

    if (container && typeof THREE !== 'undefined') {
        initThreeDScene();
    }

    // Helper: Procedural Asphalt Noise Texture
    function createAsphaltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#111417';
        ctx.fillRect(0, 0, 512, 512);

        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 28;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let j = 0; j < 2500; j++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 3);
        return texture;
    }

    // Helper: Stenciled Painted Text Texture for Stalls
    function createSlotTextTexture(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 256, 256);
        ctx.font = 'bold 74px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // Helper: Kerala Coconut Palm (Curved ringed trunk, 14 arching fronds, coconuts)
    function createCoconutPalm(x, z, scale = 1, leanAngle = 0.12, leanDir = 0) {
        const palmGroup = new THREE.Group();
        palmGroup.position.set(x, 0, z);

        const trunkSegments = 10;
        const totalHeight = 11 * scale;
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x5a483a,
            roughness: 0.88,
            metalness: 0.08
        });

        let currentPos = new THREE.Vector3(0, 0, 0);
        const trunkRadiusBase = 0.48 * scale;
        const segmentHeight = totalHeight / trunkSegments;

        for (let i = 0; i < trunkSegments; i++) {
            const t = i / trunkSegments;
            const r1 = trunkRadiusBase * (1 - t * 0.45);
            const r2 = trunkRadiusBase * (1 - (t + 1 / trunkSegments) * 0.45);
            const segGeo = new THREE.CylinderGeometry(r2, r1, segmentHeight, 10);
            const seg = new THREE.Mesh(segGeo, trunkMat);
            seg.castShadow = true;
            seg.receiveShadow = true;

            const lean = Math.sin(t * Math.PI * 0.5) * leanAngle * segmentHeight * 4.2;
            seg.position.set(
                currentPos.x + Math.cos(leanDir) * lean,
                currentPos.y + segmentHeight * 0.5,
                currentPos.z + Math.sin(leanDir) * lean
            );
            seg.rotation.z = -Math.cos(leanDir) * (t * leanAngle);
            seg.rotation.x = Math.sin(leanDir) * (t * leanAngle);
            palmGroup.add(seg);

            currentPos.set(
                currentPos.x + Math.cos(leanDir) * lean,
                currentPos.y + segmentHeight,
                currentPos.z + Math.sin(leanDir) * lean
            );
        }

        // Crown bulb
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.55 * scale, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3d501c, roughness: 0.85 })
        );
        bulb.position.copy(currentPos);
        palmGroup.add(bulb);

        // 14 Feather Fronds (Arching outward and downward under gravity)
        const frondMat = new THREE.MeshStandardMaterial({
            color: 0x2e6b18,
            roughness: 0.65,
            side: THREE.DoubleSide
        });

        const frondCount = 14;
        for (let j = 0; j < frondCount; j++) {
            const angle = (j / frondCount) * Math.PI * 2;
            const frondGroup = new THREE.Group();
            frondGroup.position.copy(currentPos);
            frondGroup.rotation.y = angle;

            const leafCurve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(2.6 * scale, 1.2 * scale, 0),
                new THREE.Vector3(4.9 * scale, -1.9 * scale, 0)
            );

            const ribbonGeo = new THREE.PlaneGeometry(4.6 * scale, 0.65 * scale, 8, 1);
            const pos = ribbonGeo.attributes.position;
            for (let k = 0; k < pos.count; k++) {
                const vx = pos.getX(k);
                const normX = (vx + 2.3 * scale) / (4.6 * scale);
                const pt = leafCurve.getPoint(Math.max(0, Math.min(1, normX)));
                pos.setX(k, pt.x);
                pos.setY(k, pt.y);
            }
            ribbonGeo.computeVertexNormals();

            const leafMesh = new THREE.Mesh(ribbonGeo, frondMat);
            leafMesh.castShadow = true;
            frondGroup.add(leafMesh);
            palmGroup.add(frondGroup);
        }

        // Coconuts cluster
        const nutMat = new THREE.MeshStandardMaterial({ color: 0x546b25, roughness: 0.75 });
        for (let c = 0; c < 5; c++) {
            const nutGeo = new THREE.SphereGeometry(0.24 * scale, 8, 8);
            nutGeo.scale(1, 1.25, 1);
            const nut = new THREE.Mesh(nutGeo, nutMat);
            const nutAngle = (c / 5) * Math.PI * 2;
            nut.position.set(
                currentPos.x + Math.cos(nutAngle) * 0.42 * scale,
                currentPos.y - 0.22 * scale,
                currentPos.z + Math.sin(nutAngle) * 0.42 * scale
            );
            palmGroup.add(nut);
        }

        return palmGroup;
    }

    // Helper: Kerala Banana Plant (Vazha - Broad drooping emerald leaves)
    function createBananaPlant(x, z, scale = 1) {
        const plantGroup = new THREE.Group();
        plantGroup.position.set(x, 0, z);

        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 1.6 * scale, 8),
            new THREE.MeshStandardMaterial({ color: 0x5c8e2b, roughness: 0.7 })
        );
        stem.position.y = 0.8 * scale;
        stem.castShadow = true;
        plantGroup.add(stem);

        const leafMat = new THREE.MeshStandardMaterial({
            color: 0x3d8c1c,
            roughness: 0.55,
            side: THREE.DoubleSide
        });

        const leafCount = 7;
        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2;
            const leafLength = 2.4 * scale;
            const leafWidth = 0.85 * scale;

            const leafCurve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(1.1 * scale, 0.85 * scale, 0),
                new THREE.Vector3(leafLength, -0.65 * scale, 0)
            );

            const leafGeo = new THREE.PlaneGeometry(leafLength, leafWidth, 6, 1);
            const pos = leafGeo.attributes.position;
            for (let k = 0; k < pos.count; k++) {
                const vx = pos.getX(k);
                const normX = (vx + leafLength * 0.5) / leafLength;
                const pt = leafCurve.getPoint(Math.max(0, Math.min(1, normX)));
                pos.setX(k, pt.x);
                pos.setY(k, pt.y);
            }
            leafGeo.computeVertexNormals();

            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(0, 1.4 * scale, 0);
            leaf.rotation.y = angle;
            leaf.castShadow = true;
            plantGroup.add(leaf);
        }

        return plantGroup;
    }

    // Helper: Kerala Areca Palm Cluster (Slender ringed trunks with pinnate fronds)
    function createArecaPalmCluster(x, z, scale = 1) {
        const cluster = new THREE.Group();
        cluster.position.set(x, 0, z);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x697552, roughness: 0.8 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x38851e, roughness: 0.6, side: THREE.DoubleSide });

        const stems = [
            { dx: 0, dz: 0, h: 5.2, rot: 0.05 },
            { dx: -0.32, dz: 0.22, h: 4.6, rot: -0.08 },
            { dx: 0.28, dz: -0.18, h: 4.0, rot: 0.06 }
        ];

        stems.forEach(s => {
            const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, s.h * scale, 8),
                trunkMat
            );
            stem.position.set(s.dx * scale, (s.h * 0.5) * scale, s.dz * scale);
            stem.rotation.z = s.rot;
            stem.castShadow = true;
            cluster.add(stem);

            for (let f = 0; f < 7; f++) {
                const fAngle = (f / 7) * Math.PI * 2;
                const leaf = new THREE.Mesh(
                    new THREE.PlaneGeometry(2.4 * scale, 0.42 * scale, 4, 1),
                    leafMat
                );
                leaf.position.set(s.dx * scale, s.h * scale, s.dz * scale);
                leaf.rotation.y = fAngle;
                leaf.rotation.z = -0.42;
                leaf.castShadow = true;
                cluster.add(leaf);
            }
        });

        return cluster;
    }

    // Helper: Tropical Bush
    function createTropicalBush(x, z, scale = 1) {
        const bush = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.85 * scale, 1),
            new THREE.MeshStandardMaterial({ color: 0x2f6b1b, roughness: 0.75 })
        );
        bush.position.set(x, 0.55 * scale, z);
        bush.scale.set(1.2, 0.8, 1.1);
        bush.castShadow = true;
        return bush;
    }

    // Helper: Realistic Modern Passenger Car (Sedan / Coupe with realistic proportions)
    function createRealisticPassengerCar(bodyColor, isAutonomousCar = false) {
        const carGroup = new THREE.Group();

        // 1. High-Gloss Metallic Paint Material
        const paintMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.18,
            metalness: 0.75
        });

        // 2. Dark Trim Material (Diffusers, grilles, pillars)
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x12161b,
            roughness: 0.6,
            metalness: 0.25
        });

        // 3. Tinted Glass Material
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x070c14,
            roughness: 0.05,
            metalness: 0.9,
            transparent: true,
            opacity: 0.88
        });

        // 4. Chassis Base
        const floor = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 4.3), trimMat);
        floor.position.y = 0.32;
        floor.castShadow = true;
        carGroup.add(floor);

        // 5. Sculpted Lower Body
        const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.44, 4.3), paintMat);
        bodyLower.position.y = 0.55;
        bodyLower.castShadow = true;
        bodyLower.receiveShadow = true;
        carGroup.add(bodyLower);

        // 6. Aerodynamic Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.26, 1.4), paintMat);
        hood.position.set(0, 0.68, 1.35);
        hood.rotation.x = -0.06;
        hood.castShadow = true;
        carGroup.add(hood);

        // 7. Front Bumper & Lower Grille
        const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.34, 0.35), paintMat);
        bumper.position.set(0, 0.44, 2.15);
        bumper.castShadow = true;
        carGroup.add(bumper);

        const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.1), trimMat);
        grille.position.set(0, 0.34, 2.32);
        carGroup.add(grille);

        // 8. Rear Bumper & Diffuser
        const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.38, 0.35), paintMat);
        rearBumper.position.set(0, 0.48, -2.15);
        rearBumper.castShadow = true;
        carGroup.add(rearBumper);

        // 9. Rear Trunk Deck
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.26, 0.85), paintMat);
        trunk.position.set(0, 0.74, -1.65);
        trunk.castShadow = true;
        carGroup.add(trunk);

        // 10. Cabin Glasshouse (Windshield, Roof, Windows)
        // Windshield
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.64, 0.08), glassMat);
        windshield.position.set(0, 1.05, 0.75);
        windshield.rotation.x = 0.58;
        carGroup.add(windshield);

        // Panoramic Glass Roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.06, 1.7), glassMat);
        roof.position.set(0, 1.24, -0.1);
        roof.castShadow = true;
        carGroup.add(roof);

        // Rear Windshield
        const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.64, 0.08), glassMat);
        rearGlass.position.set(0, 1.05, -1.05);
        rearGlass.rotation.x = -0.52;
        carGroup.add(rearGlass);

        // Side Windows
        const sideWindowL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.6), glassMat);
        sideWindowL.position.set(-0.75, 1.02, -0.1);
        carGroup.add(sideWindowL);

        const sideWindowR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.6), glassMat);
        sideWindowR.position.set(0.75, 1.02, -0.1);
        carGroup.add(sideWindowR);

        // B-Pillars
        const bPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.12), trimMat);
        bPillarL.position.set(-0.75, 1.02, -0.1);
        carGroup.add(bPillarL);

        const bPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.12), trimMat);
        bPillarR.position.set(0.75, 1.02, -0.1);
        carGroup.add(bPillarR);

        // 11. Side Mirrors
        const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.12), paintMat);
        mirrorL.position.set(-0.95, 0.94, 0.72);
        carGroup.add(mirrorL);

        const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.12), paintMat);
        mirrorR.position.set(0.95, 0.94, 0.72);
        carGroup.add(mirrorR);

        // 12. 4 Wheels (Touching ground perfectly at Y = 0.06 on asphalt)
        const wheelPositions = [
            { x: -0.92, z: 1.35 },
            { x: 0.92, z: 1.35 },
            { x: -0.92, z: -1.35 },
            { x: 0.92, z: -1.35 }
        ];

        const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 20);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.85 });

        const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.25, 12);
        rimGeo.rotateZ(Math.PI / 2);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });

        const brakeMat = new THREE.MeshStandardMaterial({
            color: isAutonomousCar ? 0x00f2fe : 0xef4444,
            metalness: 0.6,
            roughness: 0.3
        });

        wheelPositions.forEach(wp => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wp.x, 0.36, wp.z);

            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.castShadow = true;
            wheelGroup.add(tire);

            const rim = new THREE.Mesh(rimGeo, rimMat);
            wheelGroup.add(rim);

            const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), brakeMat);
            caliper.position.set(wp.x > 0 ? -0.06 : 0.06, 0.12, 0);
            wheelGroup.add(caliper);

            carGroup.add(wheelGroup);
        });

        // 13. LED Projector Headlights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const headlightL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.08), headlightMat);
        headlightL.position.set(-0.64, 0.64, 2.16);
        carGroup.add(headlightL);

        const headlightR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.08), headlightMat);
        headlightR.position.set(0.64, 0.64, 2.16);
        carGroup.add(headlightR);

        // 14. Rear LED Taillight Bar
        const taillightMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xef4444,
            emissiveIntensity: 0.85
        });
        const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.06), taillightMat);
        taillight.position.set(0, 0.74, -2.18);
        carGroup.add(taillight);

        // Reverse backup lights
        const reverseLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const reverseLightL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), reverseLightMat);
        reverseLightL.position.set(-0.4, 0.74, -2.19);
        carGroup.add(reverseLightL);

        const reverseLightR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), reverseLightMat);
        reverseLightR.position.set(0.4, 0.74, -2.19);
        carGroup.add(reverseLightR);

        if (isAutonomousCar) {
            car3DBrakeLights.push(taillight);
            car3DReverseLights.push(reverseLightL, reverseLightR);

            // Autonomous LIDAR Pod on Roof
            const lidarBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14, 0.16, 0.08, 16),
                new THREE.MeshStandardMaterial({ color: 0x11161b, metalness: 0.8 })
            );
            lidarBase.position.set(0, 1.3, 0.35);
            carGroup.add(lidarBase);

            const lidarRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.11, 0.02, 8, 16),
                new THREE.MeshBasicMaterial({ color: 0x00f2fe })
            );
            lidarRing.rotation.x = Math.PI / 2;
            lidarRing.position.set(0, 1.34, 0.35);
            carGroup.add(lidarRing);
        }

        return carGroup;
    }

    function initThreeDScene() {
        const width = container.clientWidth || 550;
        const height = container.clientHeight || 480;

        // Scene with Kerala atmospheric haze
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x18242e, 0.016);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 13, 17);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x0e1720, 1);
        container.appendChild(renderer.domElement);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2.08;
            controls.minDistance = 7;
            controls.maxDistance = 30;
            controls.target.set(0, 0.8, 0);
        }

        // ================= KERALA DAYLIGHT & LIGHTING =================
        // Warm Directional Sunlight
        const sunLight = new THREE.DirectionalLight(0xfff6e6, 1.45);
        sunLight.position.set(16, 26, 14);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 65;
        sunLight.shadow.camera.left = -18;
        sunLight.shadow.camera.right = 18;
        sunLight.shadow.camera.top = 18;
        sunLight.shadow.camera.bottom = -18;
        sunLight.shadow.bias = -0.0004;
        scene.add(sunLight);

        // Sky & Foliage Ambient Fill (HemisphereLight)
        const hemiLight = new THREE.HemisphereLight(0x8cd3ff, 0x3d5022, 0.65);
        scene.add(hemiLight);

        // Soft ambient fill
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(ambientLight);

        // ================= KERALA TERRAIN & ENVIRONMENT =================
        // 1. Broad Tropical Ground Plane (Grass + Soil)
        const terrainGeo = new THREE.PlaneGeometry(90, 90);
        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0x1f2e16,
            roughness: 0.95,
            metalness: 0.05
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = 0;
        terrain.receiveShadow = true;
        scene.add(terrain);

        // 2. Red Laterite Soil Border (Kerala Earth) around the parking installation
        const lateriteGeo = new THREE.PlaneGeometry(24, 17);
        const lateriteMat = new THREE.MeshStandardMaterial({
            color: 0x7a301a,
            roughness: 0.92,
            metalness: 0.05
        });
        const lateriteBorder = new THREE.Mesh(lateriteGeo, lateriteMat);
        lateriteBorder.rotation.x = -Math.PI / 2;
        lateriteBorder.position.set(0, 0.01, 0);
        lateriteBorder.receiveShadow = true;
        scene.add(lateriteBorder);

        // 3. Deep Black Asphalt Parking Slab
        const asphaltTex = createAsphaltTexture();
        const groundGeo = new THREE.BoxGeometry(20.4, 0.12, 14.4);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x14171a,
            roughness: 0.82,
            metalness: 0.15,
            map: asphaltTex
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = 0.06;
        ground.receiveShadow = true;
        scene.add(ground);

        // Concrete Border Curbs
        const curbMat = new THREE.MeshStandardMaterial({ color: 0x828c94, roughness: 0.75 });
        const backCurb = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.24, 0.35), curbMat);
        backCurb.position.set(0, 0.18, -7.2);
        backCurb.castShadow = true;
        backCurb.receiveShadow = true;
        scene.add(backCurb);

        const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 14.6), curbMat);
        leftCurb.position.set(-10.2, 0.18, 0);
        leftCurb.castShadow = true;
        leftCurb.receiveShadow = true;
        scene.add(leftCurb);

        const rightCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 14.6), curbMat);
        rightCurb.position.set(10.2, 0.18, 0);
        rightCurb.castShadow = true;
        rightCurb.receiveShadow = true;
        scene.add(rightCurb);

        // Driving Lane Center Dashed Line on Asphalt
        const laneGeo = new THREE.PlaneGeometry(19, 0.14);
        const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.4, transparent: true });
        const laneLine = new THREE.Mesh(laneGeo, laneMat);
        laneLine.rotation.x = -Math.PI / 2;
        laneLine.position.set(0, 0.125, 4.2);
        scene.add(laneLine);

        // Traditional Kerala Boundary Wall in Background
        const wallGroup = new THREE.Group();
        wallGroup.position.set(0, 0, -8.6);

        const wallBase = new THREE.Mesh(
            new THREE.BoxGeometry(24, 1.8, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.85 })
        );
        wallBase.position.y = 0.9;
        wallBase.castShadow = true;
        wallBase.receiveShadow = true;
        wallGroup.add(wallBase);

        // Terracotta Clay Sloped Roof Tiles on Wall
        const tileRoof = new THREE.Mesh(
            new THREE.ConeGeometry(0.45, 24, 4),
            new THREE.MeshStandardMaterial({ color: 0xa84126, roughness: 0.65 })
        );
        tileRoof.rotation.z = Math.PI / 2;
        tileRoof.rotation.y = Math.PI / 4;
        tileRoof.position.y = 1.95;
        tileRoof.scale.set(0.6, 1, 1.4);
        tileRoof.castShadow = true;
        wallGroup.add(tileRoof);

        scene.add(wallGroup);

        // ================= KERALA PALMS & VEGETATION =================
        // Coconut Palms (The iconic Kerala tree)
        scene.add(createCoconutPalm(-11.5, -6.5, 1.1, 0.14, 0.3));
        scene.add(createCoconutPalm(-12.2, 1.8, 0.95, 0.12, -0.4));
        scene.add(createCoconutPalm(11.8, -6.2, 1.05, 0.15, -0.6));
        scene.add(createCoconutPalm(12.4, 2.5, 0.9, 0.1, 0.5));
        scene.add(createCoconutPalm(2.8, -10.8, 1.18, 0.08, 0.1));

        // Banana Plants (Vazha)
        scene.add(createBananaPlant(-8.5, -6.6, 1.1));
        scene.add(createBananaPlant(-7.2, -6.4, 0.9));
        scene.add(createBananaPlant(7.2, -6.4, 1.05));
        scene.add(createBananaPlant(8.5, -6.6, 0.88));
        scene.add(createBananaPlant(10.6, 4.8, 0.95));

        // Areca Palm Clusters
        scene.add(createArecaPalmCluster(-9.6, -5.2, 1.0));
        scene.add(createArecaPalmCluster(9.6, -5.2, 1.0));
        scene.add(createArecaPalmCluster(-11.0, 5.2, 0.9));

        // Tropical Shrubs
        scene.add(createTropicalBush(-6.0, -6.8, 1.1));
        scene.add(createTropicalBush(6.0, -6.8, 1.1));
        scene.add(createTropicalBush(-10.6, -2.5, 0.9));
        scene.add(createTropicalBush(10.6, -2.5, 0.9));

        // ================= 3 PARKING SLOTS: P01, P02, P03 =================
        const slotWidth = 4.2;
        const slotLength = 6.6;
        const slotPositions = [
            { id: 'P01', x: -5.4, z: -1.2, status: 'AVAILABLE' },
            { id: 'P02', x: 0.0, z: -1.2, status: 'OCCUPIED' },
            { id: 'P03', x: 5.4, z: -1.2, status: 'AVAILABLE' }
        ];

        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x88929b, roughness: 0.8 });

        slotPositions.forEach(slot => {
            const group = new THREE.Group();
            group.position.set(slot.x, 0, slot.z);

            // Interactive Pad (Invisible raycasting plane)
            const padGeo = new THREE.PlaneGeometry(slotWidth, slotLength);
            const padMat = new THREE.MeshBasicMaterial({ visible: false });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.rotation.x = -Math.PI / 2;
            pad.position.y = 0.13;
            group.add(pad);

            // Clean WHITE Painted Parking Boundaries
            const lineWidth = 0.14;
            const lineH = 0.015;

            // Left line
            const leftL = new THREE.Mesh(new THREE.BoxGeometry(lineWidth, lineH, slotLength), lineMat);
            leftL.position.set(-slotWidth / 2, 0.13, 0);
            group.add(leftL);

            // Right line
            const rightL = new THREE.Mesh(new THREE.BoxGeometry(lineWidth, lineH, slotLength), lineMat);
            rightL.position.set(slotWidth / 2, 0.13, 0);
            group.add(rightL);

            // Back line
            const backL = new THREE.Mesh(new THREE.BoxGeometry(slotWidth, lineH, lineWidth), lineMat);
            backL.position.set(0, 0.13, -slotLength / 2);
            group.add(backL);

            // Concrete Wheel Stop Curb at back of stall
            const wheelStop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.35), concreteMat);
            wheelStop.position.set(0, 0.23, -slotLength / 2 + 0.8);
            wheelStop.castShadow = true;
            wheelStop.receiveShadow = true;
            group.add(wheelStop);

            // Stenciled Painted Identifier on Asphalt (P01, P02, P03)
            const textTex = createSlotTextTexture(slot.id);
            const textMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.6, 1.6),
                new THREE.MeshBasicMaterial({ map: textTex, transparent: true, opacity: 0.85 })
            );
            textMesh.rotation.x = -Math.PI / 2;
            textMesh.position.set(0, 0.13, slotLength / 2 - 1.2);
            group.add(textMesh);

            // Smart IR Proximity Sensor Unit
            const sensorPillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12),
                new THREE.MeshStandardMaterial({ color: 0x1e2732, metalness: 0.8, roughness: 0.25 })
            );
            sensorPillar.position.set(0, 0.66, -slotLength / 2 + 0.2);
            sensorPillar.castShadow = true;
            group.add(sensorPillar);

            // Sensor LED Lens Indicator
            const isOcc = slot.status === 'OCCUPIED';
            const sensorColor = isOcc ? 0xef4444 : 0x00ff66;
            const sensorGeo = new THREE.SphereGeometry(0.1, 16, 16);
            const sensorMat = new THREE.MeshStandardMaterial({
                color: sensorColor,
                emissive: sensorColor,
                emissiveIntensity: 0.9
            });
            const sensor = new THREE.Mesh(sensorGeo, sensorMat);
            sensor.position.set(0, 1.28, -slotLength / 2 + 0.2);
            group.add(sensor);

            // Subtle point light from sensor
            const sensorLight = new THREE.PointLight(sensorColor, 0.6, 2.5);
            sensorLight.position.set(0, 1.3, -slotLength / 2 + 0.25);
            group.add(sensorLight);

            // If P02: Add realistic parked car
            if (slot.id === 'P02') {
                parkedCarP02Mesh = createRealisticPassengerCar(0xedf2f7, false); // Pearl White Metallic
                parkedCarP02Mesh.position.set(0, 0.06, 0);
                parkedCarP02Mesh.rotation.y = Math.PI; // Parked facing forward
                group.add(parkedCarP02Mesh);
            }

            pad.userData = { slotId: slot.id, status: slot.status, sensorMesh: sensor, pointLight: sensorLight };
            slotMeshes[slot.id] = { group, pad, sensor, pointLight: sensorLight, status: slot.status };

            scene.add(group);
        });

        // ================= AUTONOMOUS PASSENGER CAR =================
        // Centerpiece realistic passenger car (Deep Cyber Cyan Metallic)
        autonomousCar3D = createRealisticPassengerCar(0x00b8d4, true);
        autonomousCar3D.position.set(-12.5, 0.06, 4.2);
        autonomousCar3D.rotation.y = Math.PI / 2; // Facing down the entrance lane
        scene.add(autonomousCar3D);

        // ================= ENTRANCE RFID BARRIER GATE =================
        const gateGroup = new THREE.Group();
        gateGroup.position.set(-8.2, 0, 4.2);

        // Stainless Steel Pedestal
        const pedestal = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 2.0, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x22303c, metalness: 0.8, roughness: 0.2 })
        );
        pedestal.position.y = 1.06;
        pedestal.castShadow = true;
        gateGroup.add(pedestal);

        // RFID Sensor Screen
        const rfidScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.45, 0.35),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00f2fe, emissiveIntensity: 0.5 })
        );
        rfidScreen.position.set(0.3, 1.35, 0);
        gateGroup.add(rfidScreen);

        barrierArmMesh = null;

        scene.add(gateGroup);

        // Raycasting
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        container.addEventListener('mousemove', onCanvasMouseMove);
        container.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);

        // Animation Loop
        function animateThree() {
            requestAnimationFrame(animateThree);
            if (controls) controls.update();
            renderer.render(scene, camera);
        }
        animateThree();
    }

    // Helper: Update 3D Autonomous Car Position Synchronized with Simulation
    function update3DCar(x2D, y2D, heading2D, isBraking, isReversing) {
        if (!autonomousCar3D) return;

        // Mathematical coordinate projection from 2D sim to 3D scene:
        let posX = 0;
        if (x2D <= 115) {
            posX = -12.5 + ((x2D + 80) / 195) * 4.3;
        } else if (x2D <= 390) {
            posX = -8.2 + ((x2D - 115) / 275) * 2.8;
        } else {
            posX = -5.4 + ((x2D - 390) / 380) * 10.8;
        }

        // Z Coordinate (lane is at Z = 4.2, stalls are at Z = -1.2)
        const posZ = -1.2 + ((y2D - 130) / 170) * 5.4;

        // Heading angle in radians (2D heading 0° is +X -> 3D rotation.y = PI/2)
        const rotY = (Math.PI / 2) - (heading2D * Math.PI / 180);

        autonomousCar3D.position.set(posX, 0.06, posZ);
        autonomousCar3D.rotation.y = rotY;

        // Brake lights
        car3DBrakeLights.forEach(light => {
            if (light && light.material) {
                light.material.emissiveIntensity = isBraking ? 1.6 : 0.4;
            }
        });

        // Reverse lights
        car3DReverseLights.forEach(light => {
            if (light && light.material) {
                light.material.opacity = isReversing ? 0.9 : 0;
            }
        });
    }

    // Mouse Move on 3D Canvas
    function onCanvasMouseMove(e) {
        if (!container || !renderer || !camera) return;
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const interactiveMeshes = Object.values(slotMeshes).map(s => s.pad);
        const intersects = raycaster.intersectObjects(interactiveMeshes);

        if (intersects.length > 0) {
            const hit = intersects[0].object.userData;
            hoveredSlot = hit.slotId;

            if (slotHoverHUD) {
                slotHoverHUD.classList.remove('hidden');
                hudSlotId.textContent = hit.slotId;
                hudSlotStatus.textContent = hit.status === 'AVAILABLE' ? '● AVAILABLE' : '● OCCUPIED';
                hudSlotStatus.className = `hud-slot-status ${hit.status === 'AVAILABLE' ? 'text-green' : 'text-danger'}`;
                hudSensorStatus.textContent = hit.status === 'AVAILABLE' ? 'CLEAR / ONLINE' : 'VEHICLE PRESENT';
            }
        } else {
            hoveredSlot = null;
            if (slotHoverHUD) slotHoverHUD.classList.add('hidden');
        }
    }

    // Click on 3D Canvas
    function onCanvasClick() {
        if (hoveredSlot && slotMeshes[hoveredSlot]) {
            const data = slotMeshes[hoveredSlot];
            if (data.status === 'AVAILABLE') {
                openDemoModal(hoveredSlot);
            } else {
                showToast(`Slot ${hoveredSlot} is currently occupied.`);
            }
        }
    }

    function onWindowResize() {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }


    // =========================================================================
    // 4. AUTONOMOUS PARKING EXPERIENCE & SIMULATION ENGINE (TOP-DOWN)
    // =========================================================================
    const replaySimBtn = document.getElementById('replaySimBtn');
    const simVehicle = document.getElementById('simVehicle');
    const simBarrierArm = document.getElementById('simBarrierArm');
    const simRfidWave = document.getElementById('simRfidWave');
    const simNavPath = document.getElementById('simNavPath');
    const simStepLabel = document.getElementById('simStepLabel');
    const simActionText = document.getElementById('simActionText');
    const simLogText = document.getElementById('simLogText');

    const simBrakeLightL = document.getElementById('simBrakeLightL');
    const simBrakeLightR = document.getElementById('simBrakeLightR');
    const simReverseLightL = document.getElementById('simReverseLightL');
    const simReverseLightR = document.getElementById('simReverseLightR');

    // Dynamic slot states
    const slotStates = {
        P01: 'AVAILABLE',
        P02: 'OCCUPIED',
        P03: 'AVAILABLE'
    };

    let simAnimId = null;
    let isSimRunning = false;
    let simStartTime = null;
    let currentIsBraking = false;
    let currentIsReversing = false;

    function setCarTransform(x, y, heading) {
        if (simVehicle) {
            simVehicle.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)}) rotate(${heading.toFixed(2)})`);
        }
        if (typeof update3DCar === 'function') {
            update3DCar(x, y, heading, currentIsBraking, currentIsReversing);
        }
    }

    function setBrakeLights(isBraking) {
        currentIsBraking = isBraking;
        if (simBrakeLightL && simBrakeLightR) {
            if (isBraking) {
                simBrakeLightL.style.fill = '#ff1a40';
                simBrakeLightL.style.opacity = '1';
                simBrakeLightL.style.filter = 'drop-shadow(0 0 6px #ff0033)';
                simBrakeLightR.style.fill = '#ff1a40';
                simBrakeLightR.style.opacity = '1';
                simBrakeLightR.style.filter = 'drop-shadow(0 0 6px #ff0033)';
            } else {
                simBrakeLightL.style.fill = '#ef4444';
                simBrakeLightL.style.opacity = '0.45';
                simBrakeLightL.style.filter = 'none';
                simBrakeLightR.style.fill = '#ef4444';
                simBrakeLightR.style.opacity = '0.45';
                simBrakeLightR.style.filter = 'none';
            }
        }
        if (typeof car3DBrakeLights !== 'undefined') {
            car3DBrakeLights.forEach(light => {
                if (light && light.material) {
                    light.material.emissiveIntensity = isBraking ? 1.6 : 0.4;
                }
            });
        }
    }

    function setReverseLights(isReversing) {
        currentIsReversing = isReversing;
        if (simReverseLightL && simReverseLightR) {
            const op = isReversing ? '1' : '0';
            const filt = isReversing ? 'drop-shadow(0 0 5px #ffffff)' : 'none';
            simReverseLightL.style.opacity = op;
            simReverseLightL.style.filter = filt;
            simReverseLightR.style.opacity = op;
            simReverseLightR.style.filter = filt;
        }
        if (typeof car3DReverseLights !== 'undefined') {
            car3DReverseLights.forEach(light => {
                if (light && light.material) {
                    light.material.opacity = isReversing ? 0.95 : 0.0;
                }
            });
        }
    }

    function setBarrierArmOpen(isOpen) {
        if (simBarrierArm) {
            simBarrierArm.style.transform = isOpen ? 'rotate(-75deg)' : 'rotate(0deg)';
        }
        if (typeof barrierArmMesh !== 'undefined' && barrierArmMesh) {
            barrierArmMesh.rotation.x = isOpen ? -Math.PI / 2.3 : 0;
        }
    }

    function updateSlotVisual(slotId, status) {
        slotStates[slotId] = status;
        const sensor = document.getElementById(`simSensor${slotId}`);
        const statusText = document.getElementById(`simStatus${slotId}`);
        const bay = document.getElementById(`simBay${slotId}`);
        const isOcc = status === 'OCCUPIED';
        const isAssigned = status === 'ASSIGNED';

        if (sensor) {
            if (isOcc) {
                sensor.setAttribute('fill', '#ef4444');
                sensor.setAttribute('filter', 'url(#glowRed)');
            } else if (isAssigned) {
                sensor.setAttribute('fill', '#00f2fe');
                sensor.setAttribute('filter', 'url(#glowCyan)');
            } else {
                sensor.setAttribute('fill', '#00ff66');
                sensor.setAttribute('filter', 'url(#glowGreen)');
            }
        }
        if (statusText) {
            statusText.textContent = `${slotId}: ${status}`;
            if (isOcc) {
                statusText.setAttribute('fill', '#ef4444');
            } else if (isAssigned) {
                statusText.setAttribute('fill', '#00f2fe');
            } else {
                statusText.setAttribute('fill', '#00ff66');
            }
        }
        if (bay) {
            bay.classList.toggle('occupied', isOcc);
            bay.classList.toggle('assigned', isAssigned);
        }

        // Synchronize 3D Slot Visuals (LED Lens, Emissive Color, PointLight, user data)
        if (typeof slotMeshes !== 'undefined' && slotMeshes[slotId]) {
            const slotData = slotMeshes[slotId];
            slotData.status = status;
            const hexColor = isOcc ? 0xef4444 : (isAssigned ? 0x00f2fe : 0x00ff66);
            if (slotData.sensor && slotData.sensor.material) {
                slotData.sensor.material.color.setHex(hexColor);
                slotData.sensor.material.emissive.setHex(hexColor);
                slotData.sensor.material.emissiveIntensity = isOcc ? 1.4 : 0.9;
            }
            if (slotData.pointLight) {
                slotData.pointLight.color.setHex(hexColor);
            }
            if (slotData.pad && slotData.pad.userData) {
                slotData.pad.userData.status = status;
            }
        }
    }

    // Helper: Update step indicators and telemetry with strong visual hierarchy
    function setActiveStep(stepNum, stepLabel, actionText, telemetryText, isSuccess = false) {
        if (simStepLabel) {
            simStepLabel.textContent = stepLabel;
            if (isSuccess) {
                simStepLabel.classList.add('success');
            } else {
                simStepLabel.classList.remove('success');
            }
        }
        if (simActionText) simActionText.textContent = actionText;
        if (simLogText) simLogText.textContent = telemetryText;

        // Visual Step Indicator: Exactly ONE step is active at a time
        for (let i = 1; i <= 6; i++) {
            const pill = document.getElementById(`simStep${i}`);
            if (!pill) continue;
            pill.classList.remove('active', 'completed', 'upcoming');
            if (i < stepNum) {
                pill.classList.add('completed');
            } else if (i === stepNum) {
                pill.classList.add('active');
            } else {
                pill.classList.add('upcoming');
            }
        }
    }

    // Bezier curve interpolation with tangent heading
    function getCubicBezier(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

        const dx = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
        const dy = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);

        return { x, y, dx, dy };
    }

    // Kinematic Easing Functions
    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
    function easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }
    function easeInCubic(x) {
        return x * x * x;
    }

    function runAutonomousSimulation() {
        if (simAnimId) {
            cancelAnimationFrame(simAnimId);
            simAnimId = null;
        }

        isSimRunning = true;
        simStartTime = performance.now();

        // 1. Reset all slot states & visuals per requirement:
        // P01: AVAILABLE, P02: OCCUPIED, P03: AVAILABLE
        updateSlotVisual('P01', 'AVAILABLE');
        updateSlotVisual('P02', 'OCCUPIED');
        updateSlotVisual('P03', 'AVAILABLE');

        // 2. Reset hardware states
        setBarrierArmOpen(false);
        if (simRfidWave) simRfidWave.classList.remove('pulse');
        if (simNavPath) simNavPath.classList.remove('active');
        setBrakeLights(false);
        setReverseLights(false);

        // 3. Reset vehicle to start
        setCarTransform(-80, 300, 0);

        // 4. Initial Step 1 state
        setActiveStep(1, 'STEP 1: VEHICLE DETECTED', 'VEHICLE DETECTED', 'Telemetry: Vehicle detected at parking entrance.');

        // Autonomous Sequence Animation Loop
        function simStep(now) {
            const elapsed = (now - simStartTime) / 1000; // in seconds

            // STEP 1: VEHICLE DETECTED (0.0s - 3.5s) — Display for 3.5s
            if (elapsed < 3.5) {
                setActiveStep(1, 'STEP 1: VEHICLE DETECTED', 'VEHICLE DETECTED', 'Telemetry: Vehicle detected at parking entrance.');
                if (elapsed < 2.0) {
                    const t = elapsed / 2.0;
                    const ease = easeOutCubic(t);
                    const x = -80 + (115 - (-80)) * ease;
                    setCarTransform(x, 300, 0);
                    setBrakeLights(t > 0.65);
                } else {
                    setCarTransform(115, 300, 0);
                    setBrakeLights(true);
                }
            }

            // STEP 2: RFID VERIFIED (3.5s - 7.0s) — Display for 3.5s
            else if (elapsed < 7.0) {
                setCarTransform(115, 300, 0);
                setBrakeLights(true);
                if (simRfidWave) simRfidWave.classList.add('pulse');
                setActiveStep(2, 'STEP 2: RFID VERIFIED', 'RFID VERIFIED', 'Telemetry: RFID tag verified successfully.');
            }

            // STEP 3: SEARCHING FOR PARKING SLOT (7.0s - 10.5s) — Display for 3.5s
            else if (elapsed < 10.5) {
                setCarTransform(115, 300, 0);
                setBrakeLights(true);
                if (simRfidWave) simRfidWave.classList.remove('pulse');
                setActiveStep(3, 'STEP 3: SEARCHING FOR PARKING SLOT', 'SLOT SEARCH', 'Telemetry: Scanning parking slots for availability.');
            }

            // STEP 4: SLOT ASSIGNED — P01 (10.5s - 14.0s) — Display for 3.5s
            else if (elapsed < 14.0) {
                setCarTransform(115, 300, 0);
                setBrakeLights(true);
                setBarrierArmOpen(true);
                if (simNavPath) simNavPath.classList.add('active');
                updateSlotVisual('P01', 'ASSIGNED');
                setActiveStep(4, 'STEP 4: SLOT ASSIGNED — P01', 'SLOT ASSIGNED: P01', 'Telemetry: Slot P01 assigned. Autonomous navigation initiated.');
            }

            // VEHICLE MOVEMENT: NAVIGATING TOWARD & ENTERING P01 (14.0s - 19.5s) [5.5s]
            else if (elapsed < 19.5) {
                setBrakeLights(false);
                setActiveStep(4, 'STEP 4: SLOT ASSIGNED — P01', 'AUTONOMOUS NAVIGATION', 'Telemetry: Slot P01 assigned. Autonomous navigation initiated.');

                // 4A: Drive down lane past barrier gate (14.0s - 16.0s)
                if (elapsed < 16.0) {
                    const t = (elapsed - 14.0) / 2.0;
                    const ease = easeInOutCubic(t);
                    const x = 115 + (325 - 115) * ease;
                    setCarTransform(x, 300, 0);
                    if (elapsed > 15.2) setBarrierArmOpen(false); // Close barrier arm behind vehicle
                }
                // 4B: Realistic 90° turn into P01 (16.0s - 17.8s)
                else if (elapsed < 17.8) {
                    const t = (elapsed - 16.0) / 1.8;
                    const p0 = { x: 325, y: 300 };
                    const p1 = { x: 370, y: 300 };
                    const p2 = { x: 390, y: 260 };
                    const p3 = { x: 390, y: 220 };
                    const pt = getCubicBezier(p0, p1, p2, p3, easeInOutCubic(t));
                    const heading = Math.atan2(pt.dy, pt.dx) * (180 / Math.PI);
                    setCarTransform(pt.x, pt.y, heading);
                    if (simActionText) simActionText.textContent = 'PARKING MANEUVER';
                }
                // 4C: Straight pull into P01 stall & decelerate naturally (17.8s - 19.5s)
                else {
                    const t = (elapsed - 17.8) / 1.7;
                    const ease = easeOutCubic(t);
                    const x = 390;
                    const y = 220 - (220 - 130) * ease;
                    setCarTransform(x, y, -90);
                    setBrakeLights(t > 0.6);
                    if (simActionText) simActionText.textContent = 'VEHICLE ALIGNED';
                }
            }

            // VEHICLE SETTLED INSIDE P01: 2-second pause before IR sensor trigger (19.5s - 21.5s)
            else if (elapsed < 21.5) {
                setCarTransform(390, 130, -90);
                setBrakeLights(true);
                if (simNavPath) simNavPath.classList.remove('active');
                if (simActionText) simActionText.textContent = 'VEHICLE ALIGNED';
            }

            // STEP 5: IR SENSOR ACTIVE — P01 OCCUPIED (21.5s - 26.5s) — Display for 5s
            else if (elapsed < 26.5) {
                setCarTransform(390, 130, -90);
                setBrakeLights(true);
                updateSlotVisual('P01', 'OCCUPIED');
                setActiveStep(5, 'STEP 5: IR SENSOR ACTIVE — P01 OCCUPIED', 'P01 OCCUPIED', 'Telemetry: IR proximity sensor triggered. P01 occupancy confirmed.');
            }

            // STEP 6: VEHICLE PARKED — P01 (26.5s+) — PERMANENT FINAL STATE
            else {
                setCarTransform(390, 130, -90);
                setBrakeLights(true);
                setReverseLights(false);
                updateSlotVisual('P01', 'OCCUPIED');
                updateSlotVisual('P02', 'OCCUPIED');
                updateSlotVisual('P03', 'AVAILABLE');
                if (simNavPath) simNavPath.classList.remove('active');

                setActiveStep(6, 'STEP 6: VEHICLE PARKED — P01', 'VEHICLE PARKED', 'Telemetry: Vehicle successfully parked in Slot P01. Parking session active.', true);

                isSimRunning = false;
                simAnimId = null;
                return; // Stop animation loop. Vehicle remains permanently parked in P01 until REPLAY is clicked.
            }

            simAnimId = requestAnimationFrame(simStep);
        }

        simAnimId = requestAnimationFrame(simStep);
    }

    if (replaySimBtn) {
        replaySimBtn.addEventListener('click', () => {
            runAutonomousSimulation();
        });
    }

    // Automatically trigger initial simulation run after short delay
    setTimeout(() => {
        runAutonomousSimulation();
    }, 1200);


    // =========================================================================
    // 5. THE PARKX APP (3D SMARTPHONE MOCKUP TABS)
    // =========================================================================
    const phoneTabBtns = document.querySelectorAll('.phone-tab-btn');
    const appScreenViews = document.querySelectorAll('.app-screen-view');

    phoneTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.getAttribute('data-screen');

            // Switch active tab button
            phoneTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch active screen inside phone
            appScreenViews.forEach(screen => {
                screen.classList.add('hidden');
                screen.classList.remove('active');
            });

            const activeView = document.getElementById(`appScreen${screenId}`);
            if (activeView) {
                activeView.classList.remove('hidden');
                activeView.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 6. HARDWARE TESTBENCH INTERACTION
    // =========================================================================
    const triggerIrBtn = document.getElementById('triggerIrTestBtn');
    const triggerRfidBtn = document.getElementById('triggerRfidTestBtn');
    const triggerServoBtn = document.getElementById('triggerServoTestBtn');
    const hwFeedback = document.getElementById('hardwareTestFeedback');

    let servoState = false;

    if (triggerIrBtn) {
        triggerIrBtn.addEventListener('click', () => {
            hwFeedback.textContent = 'IR SENSOR: Beam broken -> Slot P01 detected vehicle -> Telemetry transmitted.';
            hwFeedback.style.color = 'var(--accent-electric-green)';
            showToast('IR Sensor: Vehicle presence detected');
        });
    }

    if (triggerRfidBtn) {
        triggerRfidBtn.addEventListener('click', () => {
            hwFeedback.textContent = 'RFID RC522: SCANNING... -> UID [7A:B2:9F:01] VERIFIED ✓ -> Entrance Authorized.';
            hwFeedback.style.color = 'var(--accent-cyan)';
            showToast('RFID: Contactless UID Authorized ✓');
        });
    }

    if (triggerServoBtn) {
        triggerServoBtn.addEventListener('click', () => {
            servoState = !servoState;
            if (barrierArmMesh) {
                barrierArmMesh.rotation.x = servoState ? -Math.PI / 2.3 : 0;
            }
            if (simBarrierArm) {
                simBarrierArm.classList.toggle('open', servoState);
            }
            hwFeedback.textContent = `SERVO MOTOR: PWM signal 50Hz -> Angle shifted to ${servoState ? '90° (OPEN)' : '0° (CLOSED)'}.`;
            hwFeedback.style.color = servoState ? 'var(--accent-electric-green)' : 'var(--accent-danger)';
            showToast(`Servo Barrier: ${servoState ? 'Opened' : 'Closed'}`);
        });
    }

    // =========================================================================
    // 7. VISITOR FAQ ACCORDION INTERACTION
    // =========================================================================
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');

            // Close all items
            document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));

            // Toggle clicked item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 8. DEMO PAYMENT EXPERIENCE MODAL (RAZORPAY TEST / NO REAL MONEY)
    // =========================================================================
    const demoPaymentModal = document.getElementById('demoPaymentModal');
    const closeDemoPayModalBtn = document.getElementById('closeDemoPayModalBtn');
    const demoBookScreen = document.getElementById('demoBookScreen');
    const demoPayScreen = document.getElementById('demoPayScreen');
    const demoProcessingScreen = document.getElementById('demoProcessingScreen');
    const demoSuccessScreen = document.getElementById('demoSuccessScreen');

    const demoSlotName = document.getElementById('demoSlotName');
    const demoFeeText = document.getElementById('demoFeeText');
    const payAmountText = document.getElementById('payAmountText');
    const proceedToDemoPayBtn = document.getElementById('proceedToDemoPayBtn');
    const cancelDemoPayBtn = document.getElementById('cancelDemoPayBtn');
    const continueToParkingBtn = document.getElementById('continueToParkingBtn');
    const receiptSlot = document.getElementById('receiptSlot');
    const receiptDuration = document.getElementById('receiptDuration');

    let currentSelectedSlot = 'P01';
    let currentSelectedHours = 2;
    let currentFee = 35;

    function openDemoModal(slotName) {
        if (!demoPaymentModal) return;
        currentSelectedSlot = slotName || 'P01';
        currentSelectedHours = 2;
        currentFee = 35;

        if (demoSlotName) demoSlotName.textContent = currentSelectedSlot;
        if (demoFeeText) demoFeeText.textContent = `₹${currentFee}`;
        if (payAmountText) payAmountText.textContent = `₹${currentFee}`;

        // Reset duration button state
        document.querySelectorAll('.dur-btn').forEach(btn => {
            if (btn.getAttribute('data-hours') === '2') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show screen 1
        demoBookScreen.classList.remove('hidden');
        demoPayScreen.classList.add('hidden');
        demoProcessingScreen.classList.add('hidden');
        demoSuccessScreen.classList.add('hidden');

        demoPaymentModal.classList.remove('hidden');
    }

    function closeDemoModal() {
        if (demoPaymentModal) demoPaymentModal.classList.add('hidden');
    }

    // Attach to all Launch Demo and Book Slot buttons
    document.querySelectorAll('.launch-demo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openDemoModal('P01');
        });
    });

    document.querySelectorAll('.book-slot-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const slot = btn.getAttribute('data-slot') || 'P01';
            openDemoModal(slot);
        });
    });

    // Duration selector
    document.querySelectorAll('.dur-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSelectedHours = parseInt(btn.getAttribute('data-hours') || '2', 10);
            currentFee = parseInt(btn.getAttribute('data-fee') || '35', 10);

            if (demoFeeText) demoFeeText.textContent = `₹${currentFee}`;
            if (payAmountText) payAmountText.textContent = `₹${currentFee}`;
        });
    });

    if (proceedToDemoPayBtn) {
        proceedToDemoPayBtn.addEventListener('click', () => {
            demoBookScreen.classList.add('hidden');
            demoPayScreen.classList.remove('hidden');
        });
    }

    if (cancelDemoPayBtn) cancelDemoPayBtn.addEventListener('click', closeDemoModal);
    if (closeDemoPayModalBtn) closeDemoPayModalBtn.addEventListener('click', closeDemoModal);

    if (demoPaymentModal) {
        demoPaymentModal.addEventListener('click', (e) => {
            if (e.target === demoPaymentModal) closeDemoModal();
        });
    }

    // Payment Option Buttons (UPI DEMO & CARD DEMO)
    document.querySelectorAll('.demo-pay-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            demoPayScreen.classList.add('hidden');
            demoProcessingScreen.classList.remove('hidden');

            setTimeout(() => {
                demoProcessingScreen.classList.add('hidden');
                demoSuccessScreen.classList.remove('hidden');

                if (receiptSlot) receiptSlot.textContent = currentSelectedSlot;
                if (receiptDuration) receiptDuration.textContent = `${currentSelectedHours} Hour${currentSelectedHours > 1 ? 's' : ''}`;

                // Update slot state to OCCUPIED in dashboard & 3D
                updateSlotOccupancy(currentSelectedSlot);
                showToast(`Parking session started for ${currentSelectedSlot}.`);
            }, 1400);
        });
    });

    if (continueToParkingBtn) {
        continueToParkingBtn.addEventListener('click', () => {
            closeDemoModal();
            const liveSection = document.getElementById('live-parking');
            if (liveSection) liveSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function updateSlotOccupancy(slotId) {
        const slotCard = document.getElementById(`slotCard${slotId}`);
        if (slotCard) {
            slotCard.className = 'slot-live-card glass-card occupied';
            const statusTag = slotCard.querySelector('.status-tag');
            if (statusTag) {
                statusTag.className = 'badge badge-danger status-tag';
                statusTag.textContent = 'OCCUPIED';
            }
            const sensorState = slotCard.querySelector('.sensor-state');
            if (sensorState) {
                sensorState.className = 'sensor-state text-danger';
                sensorState.textContent = 'VEHICLE PRESENT (RESERVED)';
            }
            const btn = slotCard.querySelector('.book-slot-btn');
            if (btn) {
                btn.className = 'btn btn-sm btn-glass text-muted book-slot-btn';
                btn.disabled = true;
                btn.textContent = 'OCCUPIED';
            }
        }

        const countElem = document.getElementById('liveAvailableCount');
        if (countElem) {
            const availCount = document.querySelectorAll('.slot-live-card.available').length;
            countElem.textContent = `${availCount} / 3`;
        }

        // Also update 3D scene if present
        if (slotMeshes && slotMeshes[slotId]) {
            slotMeshes[slotId].status = 'OCCUPIED';
            if (slotMeshes[slotId].pad) slotMeshes[slotId].pad.userData.status = 'OCCUPIED';
            if (slotMeshes[slotId].sensor && slotMeshes[slotId].sensor.material) {
                slotMeshes[slotId].sensor.material.color.setHex(0xef4444);
                slotMeshes[slotId].sensor.material.emissive.setHex(0xef4444);
            }
            if (slotMeshes[slotId].pointLight) {
                slotMeshes[slotId].pointLight.color.setHex(0xef4444);
            }

            // Add realistic parked car to booked slot if not already present
            if (typeof createRealisticPassengerCar === 'function') {
                const bookedCar = createRealisticPassengerCar(0x0284c7, false);
                bookedCar.position.set(0, 0.06, 0);
                bookedCar.rotation.y = Math.PI;
                slotMeshes[slotId].group.add(bookedCar);
            }
        }
    }

    // =========================================================================
    // 9. TOAST NOTIFICATION UTILITY
    // =========================================================================
    function showToast(message) {
        let toast = document.getElementById('parkxToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'parkxToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(8, 14, 20, 0.95);
                border: 1px solid var(--accent-cyan);
                color: var(--accent-cyan);
                font-family: var(--font-mono);
                font-size: 0.85rem;
                padding: 0.75rem 1.25rem;
                border-radius: 8px;
                box-shadow: 0 0 25px rgba(0, 242, 254, 0.35);
                z-index: 99999;
                transition: opacity 0.3s ease, transform 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = `✓ ${message}`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 3500);
    }

    // Sticky Navbar on Scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Mobile Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            const isFlex = navLinks.style.display === 'flex';
            navLinks.style.display = isFlex ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'rgba(2, 4, 6, 0.98)';
            navLinks.style.padding = '1.5rem';
            navLinks.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8)';
            if (mobileLogoutBtn) {
                mobileLogoutBtn.style.display = isFlex ? 'none' : 'flex';
                mobileLogoutBtn.style.marginTop = '1rem';
                mobileLogoutBtn.style.width = '100%';
                mobileLogoutBtn.style.justifyContent = 'center';
            }
        });
    }

    // =========================================================================
    // 10. AUTHENTICATION & SESSION LOGOUT CONTROLLER
    // =========================================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ParkXAuth !== 'undefined') {
                ParkXAuth.logout();
            } else {
                sessionStorage.clear();
                localStorage.clear();
                window.location.replace('login.html');
            }
        });
    }

    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ParkXAuth !== 'undefined') {
                ParkXAuth.logout();
            } else {
                sessionStorage.clear();
                localStorage.clear();
                window.location.replace('login.html');
            }
        });
    }

    // If redirected to #live-parking or dashboard hash, smooth scroll into view
    if (window.location.hash === '#live-parking') {
        setTimeout(() => {
            const liveDashboard = document.getElementById('live-parking');
            if (liveDashboard) {
                liveDashboard.scrollIntoView({ behavior: 'smooth' });
            }
        }, 300);
    }
});


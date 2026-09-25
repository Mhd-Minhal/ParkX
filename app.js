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
    // 3. THREE.JS INTERACTIVE 3D MINIATURE PARKING ENVIRONMENT
    // =========================================================================
    const container = document.getElementById('threejs-canvas-container');
    const slotHoverHUD = document.getElementById('slotHoverHUD');
    const hudSlotId = document.getElementById('hudSlotId');
    const hudSlotStatus = document.getElementById('hudSlotStatus');
    const hudSensorStatus = document.getElementById('hudSensorStatus');

    let scene, camera, renderer, controls;
    let slotMeshes = {};
    let barrierArmMesh;
    let raycaster, mouse;
    let hoveredSlot = null;

    if (container && typeof THREE !== 'undefined') {
        initThreeDScene();
    }

    function initThreeDScene() {
        const width = container.clientWidth || 550;
        const height = container.clientHeight || 480;

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05080a, 0.025);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 14, 18);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2.15;
            controls.minDistance = 10;
            controls.maxDistance = 28;
            controls.target.set(0, 0, 0);
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        const pointLightGreen = new THREE.PointLight(0x00ff66, 1.5, 15);
        pointLightGreen.position.set(-4, 2, 0);
        scene.add(pointLightGreen);

        const pointLightCyan = new THREE.PointLight(0x00f2fe, 1.2, 15);
        pointLightCyan.position.set(4, 2, 0);
        scene.add(pointLightCyan);

        // 1. Asphalt Ground Base
        const groundGeo = new THREE.BoxGeometry(22, 0.4, 16);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x070c10,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = -0.2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Road markings & lane line
        const laneGeo = new THREE.PlaneGeometry(20, 0.15);
        const laneMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, opacity: 0.35, transparent: true });
        const laneLine = new THREE.Mesh(laneGeo, laneMat);
        laneLine.rotation.x = -Math.PI / 2;
        laneLine.position.set(0, 0.02, 4);
        scene.add(laneLine);

        // 2. Parking Slots: P01, P02, P03
        const slotWidth = 3.6;
        const slotLength = 6.2;
        const slotPositions = [
            { id: 'P01', x: -5, z: -1.5, status: 'AVAILABLE', color: 0x00ff66 },
            { id: 'P02', x: 0, z: -1.5, status: 'OCCUPIED', color: 0xef4444 },
            { id: 'P03', x: 5, z: -1.5, status: 'AVAILABLE', color: 0x00ff66 }
        ];

        slotPositions.forEach(slot => {
            const group = new THREE.Group();
            group.position.set(slot.x, 0, slot.z);

            // Slot floor border / pad
            const padGeo = new THREE.PlaneGeometry(slotWidth, slotLength);
            const padMat = new THREE.MeshStandardMaterial({
                color: 0x0b1318,
                roughness: 0.4,
                metalness: 0.3,
                side: THREE.DoubleSide
            });
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.rotation.x = -Math.PI / 2;
            pad.position.y = 0.01;
            pad.receiveShadow = true;
            group.add(pad);

            // Neon line marking
            const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(slotWidth, 0.05, slotLength));
            const edgeMat = new THREE.LineBasicMaterial({
                color: slot.color,
                linewidth: 2
            });
            const outline = new THREE.LineSegments(edgeGeo, edgeMat);
            outline.position.y = 0.03;
            group.add(outline);

            // Sensor box
            const sensorGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
            const sensorMat = new THREE.MeshStandardMaterial({
                color: slot.color,
                emissive: slot.color,
                emissiveIntensity: 0.6
            });
            const sensor = new THREE.Mesh(sensorGeo, sensorMat);
            sensor.position.set(0, 0.1, -slotLength / 2 + 0.6);
            group.add(sensor);

            // If OCCUPIED (P02), add a stylized car
            if (slot.status === 'OCCUPIED') {
                const car = createStylizedCar(0xef4444);
                car.position.set(0, 0.5, 0);
                group.add(car);
            }

            // Tag userData for raycasting
            pad.userData = { slotId: slot.id, status: slot.status, sensorMesh: sensor, outline: outline };
            slotMeshes[slot.id] = { group, pad, sensor, outline, status: slot.status };

            scene.add(group);
        });

        // 3. Entrance RFID Barrier Gate & ESP32 Hub
        const gateGroup = new THREE.Group();
        gateGroup.position.set(-8.5, 0, 4);

        // Pedestal
        const pedestalGeo = new THREE.BoxGeometry(0.6, 2.2, 0.6);
        const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, metalness: 0.7, roughness: 0.3 });
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.y = 1.1;
        pedestal.castShadow = true;
        gateGroup.add(pedestal);

        // RFID Reader Box
        const rfidGeo = new THREE.BoxGeometry(0.2, 0.5, 0.4);
        const rfidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00f2fe, emissiveIntensity: 0.4 });
        const rfidBox = new THREE.Mesh(rfidGeo, rfidMat);
        rfidBox.position.set(0.35, 1.4, 0);
        gateGroup.add(rfidBox);

        // Servo Pivot & Barrier Arm
        const armPivot = new THREE.Group();
        armPivot.position.set(0, 1.8, 0.4);

        const armGeo = new THREE.BoxGeometry(0.12, 0.25, 4.2);
        const armMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.z = 2.1;
        arm.castShadow = true;
        armPivot.add(arm);
        gateGroup.add(armPivot);
        barrierArmMesh = armPivot;

        // ESP32 Microcontroller Enclosure
        const espBoxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.4);
        const espMat = new THREE.MeshStandardMaterial({ color: 0x16202c, metalness: 0.5, roughness: 0.2 });
        const espBox = new THREE.Mesh(espBoxGeo, espMat);
        espBox.position.set(0, 0.4, -0.6);
        gateGroup.add(espBox);

        // Pulsing Blue Status LED on ESP32
        const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0, 0.65, -0.4);
        gateGroup.add(led);

        scene.add(gateGroup);

        // Raycasting for Slot Hovering
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        container.addEventListener('mousemove', onCanvasMouseMove);
        container.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);

        // Animation Loop
        function animateThree() {
            requestAnimationFrame(animateThree);

            // Subtle pulsing of LED
            const time = Date.now() * 0.003;
            ledMat.color.setHSL(0.52, 1, 0.5 + Math.sin(time) * 0.2);

            if (controls) controls.update();
            renderer.render(scene, camera);
        }
        animateThree();
    }

    // Helper: Create Low-Poly Stylized Car
    function createStylizedCar(bodyColor) {
        const carGroup = new THREE.Group();

        // Car chassis
        const chassisGeo = new THREE.BoxGeometry(2.4, 0.7, 4.2);
        const chassisMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.3,
            metalness: 0.5
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.45;
        chassis.castShadow = true;
        carGroup.add(chassis);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(2.0, 0.6, 2.4);
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x05080a,
            roughness: 0.1,
            metalness: 0.8
        });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.0, -0.2);
        cabin.castShadow = true;
        carGroup.add(cabin);

        // Headlights (glow)
        const lightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const lightL = new THREE.Mesh(lightGeo, lightMat);
        lightL.position.set(-0.8, 0.45, 2.12);
        const lightR = new THREE.Mesh(lightGeo, lightMat);
        lightR.position.set(0.8, 0.45, 2.12);
        carGroup.add(lightL);
        carGroup.add(lightR);

        return carGroup;
    }

    // Mouse Move on 3D Canvas
    function onCanvasMouseMove(e) {
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
    // 4. PLAYFUL PARKING ANIMATION ARENA ("WHAT IF PARKING COULD THINK?")
    // =========================================================================
    const replaySimBtn = document.getElementById('replaySimBtn');
    const simVehicle = document.getElementById('simVehicle');
    const simBarrierArm = document.getElementById('simBarrierArm');
    const simRfidWave = document.getElementById('simRfidWave');
    const simSensorP01 = document.getElementById('simSensorP01');
    const simStatusP01 = document.getElementById('simStatusP01');
    const simStepLabel = document.getElementById('simStepLabel');
    const simLogText = document.getElementById('simLogText');

    let isSimRunning = false;

    function runAutonomousSimulation() {
        if (isSimRunning) return;
        isSimRunning = true;

        // Reset positions
        simVehicle.style.transition = 'none';
        simVehicle.style.left = '-80px';
        simVehicle.style.top = '50%';
        simVehicle.style.transform = 'translateY(-50%)';
        simBarrierArm.classList.remove('open');
        simRfidWave.classList.remove('pulse');
        simSensorP01.classList.remove('active');
        simStatusP01.textContent = 'AVAILABLE';
        simStatusP01.style.color = 'var(--text-dim)';

        simStepLabel.textContent = 'STEP 1: VEHICLE ARRIVING AT RFID CHECKPOINT...';
        simLogText.textContent = 'Telemetry: Vehicle detected at entry lane sensor.';

        setTimeout(() => {
            // Move car to RFID pedestal
            simVehicle.style.transition = 'left 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
            simVehicle.style.left = '45px';
        }, 50);

        // Step 2: RFID Scan
        setTimeout(() => {
            simStepLabel.textContent = 'STEP 2: RFID IDENTIFYING CARD...';
            simLogText.textContent = 'Telemetry: RFID Tag UID verified by ESP32. Access authorized ✓.';
            simRfidWave.classList.add('pulse');
        }, 1400);

        // Step 3: Barrier raises
        setTimeout(() => {
            simRfidWave.classList.remove('pulse');
            simBarrierArm.classList.add('open');
            simStepLabel.textContent = 'STEP 3: BARRIER OPENING...';
            if (barrierArmMesh) {
                // Also lift 3D barrier in Three.js
                barrierArmMesh.rotation.x = -Math.PI / 2.3;
            }
        }, 2200);

        // Step 4: Car drives to P01
        setTimeout(() => {
            simStepLabel.textContent = 'STEP 4: VEHICLE ENTERING & PARKING IN P01...';
            simVehicle.style.transition = 'left 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
            simVehicle.style.left = '320px';
        }, 3000);

        // Step 5: IR Sensor detection
        setTimeout(() => {
            simSensorP01.classList.add('active');
            simStatusP01.textContent = 'OCCUPIED';
            simStatusP01.style.color = 'var(--accent-danger)';
            simStepLabel.textContent = 'STEP 5: IR SENSOR ACTIVE — P01 OCCUPIED';
            simLogText.textContent = 'Telemetry: IR Proximity Sensor triggered. Session timer started for Slot P01.';
            showToast('Parking session started.');

            // Close barrier
            simBarrierArm.classList.remove('open');
            if (barrierArmMesh) {
                barrierArmMesh.rotation.x = 0;
            }
            isSimRunning = false;
        }, 4700);
    }

    if (replaySimBtn) {
        replaySimBtn.addEventListener('click', runAutonomousSimulation);
    }

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
        if (slotMeshes[slotId]) {
            slotMeshes[slotId].status = 'OCCUPIED';
            slotMeshes[slotId].pad.userData.status = 'OCCUPIED';
            slotMeshes[slotId].sensor.material.color.setHex(0xef4444);
            slotMeshes[slotId].sensor.material.emissive.setHex(0xef4444);
            slotMeshes[slotId].outline.material.color.setHex(0xef4444);

            // Add stylized car to slot
            const car = createStylizedCar(0x00f2fe);
            car.position.set(0, 0.5, 0);
            slotMeshes[slotId].group.add(car);
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
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'rgba(2, 4, 6, 0.95)';
            navLinks.style.padding = '1.5rem';
        });
    }
});

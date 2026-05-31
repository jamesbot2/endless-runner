// ===== SUBWAY SURFER CLONE - Three.js =====
// Full game implementation - no external assets needed

(function() {
    'use strict';

    // ========== CONSTANTS ==========
    const LANE_WIDTH = 2.2;
    const LANE_COUNT = 3;
    const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
    const START_SPEED = 0.18;
    const MAX_SPEED = 0.55;
    const SPEED_INCREMENT = 0.00008;
    const TRACK_SEGMENT_LENGTH = 24;
    const SPAWN_AHEAD = 140;
    const DESPAWN_BEHIND = 30;
    const GRAVITY = -0.45;
    const JUMP_VELOCITY = 0.55;
    const PLAYER_Y = 0.8;
    const ROLL_HEIGHT = 0.35;
    const COIN_RADIUS = 0.35;
    const GROUND_WIDTH = LANE_WIDTH * LANE_COUNT + 1;

    // ========== GAME STATE ==========
    const state = {
        score: 0,
        coins: 0,
        speed: START_SPEED,
        gameOver: false,
        currentLane: 1,
        isJumping: false,
        isRolling: false,
        jumpVelocity: 0,
        targetLane: 1,
        laneLerp: 1,
        running: true,
        playerHeight: PLAYER_Y,
        targetPlayerHeight: PLAYER_Y,
        lastObstacleZ: 0,
        minObstacleGap: 30,
        obstacleTimer: 0,
        trackSegments: [],
        obstacles: [],
        coinObjects: [],
        coinObstacleMap: new Map(),
        buildings: [],
        particles: [],
        cameraShake: 0,
        gameTime: 0,
        scoreTimer: 0,
        instructionTimer: 8,
        hasStartedTouch: false
    };

    // ========== THREE.JS SETUP ==========
    let scene, camera, renderer, clock;
    let directionLight, ambientLight;
    let player;
    let playerBody, playerHead, playerLeftArm, playerRightArm, playerLeftLeg, playerRightLeg;
    let groundMaterial, railMaterial, sleeperMaterial, buildingMaterial;

    // UI Elements
    let scoreEl, coinsEl, gameOverEl, finalScoreEl, finalCoinsEl, restartBtnEl, instructionsEl, speedEl;
    let uiOverlay;

    // ========== TEXTURE GENERATION ==========
    function generateGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Asphalt base
        ctx.fillStyle = '#3a3a3e';
        ctx.fillRect(0, 0, 512, 512);

        // Add noise grain
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = 40 + Math.random() * 30;
            ctx.fillStyle = `rgb(${shade},${shade},${shade + 2})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // Lane markings - dashed white lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([30, 20]);

        // Lane dividers
        const laneW = 512 / 3;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * laneW, 0);
            ctx.lineTo(i * laneW, 512);
            ctx.stroke();
        }

        // Side edges
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(8, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(504, 0);
        ctx.lineTo(504, 512);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 20);
        texture.anisotropy = 4;
        return texture;
    }

    function generateRailTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Metal base
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, '#5a4a3a');
        grad.addColorStop(0.3, '#8a7a6a');
        grad.addColorStop(0.5, '#9a9a8a');
        grad.addColorStop(0.7, '#8a7a6a');
        grad.addColorStop(1, '#5a4a3a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Cross ties (sleepers)
        ctx.fillStyle = '#4a3520';
        for (let i = 0; i < 12; i++) {
            const y = i * 22 + 5;
            ctx.fillRect(5, y, 246, 12);
            // Wood grain
            ctx.fillStyle = '#5a4530';
            ctx.fillRect(5, y + 3, 246, 2);
            ctx.fillRect(5, y + 7, 246, 1);
            ctx.fillStyle = '#4a3520';
        }

        // Rail tracks (two lines on top of sleepers)
        ctx.strokeStyle = '#6a6a7a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(30, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(226, 0);
        ctx.lineTo(226, 256);
        ctx.stroke();

        // Rail shine
        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(28, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(224, 0);
        ctx.lineTo(224, 256);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 8);
        return texture;
    }

    function generateBuildingTexture(variant) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const colors = [
            ['#c4956a', '#e8c8a0'], // Beige
            ['#b55a3a', '#c87a5a'], // Brick
            ['#8a9a7a', '#aabaaa'], // Sage
            ['#6a7a8a', '#8a9aaa'], // Blue-gray
            ['#9a7a5a', '#ba9a7a'], // Tan
            ['#7a5a5a', '#9a7a7a']  // Maroon
        ];
        const c = colors[variant % colors.length];

        // Base wall
        ctx.fillStyle = c[0];
        ctx.fillRect(0, 0, 256, 256);

        // Brick/panel pattern
        ctx.strokeStyle = c[1];
        ctx.lineWidth = 1;
        for (let row = 0; row < 16; row++) {
            const y = row * 16;
            const offset = (row % 2) * 8;
            for (let col = 0; col < 16; col++) {
                const x = col * 16 + offset - (row % 2) * 8;
                ctx.strokeRect(x, y, 16, 16);
            }
        }

        // Windows
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = col * 64 + 10;
                const y = row * 64 + 12;
                // Window frame
                ctx.fillStyle = '#2a3a4a';
                ctx.fillRect(x, y, 44, 40);
                // Window glass (some lit, some dark)
                const lit = Math.random() > 0.4;
                ctx.fillStyle = lit ? '#4a6a8a' : '#1a2a3a';
                ctx.fillRect(x + 4, y + 4, 36, 32);
                // Window cross
                ctx.strokeStyle = 'rgba(200,200,200,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 22, y + 4);
                ctx.lineTo(x + 22, y + 36);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 4, y + 20);
                ctx.lineTo(x + 40, y + 20);
                ctx.stroke();
                // Lit glow
                if (lit) {
                    ctx.fillStyle = 'rgba(200,220,255,0.08)';
                    ctx.fillRect(x + 4, y + 4, 36, 32);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        return texture;
    }

    function generateTrainTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const colors = ['#cc3333', '#3366cc', '#ccaa22', '#33aa55', '#cc6633', '#8833cc'];
        const mainColor = colors[Math.floor(Math.random() * colors.length)];

        // Main body
        ctx.fillStyle = mainColor;
        ctx.fillRect(0, 0, 256, 256);

        // Horizontal stripe
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 80, 256, 30);
        ctx.fillRect(0, 160, 256, 30);

        // Windows
        ctx.fillStyle = '#5a8aaa';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(15 + i * 48, 100, 30, 50);
        }

        // Panel lines
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const x = i * 43;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 256);
            ctx.stroke();
        }

        // Rust/dirt bottom
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 210, 256, 46);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    function generateCoinTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Gradient circle for gold coin
        const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 58);
        grad.addColorStop(0, '#fff5a0');
        grad.addColorStop(0.2, '#ffd700');
        grad.addColorStop(0.5, '#daa520');
        grad.addColorStop(0.8, '#b8860b');
        grad.addColorStop(1, '#8b6914');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(64, 64, 58, 0, Math.PI * 2);
        ctx.fill();

        // Edge bevel
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = 'rgba(255,255,200,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(64, 64, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Star/icon in center
        ctx.fillStyle = 'rgba(255,200,0,0.3)';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 64, 66);

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(45, 40, 20, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // ========== SCENE SETUP ==========
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 80, 200);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        camera.position.set(0, 6, 8);
        camera.lookAt(0, 0, -10);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        document.body.appendChild(renderer.domElement);

        // Lighting
        ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.6);
        scene.add(hemisphereLight);

        directionLight = new THREE.DirectionalLight(0xffeedd, 1.2);
        directionLight.position.set(20, 30, 10);
        directionLight.castShadow = true;
        directionLight.shadow.mapSize.width = 2048;
        directionLight.shadow.mapSize.height = 2048;
        directionLight.shadow.camera.near = 0.5;
        directionLight.shadow.camera.far = 100;
        directionLight.shadow.camera.left = -20;
        directionLight.shadow.camera.right = 20;
        directionLight.shadow.camera.top = 20;
        directionLight.shadow.camera.bottom = -20;
        scene.add(directionLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-15, 10, -10);
        scene.add(fillLight);

        clock = new THREE.Clock();

        window.addEventListener('resize', onResize);
    }

    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    // ========== PLAYER ==========
    function createPlayer() {
        player = new THREE.Group();
        player.position.set(0, 0, 0);

        const bodyGeo = new THREE.BoxGeometry(0.6, 0.7, 0.4);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255aa });
        playerBody = new THREE.Mesh(bodyGeo, bodyMat);
        playerBody.position.y = 0.7;
        playerBody.castShadow = true;
        player.add(playerBody);

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        playerHead = new THREE.Mesh(headGeo, headMat);
        playerHead.position.set(0, 1.15, 0);
        playerHead.castShadow = true;
        player.add(playerHead);

        // Beanie/cap
        const capGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.1, 8);
        const capMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(0, 1.3, 0);
        cap.rotation.x = 0.1;
        player.add(cap);

        const brimGeo = new THREE.BoxGeometry(0.32, 0.03, 0.2);
        const brimMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        const brim = new THREE.Mesh(brimGeo, brimMat);
        brim.position.set(0, 1.32, 0.18);
        brim.rotation.x = 0.2;
        player.add(brim);

        // Left arm
        const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        playerLeftArm = new THREE.Mesh(armGeo, armMat);
        playerLeftArm.position.set(-0.4, 0.85, 0);
        player.add(playerLeftArm);

        // Right arm
        playerRightArm = new THREE.Mesh(armGeo.clone(), armMat);
        playerRightArm.position.set(0.4, 0.85, 0);
        player.add(playerRightArm);

        // Left leg
        const legGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x224488 });
        playerLeftLeg = new THREE.Mesh(legGeo, legMat);
        playerLeftLeg.position.set(-0.15, 0.2, 0);
        player.add(playerLeftLeg);

        // Right leg
        playerRightLeg = new THREE.Mesh(legGeo.clone(), legMat);
        playerRightLeg.position.set(0.15, 0.2, 0);
        player.add(playerRightLeg);

        // Backpack
        const packGeo = new THREE.BoxGeometry(0.4, 0.45, 0.2);
        const packMat = new THREE.MeshLambertMaterial({ color: 0xcc6622 });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.8, -0.3);
        player.add(pack);

        scene.add(player);
        return player;
    }

    // ========== TRACK SYSTEM ==========
    function createTrackSegment(zPos) {
        const group = new THREE.Group();
        group.position.z = zPos;

        // Ground
        const groundGeo = new THREE.BoxGeometry(GROUND_WIDTH, 0.2, TRACK_SEGMENT_LENGTH);
        if (!groundMaterial) {
            groundMaterial = new THREE.MeshLambertMaterial({ map: generateGroundTexture() });
        }
        const ground = new THREE.Mesh(groundGeo, groundMaterial);
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        ground.castShadow = true;
        group.add(ground);

        // Rails (decorative on sides)
        if (!railMaterial) {
            railMaterial = new THREE.MeshLambertMaterial({ map: generateRailTexture() });
        }
        const railGeo = new THREE.BoxGeometry(0.15, 0.2, TRACK_SEGMENT_LENGTH - 1);

        // Left rail area
        const railMat2 = new THREE.MeshLambertMaterial({ color: 0x7a7a8a });
        for (let side = -1; side <= 1; side += 2) {
            const railSide = new THREE.Mesh(railGeo, railMat2);
            railSide.position.set(side * (GROUND_WIDTH / 2 - 0.4), 0.05, 0);
            railSide.receiveShadow = true;
            group.add(railSide);

            // Sleepers
            const sleeperGeo = new THREE.BoxGeometry(0.8, 0.05, 0.15);
            if (!sleeperMaterial) {
                sleeperMaterial = new THREE.MeshLambertMaterial({ color: 0x5a3a20 });
            }
            for (let i = -TRACK_SEGMENT_LENGTH/2; i < TRACK_SEGMENT_LENGTH/2; i += 1.8) {
                const sleeper = new THREE.Mesh(sleeperGeo, sleeperMaterial);
                sleeper.position.set(side * (GROUND_WIDTH / 2 - 0.4), -0.02, i);
                sleeper.receiveShadow = true;
                group.add(sleeper);
            }
        }

        // Side walls / curbs
        const curbMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
        for (let side = -1; side <= 1; side += 2) {
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.3, TRACK_SEGMENT_LENGTH),
                curbMat
            );
            curb.position.set(side * (GROUND_WIDTH / 2 + 0.25), 0.1, 0);
            curb.receiveShadow = true;
            curb.castShadow = true;
            group.add(curb);
        }

        return group;
    }

    // ========== BUILDINGS ==========
    function createBuilding(x, z) {
        const height = 3 + Math.random() * 8;
        const width = 1.8 + Math.random() * 1.5;
        const depth = 1.8 + Math.random() * 1.5;
        const variant = Math.floor(Math.random() * 6);

        const mat = new THREE.MeshLambertMaterial({ map: generateBuildingTexture(variant) });
        const geo = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(geo, mat);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;

        // Roof details
        const roofMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.08 + Math.random() * 0.05, 0.1, 0.25)
        });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.1, depth + 0.1), roofMat);
        roof.position.y = height;
        building.add(roof);

        scene.add(building);
        return building;
    }

    // ========== OBSTACLES ==========
    function createTrain(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        // Train body - main car
        const bodyMat = new THREE.MeshLambertMaterial({ map: generateTrainTexture() });
        const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 0.9, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Roof
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xd0d0d0 });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 5.8), roofMat);
        roof.position.set(0, 1.85, 0);
        group.add(roof);

        // Bottom frame / wheels area
        const frameMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 5.6), frameMat);
        frame.position.set(0, 0.1, 0);
        group.add(frame);

        // Wheels
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        for (let side = -1; side <= 1; side += 2) {
            for (let wx = -1; wx <= 1; wx += 2) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side * 1.1, 0.15, wx * 2.2);
                group.add(wheel);
            }
        }

        // Headlights
        const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffaa });
        for (let side = -1; side <= 1; side += 2) {
            const light = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), lightMat);
            light.position.set(side * 0.8, 0.6, 3.1);
            group.add(light);
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'train', lane: lane, width: 2.0, height: 1.8, depth: 5.5 };
        return group;
    }

    function createBarrier(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        const colors = [0xcc6622, 0xdd8833, 0xbb5522, 0xcc7744];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = new THREE.MeshLambertMaterial({ color: color });

        // Barrier body
        const geo = new THREE.BoxGeometry(1.6, 0.6, 1.0);
        const barrier = new THREE.Mesh(geo, mat);
        barrier.position.set(0, 0.3, 0);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        group.add(barrier);

        // Reflective stripes
        const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.9), stripeMat);
        stripe.position.set(0, 0.5, 0);
        group.add(stripe);

        // Warning pattern (small triangles - simplified as boxes)
        const warnMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
        for (let side = -1; side <= 1; side += 2) {
            const warn = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.08), warnMat);
            warn.position.set(side * 0.6, 0.25, 0.55);
            group.add(warn);
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'barrier', lane: lane, width: 1.6, height: 0.6, depth: 1.0 };
        return group;
    }

    function createRollUnderTrain(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        // Train body - raised to create gap underneath
        const bodyMat = new THREE.MeshLambertMaterial({ map: generateTrainTexture() });
        const bodyGeo = new THREE.BoxGeometry(2.4, 1.2, 6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 1.4, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Roof
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xd0d0d0 });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 5.8), roofMat);
        roof.position.set(0, 2.0, 0);
        group.add(roof);

        // Side walls (but open bottom)
        const sideMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (let side = -1; side <= 1; side += 2) {
            const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 5.6), sideMat);
            sideWall.position.set(side * 1.2, 1.2, 0);
            group.add(sideWall);
        }

        // Wheels
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        for (let side = -1; side <= 1; side += 2) {
            for (let wx = -1; wx <= 1; wx += 2) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side * 1.0, 0.65, wx * 2.0);
                group.add(wheel);
            }
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'roll_under', lane: lane, width: 2.0, height: 0.9, depth: 5.5, rollThreshold: 0.5 };
        return group;
    }

    // ========== COINS ==========
    function createCoin(lane, zPos, yOffset) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        const coinMat = new THREE.MeshStandardMaterial({
            map: generateCoinTexture(),
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x442200,
            emissiveIntensity: 0.1
        });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.08, 12), coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, 0.6 + (yOffset || 0), 0);
        coin.castShadow = true;
        group.add(coin);

        // Glow halo
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(new THREE.RingGeometry(COIN_RADIUS * 0.8, COIN_RADIUS * 1.3, 12), glowMat);
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, 0.6 + (yOffset || 0), 0);
        group.add(glow);

        group.position.set(laneX, 0, zPos);
        group.userData = { lane: lane, collected: false };
        return group;
    }

    function createCoinPattern(lane, zPos, pattern) {
        const coins = [];
        const patterns = {
            line: () => {
                for (let i = 0; i < 5; i++) {
                    coins.push(createCoin(lane, zPos - i * 2.5, Math.sin(i * 0.8) * 0.3));
                }
            },
            arc: () => {
                for (let i = 0; i < 7; i++) {
                    const angle = (i / 6) * Math.PI;
                    const l = Math.max(0, Math.min(2, lane + Math.round(Math.sin(angle * 2) * 1.5)));
                    coins.push(createCoin(l, zPos - i * 2, 0.4));
                }
            },
            double: () => {
                for (let i = 0; i < 4; i++) {
                    coins.push(createCoin(lane, zPos - i * 2, 0.3));
                    const sideLane = Math.max(0, Math.min(2, lane + (i % 2 === 0 ? 1 : -1)));
                    coins.push(createCoin(sideLane, zPos - i * 2, 0.1));
                }
            },
            single: () => {
                coins.push(createCoin(lane, zPos, 0.3));
            }
        };

        const fn = patterns[pattern] || patterns.single;
        fn();
        return coins;
    }

    // ========== PARTICLES ==========
    function createCoinParticles(position) {
        const colors = [0xffd700, 0xffaa00, 0xffee00];
        for (let i = 0; i < 12; i++) {
            const size = 0.05 + Math.random() * 0.08;
            const mat = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat);
            particle.position.copy(position);
            particle.userData = {
                vx: (Math.random() - 0.5) * 0.3,
                vy: Math.random() * 0.2 + 0.1,
                vz: (Math.random() - 0.5) * 0.3,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                type: 'coin'
            };
            scene.add(particle);
            state.particles.push(particle);
        }
    }

    function createCrashParticles(position) {
        const colors = [0xff4444, 0xff8800, 0xffcc00, 0xffffff];
        for (let i = 0; i < 25; i++) {
            const size = 0.05 + Math.random() * 0.12;
            const mat = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat);
            particle.position.copy(position);
            const speed = 0.2 + Math.random() * 0.4;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 2;
            particle.userData = {
                vx: Math.cos(theta) * Math.sin(phi) * speed,
                vy: Math.random() * 0.3 + 0.2,
                vz: Math.sin(theta) * Math.sin(phi) * speed,
                life: 1.0,
                decay: 0.008 + Math.random() * 0.015,
                type: 'crash'
            };
            scene.add(particle);
            state.particles.push(particle);
        }
    }

    // ========== AUDIO ==========
    let audioCtx = null;

    function initAudio() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            audioCtx = null;
        }
    }

    function playCoinSound() {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } catch(e) {}
    }

    function playCrashSound() {
        if (!audioCtx) return;
        try {
            const bufferSize = audioCtx.sampleRate * 0.4;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, audioCtx.currentTime);
            filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            source.start(audioCtx.currentTime);
        } catch(e) {}
    }

    function playJumpSound() {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch(e) {}
    }

    function playRollSound() {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch(e) {}
    }

    // ========== SPAWNING ==========
    function spawnInitialTrack() {
        for (let z = 0; z > -SPAWN_AHEAD; z -= TRACK_SEGMENT_LENGTH) {
            const seg = createTrackSegment(z);
            scene.add(seg);
            state.trackSegments.push(seg);
        }
    }

    function spawnBuildings() {
        // Remove old buildings beyond despawn range
        for (let i = state.buildings.length - 1; i >= 0; i--) {
            if (state.buildings[i].position.z > DESPAWN_BEHIND) {
                scene.remove(state.buildings[i]);
                state.buildings.splice(i, 1);
            }
        }

        // Spawn new buildings ahead
        const farthestZ = state.buildings.length > 0
            ? Math.min(...state.buildings.map(b => b.position.z))
            : 0;

        for (let z = farthestZ; z > -SPAWN_AHEAD; z -= 6 + Math.random() * 8) {
            if (z > farthestZ) continue;
            // Both sides
            for (let side = -1; side <= 1; side += 2) {
                if (Math.random() > 0.3) {
                    const x = side * (GROUND_WIDTH / 2 + 2 + Math.random() * 3);
                    const building = createBuilding(x, z);
                    state.buildings.push(building);
                }
            }
        }
    }

    function spawnObstacles() {
        // Remove old obstacles
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            if (state.obstacles[i].position.z > DESPAWN_BEHIND) {
                scene.remove(state.obstacles[i]);
                state.obstacles.splice(i, 1);
            }
        }

        // Determine farthest obstacle or last track
        let farthestZ = -SPAWN_AHEAD;
        for (const obs of state.obstacles) {
            if (obs.position.z < farthestZ) farthestZ = obs.position.z;
        }

        // Spawn new obstacles
        while (farthestZ > -SPAWN_AHEAD) {
            const gap = state.minObstacleGap + Math.random() * 20 - state.speed * 30;
            const z = farthestZ - Math.max(gap, 15);
            if (z < -SPAWN_AHEAD) break;

            const lane = Math.floor(Math.random() * 3);
            const type = Math.random();

            let obstacle;
            if (type < 0.45) {
                obstacle = createTrain(lane, z);
            } else if (type < 0.75) {
                obstacle = createBarrier(lane, z);
            } else {
                obstacle = createRollUnderTrain(lane, z);
            }

            scene.add(obstacle);
            state.obstacles.push(obstacle);
            state.lastObstacleZ = z;
            farthestZ = z;

            // Update coin-obstacle map
            state.coinObstacleMap.set(obstacle.uuid, []);

            // Spawn coins in non-occupied lanes near obstacles
            const coinChance = Math.random();
            if (coinChance < 0.5) {
                // Single coin
                let coinLane = Math.floor(Math.random() * 3);
                while (coinLane === lane && Math.random() > 0.3) {
                    coinLane = (coinLane + 1) % 3;
                }
                const coin = createCoin(coinLane, z - 3 - Math.random() * 5, 0.3);
                scene.add(coin);
                state.coinObjects.push(coin);
                state.coinObstacleMap.get(obstacle.uuid).push(coin);
            } else if (coinChance < 0.7) {
                // Coin pattern
                let coinLane = Math.floor(Math.random() * 3);
                while (coinLane === lane && Math.random() > 0.4) {
                    coinLane = (coinLane + 1) % 3;
                }
                const patterns = ['line', 'line', 'arc', 'double'];
                const pattern = patterns[Math.floor(Math.random() * patterns.length)];
                const coins = createCoinPattern(coinLane, z - 4, pattern);
                for (const c of coins) {
                    scene.add(c);
                    state.coinObjects.push(c);
                    state.coinObstacleMap.get(obstacle.uuid).push(c);
                }
            }
        }
    }

    // ========== UI SETUP ==========
    function setupUI() {
        uiOverlay = document.createElement('div');
        uiOverlay.id = 'ui-overlay';

        // Score display
        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        scoreDiv.innerHTML = '<span class="coins-label">🪙 <span id="coin-count">0</span></span> &nbsp;|&nbsp; <span class="dist-label">🏃 <span id="distance-count">0</span>m</span>';
        uiOverlay.appendChild(scoreDiv);
        scoreEl = document.getElementById('distance-count');
        coinsEl = document.getElementById('coin-count');

        // Speed indicator
        const speedDiv = document.createElement('div');
        speedDiv.id = 'speed-indicator';
        speedDiv.textContent = 'SPD: 1x';
        speedDiv.id = 'speed-indicator';
        uiOverlay.appendChild(speedDiv);

        // Game over screen
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';
        gameOverDiv.innerHTML = `
            <h1>GAME OVER</h1>
            <div class="final-score">Distance: <span id="final-distance">0</span>m</div>
            <div class="final-coins">Coins: <span id="final-coins">0</span></div>
            <div class="restart-btn" id="restart-btn">TAP TO RETRY</div>
        `;
        uiOverlay.appendChild(gameOverDiv);
        gameOverEl = gameOverDiv;
        finalScoreEl = document.getElementById('final-distance');
        finalCoinsEl = document.getElementById('final-coins');
        restartBtnEl = document.getElementById('restart-btn');

        // Instructions
        const instrDiv = document.createElement('div');
        instrDiv.id = 'instructions';
        instrDiv.innerHTML = `
            <span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;
            <span class="key">↑</span> Jump &nbsp;|&nbsp;
            <span class="key">↓</span> Roll<br>
            Swipe on mobile
        `;
        uiOverlay.appendChild(instrDiv);
        instructionsEl = instrDiv;

        document.body.appendChild(uiOverlay);

        // Restart button
        restartBtnEl.addEventListener('click', restartGame);
        restartBtnEl.addEventListener('touchend', (e) => { e.preventDefault(); restartGame(); });
    }

    // ========== CONTROLS ==========
    const keys = {};

    function setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            handleKeyInput(e.key);
        });
        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        // Touch
        let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
        let isTouching = false;

        document.addEventListener('touchstart', (e) => {
            if (state.gameOver) return;
            const touch = e.changedTouches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            isTouching = true;
            state.hasStartedTouch = true;

            if (!audioCtx) initAudio();

            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (state.gameOver) return;
            if (!isTouching) return;
            isTouching = false;

            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            const elapsed = Date.now() - touchStartTime;

            // Swipe detection
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 0.7) {
                if (dx > 0) moveRight();
                else moveLeft();
            } else if (dy < -40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                jump();
            } else if (dy > 40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                roll();
            } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && elapsed < 300) {
                // Tap - check horizontal position for lane change
                const third = window.innerWidth / 3;
                if (touch.clientX < third) moveLeft();
                else if (touch.clientX > third * 2) moveRight();
                else jump();
            }

            e.preventDefault();
        }, { passive: false });
    }

    function handleKeyInput(key) {
        if (state.gameOver) return;

        if (!audioCtx) initAudio();

        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                moveRight();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
            case ' ':
                jump();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                roll();
                break;
        }
    }

    function moveLeft() {
        if (state.currentLane > 0) {
            state.currentLane--;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function moveRight() {
        if (state.currentLane < LANE_COUNT - 1) {
            state.currentLane++;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function jump() {
        if (!state.isJumping && !state.isRolling) {
            state.isJumping = true;
            state.jumpVelocity = JUMP_VELOCITY;
            playJumpSound();
        }
    }

    function roll() {
        if (!state.isJumping && !state.isRolling) {
            state.isRolling = true;
            state.targetPlayerHeight = ROLL_HEIGHT;
            playRollSound();
            // Auto end roll after short time
            setTimeout(() => {
                if (state.isRolling) {
                    state.isRolling = false;
                    state.targetPlayerHeight = PLAYER_Y;
                }
            }, 500);
        }
    }

    // ========== COLLISION DETECTION ==========
    function checkCollisions() {
        const playerPos = player.position;
        const playerLane = state.currentLane;
        const playerX = LANE_POSITIONS[playerLane];
        const playerHitbox = {
            x: playerX,
            y: state.isRolling ? ROLL_HEIGHT / 2 : state.isJumping ? PLAYER_Y : PLAYER_Y,
            z: playerPos.z,
            w: 0.5,
            h: state.isRolling ? ROLL_HEIGHT * 0.8 : 1.4,
            d: 0.4
        };

        for (const obs of state.obstacles) {
            const od = obs.userData;
            const obsBox = {
                x: obs.position.x,
                y: obs.position.y + (od.height || 0.6) / 2,
                z: obs.position.z,
                w: od.width || 1.6,
                h: od.height || 0.6,
                d: od.depth || 1.0
            };

            // For roll_under obstacles, check if player is rolling
            if (od.type === 'roll_under' && state.isRolling) {
                // Player rolling can pass under
                continue;
            }

            // AABB collision
            const dx = Math.abs(playerHitbox.x - obsBox.x);
            const dz = Math.abs(playerHitbox.z - obsBox.z);
            const dy = Math.abs(playerHitbox.y - obsBox.y);

            // Extend Z detection slightly for trains (longer)
            const zThreshold = (playerHitbox.d + obsBox.d) / 2 + 0.2;

            if (dx < (playerHitbox.w + obsBox.w) / 2 &&
                dz < zThreshold &&
                dy < (playerHitbox.h + obsBox.h) / 2) {
                // COLLISION!
                return true;
            }
        }
        return false;
    }

    // ========== GAME FLOW ==========
    function restartGame() {
        // Remove all dynamic objects
        for (const obj of state.trackSegments) scene.remove(obj);
        for (const obj of state.obstacles) scene.remove(obj);
        for (const obj of state.coinObjects) scene.remove(obj);
        for (const obj of state.buildings) scene.remove(obj);
        for (const obj of state.particles) scene.remove(obj);

        // Reset state
        state.score = 0;
        state.coins = 0;
        state.speed = START_SPEED;
        state.gameOver = false;
        state.currentLane = 1;
        state.targetLane = 1;
        state.laneLerp = 1;
        state.isJumping = false;
        state.isRolling = false;
        state.jumpVelocity = 0;
        state.playerHeight = PLAYER_Y;
        state.targetPlayerHeight = PLAYER_Y;
        state.lastObstacleZ = 0;
        state.gameTime = 0;
        state.scoreTimer = 0;
        state.instructionTimer = 8;
        state.cameraShake = 0;
        state.trackSegments = [];
        state.obstacles = [];
        state.coinObjects = [];
        state.coinObstacleMap = new Map();
        state.buildings = [];
        state.particles = [];
        state.hasStartedTouch = false;

        // Reset player
        player.position.set(0, 0, 0);
        player.rotation.set(0, 0, 0);
        player.scale.set(1, 1, 1);

        // Reset camera
        camera.position.set(0, 6, 8);
        camera.lookAt(0, 0, -10);

        // Hide game over
        gameOverEl.classList.remove('visible');

        // Clear obstacles map
        state.coinObstacleMap = new Map();

        // Spawn fresh
        spawnInitialTrack();
        spawnBuildings();
        spawnObstacles();
    }

    function gameOver() {
        state.gameOver = true;
        state.running = false;

        // Camera shake
        state.cameraShake = 0.5;

        // Particles
        createCrashParticles(player.position.clone());

        // Sound
        playCrashSound();

        // UI
        finalScoreEl.textContent = Math.floor(state.score);
        finalCoinsEl.textContent = state.coins;
        gameOverEl.classList.add('visible');
    }

    // ========== UPDATE LOOP ==========
    function update() {
        if (state.gameOver) {
            // Game over animation - camera shake decay
            if (state.cameraShake > 0) {
                state.cameraShake *= 0.95;
                if (state.cameraShake < 0.01) state.cameraShake = 0;
            }
            updateCamera();
            renderer.render(scene, camera);
            return;
        }

        const delta = Math.min(clock.getDelta(), 0.05);
        state.gameTime += delta;

        // Speed increase
        if (state.speed < MAX_SPEED) {
            state.speed += SPEED_INCREMENT * delta * 60;
            if (state.speed > MAX_SPEED) state.speed = MAX_SPEED;
        }

        // Score
        state.scoreTimer += delta;
        if (state.scoreTimer > 0.1) {
            state.score += 0.1 / state.scoreTimer > 0.5 ? 1 : 0.5;
            state.scoreTimer = 0;
        }

        // Update score display
        if (scoreEl) scoreEl.textContent = Math.floor(state.score);
        if (coinsEl) coinsEl.textContent = state.coins;

        // Speed indicator
        const speedEl = document.getElementById('speed-indicator');
        if (speedEl) {
            const speedLevel = Math.floor((state.speed - START_SPEED) / (MAX_SPEED - START_SPEED) * 10) + 1;
            speedEl.textContent = `SPD: ${Math.min(speedLevel, 10)}x`;
            speedEl.style.color = speedLevel > 7 ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.5)';
        }

        // Instructions fade
        if (state.instructionTimer > 0) {
            state.instructionTimer -= delta;
            if (state.instructionTimer <= 0) {
                instructionsEl.style.opacity = '0';
            } else if (state.instructionTimer < 3) {
                instructionsEl.style.opacity = state.instructionTimer / 3;
            }
        }

        // Move track segments
        for (const seg of state.trackSegments) {
            seg.position.z += state.speed;
        }

        // Recycle track segments
        for (let i = state.trackSegments.length - 1; i >= 0; i--) {
            if (state.trackSegments[i].position.z > TRACK_SEGMENT_LENGTH) {
                state.trackSegments[i].position.z -= TRACK_SEGMENT_LENGTH * state.trackSegments.length;
            }
        }

        // Move obstacles
        for (const obs of state.obstacles) {
            obs.position.z += state.speed;
        }

        // Move coins
        for (const coin of state.coinObjects) {
            coin.position.z += state.speed;
            // Spin
            coin.rotation.y += delta * 3;
            // Bob
            const children = coin.children;
            if (children.length > 0) {
                children[0].position.y = 0.6 + Math.sin(state.gameTime * 2 + coin.id) * 0.1;
                if (children[1] && children[1].type === 'RingGeometry') {
                    children[1].position.y = 0.6 + Math.sin(state.gameTime * 2 + coin.id) * 0.1;
                }
            }
        }

        // Move buildings
        for (const b of state.buildings) {
            b.position.z += state.speed;
        }

        // Move particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            const ud = p.userData;
            p.position.x += ud.vx;
            p.position.y += ud.vy;
            p.position.z += ud.vz;
            ud.vy -= 0.003; // gravity on particles
            ud.life -= ud.decay;
            p.material.opacity = Math.max(0, ud.life);
            p.scale.setScalar(ud.life);
            if (ud.life <= 0) {
                scene.remove(p);
                state.particles.splice(i, 1);
            }
        }

        // Player lane movement (smooth lerp)
        if (state.laneLerp < 1) {
            state.laneLerp += delta * 10;
            if (state.laneLerp > 1) state.laneLerp = 1;
            const targetX = LANE_POSITIONS[state.targetLane];
            const startX = LANE_POSITIONS[state.targetLane - (state.targetLane > state.currentLane ? 1 : -1)];
            player.position.x = startX + (targetX - startX) * easeOutQuad(state.laneLerp);
        }

        // Jump physics
        if (state.isJumping) {
            state.playerHeight += state.jumpVelocity;
            state.jumpVelocity += GRAVITY * delta * 60;
            if (state.playerHeight <= PLAYER_Y) {
                state.playerHeight = PLAYER_Y;
                state.isJumping = false;
                state.jumpVelocity = 0;
            }
        }

        // Roll height
        if (state.isRolling) {
            state.playerHeight += (state.targetPlayerHeight - state.playerHeight) * 0.2;
            if (Math.abs(state.playerHeight - state.targetPlayerHeight) < 0.01) {
                state.playerHeight = state.targetPlayerHeight;
            }
        } else if (!state.isJumping) {
            state.playerHeight += (PLAYER_Y - state.playerHeight) * 0.2;
            if (Math.abs(state.playerHeight - PLAYER_Y) < 0.01) {
                state.playerHeight = PLAYER_Y;
            }
        }

        // Apply player height
        player.position.y = state.playerHeight;

        // Scale for roll
        if (state.isRolling) {
            const scaleY = (ROLL_HEIGHT + 0.2) / (PLAYER_Y + 0.2);
            player.scale.y = 1 - (1 - scaleY) * 0.7;
            player.position.y = state.playerHeight;
        } else {
            player.scale.y += (1 - player.scale.y) * 0.15;
        }

        // Running animation
        const runCycle = state.gameTime * 8;
        if (!state.isJumping) {
            const bobAmount = 0.04;
            player.position.y += Math.sin(runCycle) * bobAmount;
        }

        // Arm swing
        if (playerLeftArm && playerRightArm) {
            playerLeftArm.rotation.x = Math.sin(runCycle) * 0.4;
            playerRightArm.rotation.x = Math.sin(runCycle + Math.PI) * 0.4;
        }

        // Leg swing
        if (playerLeftLeg && playerRightLeg) {
            playerLeftLeg.rotation.x = Math.sin(runCycle + Math.PI) * 0.3;
            playerRightLeg.rotation.x = Math.sin(runCycle) * 0.3;
        }

        // Body lean during lane change
        const targetX = LANE_POSITIONS[state.targetLane];
        const leanTarget = (player.position.x - targetX) * 0.3;
        player.rotation.z += (leanTarget - player.rotation.z) * 0.1;

        // Coin collection
        for (let i = state.coinObjects.length - 1; i >= 0; i--) {
            const coin = state.coinObjects[i];
            const coinLane = coin.userData.lane;
            const coinX = LANE_POSITIONS[coinLane];
            const dx = Math.abs(player.position.x - coinX);
            const dz = Math.abs(player.position.z - coin.position.z);

            if (dx < 0.8 && dz < 0.8 && !coin.userData.collected) {
                coin.userData.collected = true;
                // Animated collection
                createCoinParticles(coin.position.clone());
                state.coins++;
                playCoinSound();
                scene.remove(coin);
                state.coinObjects.splice(i, 1);
            }

            // Remove if too far behind
            if (coin.position.z > DESPAWN_BEHIND) {
                scene.remove(coin);
                state.coinObjects.splice(i, 1);
            }
        }

        // Spawn new obstacles and buildings
        spawnObstacles();
        spawnBuildings();

        // Collision detection
        if (checkCollisions()) {
            gameOver();
            updateCamera();
            renderer.render(scene, camera);
            return;
        }

        // Camera follow
        updateCamera();
    }

    function easeOutQuad(t) {
        return t * (2 - t);
    }

    function updateCamera() {
        const targetCameraPos = {
            x: player.position.x * 0.4,
            y: state.isRolling ? 5.5 : 6,
            z: player.position.z + 8
        };

        // Shake
        let shakeOffset = { x: 0, y: 0, z: 0 };
        if (state.cameraShake > 0.01) {
            shakeOffset.x = (Math.random() - 0.5) * state.cameraShake * 0.3;
            shakeOffset.y = (Math.random() - 0.5) * state.cameraShake * 0.3;
            shakeOffset.z = (Math.random() - 0.5) * state.cameraShake * 0.1;
        }

        camera.position.x += (targetCameraPos.x + shakeOffset.x - camera.position.x) * 0.08;
        camera.position.y += (targetCameraPos.y + shakeOffset.y - camera.position.y) * 0.08;
        camera.position.z += (targetCameraPos.z + shakeOffset.z - camera.position.z) * 0.08;

        const targetLook = new THREE.Vector3(
            player.position.x * 0.3,
            0.5,
            player.position.z - 8
        );
        camera.lookAt(targetLook);
    }

    // ========== RENDER LOOP ==========
    function animate() {
        requestAnimationFrame(animate);
        update();
        renderer.render(scene, camera);
    }

    // ========== INIT ==========
    function init() {
        initScene();
        setupUI();
        createPlayer();
        spawnInitialTrack();
        spawnBuildings();
        spawnObstacles();
        setupControls();

        // Initial camera
        camera.position.set(0, 6, 8);
        camera.lookAt(0, 0, -10);

        // Show score
        if (scoreEl) scoreEl.textContent = '0';
        if (coinsEl) coinsEl.textContent = '0';

        animate();
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

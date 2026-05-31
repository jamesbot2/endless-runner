// ===== SUBWAY SURFER CLONE - Three.js =====
// Full game implementation - no external assets needed

(function() {
    'use strict';

    // ========== CONSTANTS ==========
    const LANE_WIDTH = 2.2;
    const LANE_COUNT = 3;
    const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
    const START_SPEED = 0.35;
    const MAX_SPEED = 2.25;
    const SPEED_INCREMENT = 0.0005;
    const TRACK_SEGMENT_LENGTH = 24;
    const SPAWN_AHEAD = 200;
    const DESPAWN_BEHIND = 30;
    const GRAVITY = -0.012;
    const JUMP_VELOCITY = 0.19;
    const PLAYER_Y = 0.15;
    const ROLL_HEIGHT = 0;
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
        hasStartedTouch: false,
        started: false,
        paused: false,
        startLaneX: 0,
        bestScore: parseInt(localStorage.getItem('subwayBest') || '0'),
        onRoof: false
    };

    // ========== THREE.JS SETUP ==========
    let scene, camera, renderer, clock;
    let directionLight, ambientLight;
    let player;
    let playerBody, playerHead, playerLeftArm, playerRightArm, playerLeftLeg, playerRightLeg;

    // UI Elements
    let scoreEl, coinsEl, gameOverEl, finalScoreEl, finalCoinsEl, restartBtnEl, instructionsEl, speedEl;
    let menuOverlay, pauseOverlay, pauseBtnEl;
    let uiOverlay;

    // ========== TEXTURE GENERATION ==========





    // ========== DISPOSE HELPER ==========
    function disposeObject(obj) {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        if (obj.children) {
            for (let i = obj.children.length - 1; i >= 0; i--) {
                disposeObject(obj.children[i]);
            }
        }
    }

    // ========== SCENE SETUP ==========
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 60, 120);

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 5, 7);
        camera.lookAt(0, 0, -8);

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        document.body.appendChild(renderer.domElement);

        ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.5);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 5);
        scene.add(dirLight);

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

        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255aa });
        playerBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), bodyMat);
        playerBody.position.y = 0.7;
        player.add(playerBody);

        const headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), headMat);
        playerHead.position.set(0, 1.15, 0);
        player.add(playerHead);

        const capMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 6), capMat);
        cap.position.set(0, 1.3, 0);
        player.add(cap);

        const armMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        playerLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat);
        playerLeftArm.position.set(-0.4, 0.85, 0);
        player.add(playerLeftArm);
        playerRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat);
        playerRightArm.position.set(0.4, 0.85, 0);
        player.add(playerRightArm);

        const legMat = new THREE.MeshLambertMaterial({ color: 0x224488 });
        playerLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat);
        playerLeftLeg.position.set(-0.15, 0.2, 0);
        player.add(playerLeftLeg);
        playerRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat);
        playerRightLeg.position.set(0.15, 0.2, 0);
        player.add(playerRightLeg);

        const pack = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.45, 0.2),
            new THREE.MeshLambertMaterial({ color: 0xcc6622 })
        );
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
        const groundMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4e });
        const ground = new THREE.Mesh(new THREE.BoxGeometry(GROUND_WIDTH, 0.2, TRACK_SEGMENT_LENGTH), groundMat);
        ground.position.y = -0.1;
        group.add(ground);

        // Lane markings
        const markMat = new THREE.MeshBasicMaterial({ color: 0x6a6a6e });
        for (let lane = -1; lane <= 1; lane += 2) {
            const mark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, TRACK_SEGMENT_LENGTH - 2), markMat);
            mark.position.set(lane * (LANE_WIDTH / 2), 0.01, 0);
            group.add(mark);
        }

        // Side curbs
        const curbMat = new THREE.MeshBasicMaterial({ color: 0x5a5a5a });
        for (let side = -1; side <= 1; side += 2) {
            const curb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, TRACK_SEGMENT_LENGTH), curbMat);
            curb.position.set(side * (GROUND_WIDTH / 2 + 0.25), 0.1, 0);
            group.add(curb);
        }

        return group;
    }

    // ========== BUILDINGS ==========
    function createBuilding(x, z) {
        const colors = [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B];
        const height = 3 + Math.random() * 6;
        const w = 1.5 + Math.random();
        const d = 1.5 + Math.random();
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(w, height, d),
            new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
        );
        building.position.set(x, height / 2, z);
        scene.add(building);
        return building;
    }

    // ========== OBSTACLES ==========
    function createTrain(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];
        const colors = [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA];
        const mainColor = colors[Math.floor(Math.random() * colors.length)];

        // Main body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 1.8, 6),
            new THREE.MeshLambertMaterial({ color: mainColor })
        );
        body.position.set(0, 0.9, 0);
        group.add(body);

        // Windows (blue tinted)
        const winMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.7 });
        for (let i = -1; i <= 1; i++) {
            for (let side = -1; side <= 1; side += 2) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), winMat);
                win.position.set(side * 1.21, 1.0, i * 1.5);
                group.add(win);
            }
        }

        // Roof
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.1, 5.6),
            new THREE.MeshLambertMaterial({ color: 0xDDDDDD })
        );
        roof.position.set(0, 1.85, 0);
        group.add(roof);

        // Door line (center)
        const doorMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.6), doorMat);
        door.position.set(0, 0.8, 0);
        group.add(door);

        // Headlights
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
        for (let side = -1; side <= 1; side += 2) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), lightMat);
            l.position.set(side * 0.6, 0.5, 3.05);
            group.add(l);
        }
        
        // Ramp (30% of trains - lets player run onto roof)
        const hasRamp = Math.random() < 0.3;
        if (hasRamp) {
            // Bright orange ramp sticking clearly out of the train front
            const rampMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 });
            const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 3.0), rampMat);
            ramp.position.set(0, 0.9, 4.5);
            ramp.rotation.x = 0.65;
            group.add(ramp);
            // Side rails
            const railMat = new THREE.MeshLambertMaterial({ color: 0xDD4400 });
            for (let side = -1; side <= 1; side += 2) {
                const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 3.0), railMat);
                r.position.set(side * 1.2, 1.2, 4.5);
                r.rotation.x = 0.65;
                group.add(r);
            }
            // White warning stripes on ramp
            const warnMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            for (let i = -2; i <= 2; i++) {
                if (i === 0) continue;
                const s = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 0.06), warnMat);
                s.position.set(0, 0.03, 4.5 + i * 0.5);
                group.add(s);
            }
            // Ramp end marker (vertical bar at the tip)
            const tipMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            const tip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 0.05), tipMat);
            tip.position.set(0, 0.05, 5.8);
            group.add(tip);
            
            group.userData.hasRamp = true;
        }

        group.position.set(laneX, 0, zPos);
        group.userData.type = 'train';
        group.userData.lane = lane;
        group.userData.width = 2.0;
        group.userData.height = 1.8;
        group.userData.depth = 5.5;
        group.userData.hasRamp = hasRamp;
        return group;
    }

    function createBarrier(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        // Orange barrier base
        const barrier = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.6, 1.0),
            new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        barrier.position.set(0, 0.3, 0);
        group.add(barrier);

        // White reflective stripes (angled)
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        for (let i = -2; i <= 2; i++) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s.position.set(i * 0.2, 0.4 + (i % 2) * 0.1, 0.55);
            s.rotation.x = 0.1;
            group.add(s);
        }
        for (let i = -2; i <= 2; i++) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s.position.set(i * 0.2, 0.4 + ((i+1) % 2) * 0.1, -0.55);
            s.rotation.x = -0.1;
            group.add(s);
        }

        // Top cap
        const cap = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.08, 0.9),
            new THREE.MeshLambertMaterial({ color: 0xFF8844 })
        );
        cap.position.set(0, 0.65, 0);
        group.add(cap);

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'barrier', lane: lane, width: 1.6, height: 0.6, depth: 1.0 };
        return group;
    }

    function createRollUnderTrain(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        // Top bar (the obstacle you slide under)
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.5, 5.0),
            new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        top.position.set(0, 1.4, 0);
        group.add(top);

        // Warning stripe on bottom of bar
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.05, 4.8),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        stripe.position.set(0, 1.15, 0);
        group.add(stripe);

        // Side supports (left and right only, open in center to roll under)
        const supMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (let side = -1; side <= 1; side += 2) {
            const sup = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), supMat);
            sup.position.set(side * 1.2, 0.9, 0);
            group.add(sup);
        }

        // Warning signs on sides
        const warnMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
        for (let side = -1; side <= 1; side += 2) {
            for (let end = -1; end <= 1; end += 2) {
                const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), warnMat);
                w.position.set(side * 1.25, 1.2, end * 2.4);
                group.add(w);
            }
        }

        // Clearance markers
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        for (let side = -1; side <= 1; side += 2) {
            for (let end = -1; end <= 1; end += 2) {
                const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), markerMat);
                m.position.set(side * 1.0, 0.1, end * 2.8);
                group.add(m);
            }
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'roll_under', lane: lane, width: 2.0, height: 0.5, depth: 5.0 };
        return group;
    }

    // ========== COINS ==========
    function createCoin(lane, zPos, yOffset) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];

        // Coin body (gold cylinder)
        const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.08, 10),
            new THREE.MeshBasicMaterial({ color: 0xFFD700 })
        );
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, 0.6 + (yOffset || 0), 0);
        group.add(coin);

        // Glow ring
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(COIN_RADIUS * 0.5, COIN_RADIUS * 1.1, 10),
            new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25 })
        );
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, 0.6 + (yOffset || 0), 0);
        group.add(glow);

        // Center dot
        const dot = new THREE.Mesh(
            new THREE.CircleGeometry(COIN_RADIUS * 0.3, 6),
            new THREE.MeshBasicMaterial({ color: 0xFFA500 })
        );
        dot.rotation.x = Math.PI / 2;
        dot.position.set(0, 0.6 + (yOffset || 0), 0.01);
        group.add(dot);

        group.position.set(laneX, 0, zPos);
        group.userData = { lane: lane, collected: false };
        return group;
    }

    function createCoinPattern(lane, zPos, pattern) {
        const coins = [];
        const fn = {
            // Classic Subway Surfers coin arc
            arc: () => {
                for (let i = 0; i < 6; i++) {
                    const l = Math.max(0, Math.min(2, lane + Math.round(Math.sin(i * 1.2) * 1.2)));
                    const yOff = Math.sin(i * 1.0) * 0.3 + 0.4;
                    coins.push(createCoin(l, zPos - i * 2.0, yOff));
                }
            },
            // Straight line
            line: () => { for (let i = 0; i < 5; i++) coins.push(createCoin(lane, zPos - i * 2.2, 0.2)); },
            // Double lane pattern
            double: () => {
                const lanes = [Math.max(0, lane - 1), Math.min(2, lane + 1)];
                for (let i = 0; i < 4; i++) {
                    coins.push(createCoin(lanes[i % 2], zPos - i * 1.8, 0.2));
                }
            },
            // Single
            single: () => { coins.push(createCoin(lane, zPos, 0.3)); },
            // Zigzag (Subway Surfers classic)
            zigzag: () => {
                for (let i = 0; i < 4; i++) {
                    const l = i % 2 === 0 ? lane : Math.max(0, Math.min(2, lane + (i < 2 ? 1 : -1)));
                    coins.push(createCoin(l, zPos - i * 2.0, 0.3));
                }
            }
        }[pattern] || fn.single;
        fn();
        return coins;
    }

    // ========== PARTICLES ==========
    function createCoinParticles(position) {
        for (let i = 0; i < 5; i++) {
            const p = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            p.userData = { vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 + 0.1, vz: (Math.random() - 0.5) * 0.3, life: 1.0, decay: 0.025 };
            scene.add(p);
            state.particles.push(p);
        }
    }

    function createCrashParticles(position) {
        for (let i = 0; i < 10; i++) {
            const p = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 0.06),
                new THREE.MeshBasicMaterial({ color: [0xff4444, 0xff8800, 0xffcc00][Math.floor(Math.random() * 3)], transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            const speed = 0.15 + Math.random() * 0.2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            p.userData = {
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.1,
                vz: Math.cos(phi) * speed,
                life: 1.0, decay: 0.02
            };
            scene.add(p);
            state.particles.push(p);
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
                disposeObject(state.buildings[i]);
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
        // Remove old obstacles behind camera
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            if (state.obstacles[i].position.z > DESPAWN_BEHIND) {
                disposeObject(state.obstacles[i]);
                scene.remove(state.obstacles[i]);
                state.obstacles.splice(i, 1);
            }
        }

        if (state.obstacles.length === 0) {
            // Initial: scatter one per lane with big gaps
            // Pattern: each obstacle blocks 1 lane, player dodges to other 2
            const positions = [];
            // Pre-load obstacles from z=-30 to z=-330 with 15-unit spacing
            for (let z = -30; z > -330; z -= 15) positions.push(z);
            // Occasionally spawn double obstacles, but not too often
            for (let i = 0; i < positions.length; i++) {
                const z = positions[i];
                // Double obstacle ~every 5th, blocks 2 lanes
                if (i % 5 === 0 && Math.random() < 0.5) {
                    const openLane = Math.floor(Math.random() * 3);
                    const lanes = [0,1,2].filter(l => l !== openLane);
                    for (const lane of lanes) {
                        let obs;
                        if (Math.random() < 0.6) obs = createTrain(lane, z);
                        else obs = createBarrier(lane, z);
                        scene.add(obs);
                        state.obstacles.push(obs);
                        state.coinObstacleMap.set(obs.uuid, []);
                        spawnCoinsNearObstacle(obs, lane, z);
                    }
                } else {
                    const lane = i % 3;
                    let type = Math.random();
                    // Don't place barriers near roll-under gates
                    if (type >= 0.4 && type < 0.55) {
                        const hasRollNearby = state.obstacles.some(o =>
                            o.userData.type === 'roll_under' &&
                            Math.abs(o.position.z - positions[i]) < 10
                        );
                        if (hasRollNearby) type = 0.8;
                    }
                    let obs;
                    if (type < 0.4) obs = createTrain(lane, z);
                    else if (type < 0.55) obs = createBarrier(lane, z);
                    else obs = createRollUnderTrain(lane, z);
                    scene.add(obs);
                    state.obstacles.push(obs);
                    state.coinObstacleMap.set(obs.uuid, []);
                    spawnCoinsNearObstacle(obs, lane, z);
                }
            }
            // Coins in the safe zone
            for (let z = -5; z > -28; z -= 5) {
                const coin = createCoin(Math.floor(Math.random() * 3), z, 0.3);
                scene.add(coin);
                state.coinObjects.push(coin);
            }
            return;
        }

        // Fill the pipe: keep enough obstacles ahead of the player
        const ahead = state.obstacles.filter(o => o.position.z > -90 && o.position.z < 0);

        // Speed-dependent pipe: more obstacles at higher speeds
        const targetCount = Math.min(6 + Math.floor(state.speed * 6), 18);
        const spawnZ = -(45 + state.speed * 30) - Math.random() * 15;

        if (ahead.length < targetCount) {
            const z = spawnZ;

            // Skip spawn if any obstacle already in this Z range (overlap prevention)
            const zBlocked = state.obstacles.some(o => Math.abs(o.position.z - z) < 4);
            if (!zBlocked) {

            // Rare double obstacle (8%)
            if (Math.random() < 0.08) {
                const openLane = Math.floor(Math.random() * 3);
                for (const lane of [0,1,2].filter(l => l !== openLane)) {
                    let obs;
                    if (Math.random() < 0.5) obs = createTrain(lane, z);
                    else obs = createBarrier(lane, z);
                    scene.add(obs);
                    state.obstacles.push(obs);
                    state.coinObstacleMap.set(obs.uuid, []);
                    spawnCoinsNearObstacle(obs, lane, z);
                }
            } else {
                // Pick a lane that's not crowded
                const busy = new Set();
                for (const o of ahead) {
                    if (o.position.z > z - 10) {
                        const l = Math.round((o.position.x + LANE_WIDTH) / LANE_WIDTH);
                        if (l >= 0 && l <= 2) busy.add(l);
                    }
                }
                const safe = [0,1,2].filter(l => !busy.has(l));
                const lane = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : Math.floor(Math.random() * 3);

                // Don't place barriers near roll-under gates
                let type = Math.random();
                if (type >= 0.4 && type < 0.55) {
                    const hasRollUnderNearby = state.obstacles.some(o =>
                        o.userData.type === 'roll_under' &&
                        Math.abs(o.position.z - z) < 8
                    );
                    if (hasRollUnderNearby) type = 0.8;
                }

                let obs;
                if (type < 0.4) obs = createTrain(lane, z);
                else if (type < 0.55) obs = createBarrier(lane, z);
                else obs = createRollUnderTrain(lane, z);
                scene.add(obs);
                state.obstacles.push(obs);
                state.coinObstacleMap.set(obs.uuid, []);
                spawnCoinsNearObstacle(obs, lane, z);
            }
            }
        }
    }

    function spawnCoinsNearObstacle(obstacle, lane, z) {
        const coinChance = Math.random();
        if (coinChance < 0.5) {
            let coinLane = Math.floor(Math.random() * 3);
            while (coinLane === lane && Math.random() > 0.3) {
                coinLane = (coinLane + 1) % 3;
            }
            const coin = createCoin(coinLane, z - 3 - Math.random() * 5, 0.3);
            scene.add(coin);
            state.coinObjects.push(coin);
            state.coinObstacleMap.get(obstacle.uuid).push(coin);
        } else if (coinChance < 0.7) {
            let coinLane = Math.floor(Math.random() * 3);
            while (coinLane === lane && Math.random() > 0.4) {
                coinLane = (coinLane + 1) % 3;
            }
            const patterns = ['line', 'arc', 'double', 'zigzag', 'arc', 'zigzag'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            const coins = createCoinPattern(coinLane, z - 4, pattern);
            for (const c of coins) {
                scene.add(c);
                state.coinObjects.push(c);
                state.coinObstacleMap.get(obstacle.uuid).push(c);
            }
        }
    }

    // ========== UI SETUP ==========
    function setupUI() {
        uiOverlay = document.createElement('div');
        uiOverlay.id = 'ui-overlay';

        // ===== MAIN MENU =====
        menuOverlay = document.createElement('div');
        menuOverlay.id = 'menu-overlay';
        menuOverlay.className = 'overlay';
        menuOverlay.innerHTML = `
            <div class="menu-content">
                <h1 class="menu-title">SUBWAY SURFER</h1>
                <p class="menu-subtitle">Neo Edition</p>
                <div class="tap-to-start pulse">TAP TO START</div>
                <div class="menu-controls">
                    <span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;
                    <span class="key">↑</span> Jump &nbsp;|&nbsp;
                    <span class="key">↓</span> Roll
                </div>
                <div class="menu-keys">ESC / P = Pause &nbsp;|&nbsp; M = Menu</div>
                <div class="menu-mobile-hint">Swipe to play on mobile</div>
            </div>
        `;
        uiOverlay.appendChild(menuOverlay);

        // ===== PAUSE OVERLAY =====
        pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        pauseOverlay.className = 'overlay';
        pauseOverlay.style.display = 'none';
        pauseOverlay.innerHTML = `
            <div class="menu-content">
                <h1 class="menu-title">PAUSED</h1>
                <div class="tap-to-start">TAP TO CONTINUE</div>
                <div class="menu-btn" id="pause-menu-btn">RETURN TO MENU</div>
            </div>
        `;
        uiOverlay.appendChild(pauseOverlay);

        // ===== PAUSE BUTTON =====
        pauseBtnEl = document.createElement('div');
        pauseBtnEl.id = 'pause-btn';
        pauseBtnEl.textContent = '⏸';
        pauseBtnEl.style.display = 'none';
        uiOverlay.appendChild(pauseBtnEl);
        
        // ===== MOBILE CONTROLS (virtual buttons) =====
        const mobileCtrl = document.createElement('div');
        mobileCtrl.id = 'mobile-controls';
        mobileCtrl.innerHTML = `
            <button class="m-btn" id="m-left">◀</button>
            <button class="m-btn" id="m-jump">▲</button>
            <button class="m-btn" id="m-roll">▼</button>
            <button class="m-btn" id="m-right">▶</button>
        `;
        uiOverlay.appendChild(mobileCtrl);

        // Score display
        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        const coinsSpan = document.createElement('span');
        coinsSpan.className = 'coins-label';
        coinsSpan.textContent = '🪙 ';
        const coinCount = document.createElement('span');
        coinCount.id = 'coin-count';
        coinCount.textContent = '0';
        coinsSpan.appendChild(coinCount);
        const sep = document.createTextNode('  |  ');
        const distSpan = document.createElement('span');
        distSpan.className = 'dist-label';
        distSpan.textContent = '🏃 ';
        const distCount = document.createElement('span');
        distCount.id = 'distance-count';
        distCount.textContent = '0';
        distSpan.appendChild(distCount);
        const mSpan = document.createTextNode('m');
        scoreDiv.appendChild(coinsSpan);
        scoreDiv.appendChild(sep);
        scoreDiv.appendChild(distSpan);
        scoreDiv.appendChild(mSpan);
        
        uiOverlay.appendChild(scoreDiv);
        scoreEl = distCount;
        coinsEl = coinCount;
        
        // Best score on HUD (separate element for easy updates)
        const bestSmall = document.createElement('div');
        bestSmall.id = 'hud-best';
        bestSmall.style.cssText = 'position:absolute;top:72px;left:50%;transform:translateX(-50%);font-size:13px;color:rgba(136,204,255,0.6);text-shadow:0 1px 5px rgba(0,0,0,0.8);pointer-events:none;';
        bestSmall.textContent = 'BEST: ' + state.bestScore + 'm';
        uiOverlay.appendChild(bestSmall);

        // Speed indicator
        const speedDiv = document.createElement('div');
        speedDiv.id = 'speed-indicator';
        speedDiv.textContent = 'SPD: 1x';
        uiOverlay.appendChild(speedDiv);

        // Game over screen - build with DOM to avoid getElementById issues
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';
        
        const h1 = document.createElement('h1');
        h1.textContent = 'GAME OVER';
        gameOverDiv.appendChild(h1);
        
        const finalScoreDiv = document.createElement('div');
        finalScoreDiv.className = 'final-score';
        finalScoreDiv.textContent = 'Distance: ';
        const finalDistSpan = document.createElement('span');
        finalDistSpan.id = 'final-distance';
        finalDistSpan.textContent = '0';
        finalScoreDiv.appendChild(finalDistSpan);
        finalScoreDiv.appendChild(document.createTextNode('m'));
        gameOverDiv.appendChild(finalScoreDiv);
        
        const finalCoinsDiv = document.createElement('div');
        finalCoinsDiv.className = 'final-coins';
        finalCoinsDiv.textContent = 'Coins: ';
        const finalCoinSpan = document.createElement('span');
        finalCoinSpan.id = 'final-coins';
        finalCoinSpan.textContent = '0';
        finalCoinsDiv.appendChild(finalCoinSpan);
        gameOverDiv.appendChild(finalCoinsDiv);
        
        // Best score
        const bestDiv = document.createElement('div');
        bestDiv.id = 'best-score';
        bestDiv.className = 'final-coins';
        bestDiv.style.marginBottom = '20px';
        bestDiv.style.color = '#88ccff';
        bestDiv.textContent = 'BEST: ' + state.bestScore + 'm';
        gameOverDiv.appendChild(bestDiv);
        
        const restartBtn = document.createElement('div');
        restartBtn.className = 'restart-btn';
        restartBtn.id = 'restart-btn';
        restartBtn.textContent = 'TAP TO RETRY';
        gameOverDiv.appendChild(restartBtn);
        
        // Quit button
        const quitBtn = document.createElement('div');
        quitBtn.className = 'quit-btn';
        quitBtn.id = 'quit-btn';
        quitBtn.textContent = 'QUIT';
        gameOverDiv.appendChild(quitBtn);
        
        uiOverlay.appendChild(gameOverDiv);
        gameOverEl = gameOverDiv;
        finalScoreEl = finalDistSpan;
        finalCoinsEl = finalCoinSpan;
        restartBtnEl = restartBtn;

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

        // Event listeners
        restartBtnEl.addEventListener('click', restartGame);
        restartBtnEl.addEventListener('touchend', (e) => { e.preventDefault(); restartGame(); });
        
        const quitBtnEl = document.getElementById('quit-btn');
        if (quitBtnEl) {
            quitBtnEl.addEventListener('click', quitToMenu);
            quitBtnEl.addEventListener('touchend', (e) => { e.preventDefault(); quitToMenu(); });
        }
        
        // Menu click/tap to start
        menuOverlay.addEventListener('click', startGameFromMenu);
        menuOverlay.addEventListener('touchend', (e) => { e.preventDefault(); startGameFromMenu(); });
        
        // Pause overlay click to resume
        pauseOverlay.addEventListener('click', togglePause);
        pauseOverlay.addEventListener('touchend', (e) => { e.preventDefault(); togglePause(); });
        
        // Pause button click
        pauseBtnEl.addEventListener('click', togglePause);
        pauseBtnEl.addEventListener('touchend', (e) => { e.preventDefault(); togglePause(); });
        
        // Pause menu - return to menu
        const pauseMenuBtn = document.getElementById('pause-menu-btn');
        if (pauseMenuBtn) {
            pauseMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); quitToMenu(); });
            pauseMenuBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); quitToMenu(); });
        }
        
        // Mobile buttons
        function bindMobileBtn(id, action) {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (e) => { e.preventDefault(); e.stopPropagation(); if (state.started && !state.paused && !state.gameOver) action(); };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('mousedown', handler);
        }
        bindMobileBtn('m-left', moveLeft);
        bindMobileBtn('m-right', moveRight);
        bindMobileBtn('m-jump', jump);
        bindMobileBtn('m-roll', roll);
    }

    // ========== CONTROLS ==========
    const keys = {};

    function setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            
            // Start game from menu
            if (!state.started && (e.key === ' ' || e.key === 'Enter')) {
                startGameFromMenu();
                return;
            }
            
            // Pause toggle
            if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && state.started && !state.gameOver) {
                togglePause();
                return;
            }
            // Return to menu (M key)
            if ((e.key === 'm' || e.key === 'M') && state.started) {
                if (!state.gameOver) {
                    togglePause();
                    setTimeout(quitToMenu, 100);
                } else {
                    quitToMenu();
                }
                return;
            }
            
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
        if (state.gameOver || !state.started) return;

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
            state.startLaneX = player.position.x;
            state.currentLane--;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function moveRight() {
        if (state.currentLane < LANE_COUNT - 1) {
            state.startLaneX = player.position.x;
            state.currentLane++;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function jump() {
        if (!state.isJumping) {
            state.isJumping = true;
            // If was rolling, cancel the roll on jump
            if (state.isRolling) {
                state.isRolling = false;
                state.targetPlayerHeight = PLAYER_Y;
            }
            state.jumpVelocity = JUMP_VELOCITY;
            playJumpSound();
        }
    }

    function roll() {
        if (state.isRolling) return;
        state.isRolling = true;
        state.targetPlayerHeight = ROLL_HEIGHT;
        playRollSound();
    }

    // ========== COLLISION DETECTION ==========
    function checkCollisions() {
        const playerPos = player.position;
        const playerHitbox = {
            x: playerPos.x,
            y: playerPos.y + (state.isRolling ? 0.1 : 0.7),
            z: playerPos.z,
            w: 0.4,
            h: state.isRolling ? 0.3 : 1.2,
            d: 0.3
        };

        for (const obs of state.obstacles) {
            const od = obs.userData;
            
            // Train: height=1.8, visual body center at y=0.9
            // Barrier: height=0.6, visual body center at y=0.3
            // Roll-under: height=0.5 (gap), top bar at y=1.4
            let obsY, obsH;
            if (od.type === 'roll_under') {
                // Top bar is at y=1.4, height 0.5, so center at y=1.65
                obsY = 1.65;
                obsH = 0.5;
            } else {
                // Use the position from the group + reported height
                obsY = obs.position.y + (od.height || 0.6) / 2;
                obsH = od.height || 0.6;
            }
            
            const obsBox = {
                x: obs.position.x,
                y: obsY,
                z: obs.position.z,
                w: od.width || 1.6,
                h: obsH,
                d: od.depth || 1.0
            };

            // Roll under: player rolling can pass under
            if (od.type === 'roll_under' && state.isRolling) {
                continue;
            }
            
            // Ramp train: board from the BACK of the train (ramp is behind)
            if (od.type === 'train' && od.hasRamp && !state.onRoof) {
                const trainBack = obs.position.z + (od.depth || 5.5) / 2;
                // Player runs up the ramp from behind
                if (playerPos.z >= trainBack - 1.5 && playerPos.z <= trainBack + 3.5 &&
                    Math.abs(playerPos.x - obsBox.x) < 1.5) {
                    state.onRoof = true;
                    continue;
                }
            }
            
            // Roof: skip collision when riding on train roofs
            if (state.onRoof && od.type === 'train') {
                continue;
            }

            // AABB collision
            const dx = Math.abs(playerHitbox.x - obsBox.x);
            const dz = Math.abs(playerHitbox.z - obsBox.z);
            const dy = Math.abs(playerHitbox.y - obsBox.y);
            
            // Z threshold: trains are long, barriers are short
            const zThreshold = (playerHitbox.d + obsBox.d) / 2 + 0.1;

            if (dx < (playerHitbox.w + obsBox.w) / 2 &&
                dz < zThreshold &&
                dy < (playerHitbox.h + obsH) / 2) {
                return true;
            }
        }
        return false;
    }

    // ========== MENU / PAUSE / QUIT ==========
    function startGameFromMenu() {
        if (state.started) return;
        state.started = true;
        menuOverlay.style.display = 'none';
        pauseBtnEl.style.display = 'block';
        if (!audioCtx) initAudio();
        clock.getDelta();
    }

    function togglePause() {
        if (!state.started || state.gameOver) return;
        state.paused = !state.paused;
        if (state.paused) {
            pauseOverlay.style.display = 'flex';
            pauseBtnEl.textContent = '\u25B6';
            clock.getDelta();
        } else {
            pauseOverlay.style.display = 'none';
            pauseBtnEl.textContent = '\u23F8';
            clock.getDelta();
        }
    }

    function resetAllGameObjects() {
        for (const obj of state.trackSegments) { scene.remove(obj); disposeObject(obj); }
        for (const obj of state.obstacles) { scene.remove(obj); disposeObject(obj); }
        for (const obj of state.coinObjects) { scene.remove(obj); disposeObject(obj); }
        for (const obj of state.buildings) { scene.remove(obj); disposeObject(obj); }
        for (const obj of state.particles) { scene.remove(obj); disposeObject(obj); }
        // Clear arrays
        state.trackSegments = [];
        state.obstacles = [];
        state.coinObjects = [];
        state.coinObstacleMap = new Map();
        state.buildings = [];
        state.particles = [];
    }

    function quitToMenu() {
        resetAllGameObjects();
        state.trackSegments = [];
        state.obstacles = [];
        state.coinObjects = [];
        state.coinObstacleMap = new Map();
        state.buildings = [];
        state.particles = [];
        state.score = 0;
        state.coins = 0;
        state.speed = START_SPEED;
        state.gameOver = false;
        state.started = false;
        state.paused = false;
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
        state.hasStartedTouch = false;
        state.onRoof = false;

        player.position.set(0, 0, 0);
        player.rotation.set(0, 0, 0);
        player.scale.set(1, 1, 1);
        camera.position.set(0, 6, 8);
        camera.lookAt(0, 0, -10);

        gameOverEl.classList.remove('visible');
        pauseOverlay.style.display = 'none';
        pauseBtnEl.style.display = 'none';
        menuOverlay.style.display = 'flex';

        spawnInitialTrack();
        spawnBuildings();
        spawnObstacles();
    }

    // ========== GAME FLOW ==========
    function restartGame() {
        resetAllGameObjects();
        
        // Full state reset
        state.score = 0;
        state.coins = 0;
        state.speed = START_SPEED;
        state.gameOver = false;
        state.started = true;
        state.paused = false;
        state.onRoof = false;
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
        state.cameraShake = 0;
        state.hasStartedTouch = false;
        
        // Reset player to center lane
        player.position.set(0, PLAYER_Y, 0);
        player.rotation.set(0, 0, 0);
        player.scale.set(1, 1, 1);
        
        // Reset camera
        camera.position.set(0, 5.5, 7);
        camera.lookAt(0, 0, -10);
        
        pauseBtnEl.style.display = 'block';
        pauseBtnEl.textContent = '\u23F8';
        gameOverEl.classList.remove('visible');
        pauseOverlay.style.display = 'none';
        clock.getDelta();

        spawnInitialTrack();
        spawnBuildings();
        spawnObstacles();
    }

    function gameOver() {
        state.gameOver = true;
        state.cameraShake = 0.5;
        createCrashParticles(player.position.clone());
        playCrashSound();

        const score = Math.floor(state.score);
        if (score > state.bestScore) {
            state.bestScore = score;
            try { localStorage.setItem('subwayBest', String(score)); } catch(e) {}
        }
        finalScoreEl.textContent = score;
        finalCoinsEl.textContent = state.coins;
        gameOverEl.classList.add('visible');
        // Show best score
        const bestEl = document.getElementById('best-score');
        if (bestEl) bestEl.textContent = 'BEST: ' + state.bestScore + 'm';
        pauseBtnEl.style.display = 'none';
    }

    // ========== UPDATE LOOP ==========
    function update() {
        if (state.gameOver) {
            if (state.cameraShake > 0) {
                state.cameraShake *= 0.95;
                if (state.cameraShake < 0.01) state.cameraShake = 0;
            }
            updateCamera();
            return;
        }
        if (!state.started || state.paused) {
            updateCamera();
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
            const speedLevel = Math.floor((state.speed - START_SPEED) / (MAX_SPEED - START_SPEED) * 49) + 1;
            speedEl.textContent = `SPD: ${Math.min(speedLevel, 50)}x`;
            speedEl.style.color = speedLevel > 35 ? 'rgba(255,30,30,1)' : speedLevel > 15 ? 'rgba(255,100,50,0.9)' : 'rgba(255,255,255,0.5)';
        }
        
        // Update best score HUD
        const hudBest = document.getElementById('hud-best');
        if (hudBest) hudBest.textContent = 'BEST: ' + state.bestScore + 'm';

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
            seg.position.z += state.speed * delta * 60;
        }

        // Recycle track segments
        for (let i = state.trackSegments.length - 1; i >= 0; i--) {
            if (state.trackSegments[i].position.z > TRACK_SEGMENT_LENGTH) {
                state.trackSegments[i].position.z -= TRACK_SEGMENT_LENGTH * state.trackSegments.length;
            }
        }

        // Move obstacles
        for (const obs of state.obstacles) {
            obs.position.z += state.speed * delta * 60;
        }

        // Move coins
        for (const coin of state.coinObjects) {
            coin.position.z += state.speed * delta * 60;
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
            b.position.z += state.speed * delta * 60;
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
            player.position.x = state.startLaneX + (targetX - state.startLaneX) * easeOutQuad(state.laneLerp);
        } else {
            player.position.x = LANE_POSITIONS[state.currentLane];
        }

        // Jump physics - roll in air = fall faster
        if (state.isJumping) {
            state.playerHeight += state.jumpVelocity;
            const gravMult = state.isRolling ? 2.5 : 1.0;
            state.jumpVelocity += GRAVITY * gravMult * delta * 60;
            if (state.playerHeight <= PLAYER_Y) {
                state.playerHeight = PLAYER_Y;
                state.isJumping = false;
                state.jumpVelocity = 0;
                // Landing while rolling: keep sliding (release down key to stand)
            }
        }

        // Roll height - tuck in air, slide on ground
        if (state.isRolling && !state.isJumping) {
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

        // Scale for roll (visual squash - even in air)
        if (state.isRolling) {
            const scaleY = (ROLL_HEIGHT + 0.2) / (PLAYER_Y + 0.2);
            player.scale.y = 1 - (1 - scaleY) * 0.7;
            if (!state.isJumping) player.position.y = state.playerHeight;
        } else {
            player.scale.y += (1 - player.scale.y) * 0.15;
        }
        
        // Release roll when down key not held
        if (state.isRolling && !state.isJumping) {
            const downHeld = keys['ArrowDown'] || keys['s'] || keys['S'];
            if (!downHeld) {
                state.isRolling = false;
                state.targetPlayerHeight = PLAYER_Y;
            }
        }
        
        // Roof mechanics: ride on train roofs
        if (state.onRoof) {
            // Stay at roof height
            state.playerHeight = 1.8 + PLAYER_Y;
            player.position.y = state.playerHeight;
            // Check if player should fall off (roof ended)
            const hasRoofBelow = state.obstacles.some(o => 
                o.userData.type === 'train' && 
                Math.abs(o.position.z - 0) < 3 &&
                Math.abs(o.position.x - player.position.x) < 1.5
            );
            if (!hasRoofBelow) {
                state.onRoof = false;
            }
        }

        // Running animation - skip during roll or jump
        const runCycle = state.gameTime * 8;
        if (!state.isJumping && !state.isRolling) {
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
            return;
        }

        updateCamera();
    }

    function easeOutQuad(t) {
        return t * (2 - t);
    }

    function updateCamera() {
        if (!player || !camera) return;
        
        // Clamp player position to prevent NaN wiping the render
        if (isNaN(player.position.x)) player.position.x = 0;
        if (isNaN(player.position.y)) player.position.y = PLAYER_Y;
        if (isNaN(player.position.z)) player.position.z = 0;

        // Camera follows player directly, centered on their lane
        const targetX = player.position.x;
        const targetY = state.isRolling ? 5 : 5.5;
        const targetZ = player.position.z + 7;

        let shakeX = 0, shakeY = 0;
        if (state.cameraShake > 0.01) {
            shakeX = (Math.random() - 0.5) * state.cameraShake * 0.3;
            shakeY = (Math.random() - 0.5) * state.cameraShake * 0.3;
        }

        // Smooth follow
        camera.position.x += (targetX + shakeX - camera.position.x) * 0.1;
        camera.position.y += (targetY + shakeY - camera.position.y) * 0.1;
        camera.position.z += (targetZ - camera.position.z) * 0.1;

        camera.lookAt(player.position.x, 0, player.position.z - 10);
    }

    // ========== RENDER LOOP ==========
    function animate() {
        requestAnimationFrame(animate);
        try {
            update();
            if (camera && !isNaN(camera.position.x)) {
                renderer.render(scene, camera);
            }
        } catch(e) {
            console.error('Game error:', e);
        }
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

        // Show menu initially
        menuOverlay.style.display = 'flex';
        state.started = false;
        
        window.__neoGame = { state, scene, camera, player, renderer, animate, restartGame, quitToMenu, togglePause };
        
        animate();
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

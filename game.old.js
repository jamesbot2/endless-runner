// ===== SUBWAY SURFER CLONE - Three.js =====
// Full game implementation - no external assets needed

(function() {
    'use strict';

    // Check Three.js loaded (handles CDN failures in Telegram etc.)
    if (typeof THREE === 'undefined') {
        var errDiv = document.getElementById('three-error');
        if (errDiv) errDiv.style.display = 'block';
        return; // Stop execution
    }

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
    const JUMP_VELOCITY = 0.23;
    const DOUBLE_JUMP_VELOCITY = 0.20;
    const PLAYER_Y = 0.15;
    const ROLL_HEIGHT = 0;
    const COIN_RADIUS = 0.35;
    const GROUND_WIDTH = LANE_WIDTH * LANE_COUNT + 1;
    const JETPACK_FUEL_MAX = 30;
    const JETPACK_COOLDOWN_MAX = 15;
    const JETPACK_LIFT = 0.04;
    const ROOF_TOP_Y = 1.8;

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
        onRoof: false,
        rollEndTime: 0,
        firstPerson: false,
        difficulty: 2,
        homelander: false,
        cyberMode: false,
        laserTimer: 0,
        muted: false,
        lastPlayedCoin: 0,
        credits: parseInt(localStorage.getItem('subwayCredits') || '0'),
        totalCoins: parseInt(localStorage.getItem('subwayTotalCoins') || '0'),
        equippedAbility: 0,
        canDoubleJump: false,
        hasDoubleJumped: false,
        canJetpack: false,
        jetpackFuel: 0,
        jetpackCooldown: 0,
        canRoofWalk: false,
        theme: 0,
        jumpingFromRoof: false,
        rolledLand: false,
        rolledLandTime: 0
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

    // Create US flag texture for Homelander cape
    function createUSFlagTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 208; // divisible by 13 for even stripes
        const ctx = canvas.getContext('2d');
        
        const w = canvas.width;
        const h = canvas.height;
        const stripeH = h / 13;
        
        // Clear to white first
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        
        // Stripes: 13 alternating (odd = red, even = white, already white)
        for (let i = 0; i < 13; i += 2) {
            ctx.fillStyle = '#B22234';
            ctx.fillRect(0, i * stripeH, w, stripeH);
        }
        
        // Canton (blue field) - covers top 7 stripes
        const cantonW = Math.floor(w * 0.40);
        const cantonH = stripeH * 7;
        ctx.fillStyle = '#3C3B6E';
        ctx.fillRect(0, 0, cantonW, cantonH);
        
        // Stars: 50 white 5-pointed stars
        ctx.fillStyle = '#FFFFFF';
        const starCols = [6, 5, 6, 5, 6, 5, 6, 5, 6];
        const starRows = starCols.length;
        const cellW = cantonW / 7;  // 6 star columns + padding
        const cellH = cantonH / 10; // 9 star rows + padding
        
        for (let row = 0; row < starRows; row++) {
            const cols = starCols[row];
            for (let col = 0; col < cols; col++) {
                const cx = (col + 1) * cellW - cellW / 2;
                const cy = (row + 1) * cellH - cellH / 2;
                const r = Math.min(cellW, cellH) * 0.22;
                // Draw a 5-pointed star
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const outer = (i * 72 - 90) * Math.PI / 180;
                    const inner = ((i * 72) + 36 - 90) * Math.PI / 180;
                    const ox = cx + Math.cos(outer) * r;
                    const oy = cy + Math.sin(outer) * r;
                    const ix = cx + Math.cos(inner) * r * 0.4;
                    const iy = cy + Math.sin(inner) * r * 0.4;
                    if (i === 0) ctx.moveTo(ox, oy);
                    else ctx.lineTo(ox, oy);
                    ctx.lineTo(ix, iy);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }





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
        player.rotation.y = Math.PI; // face -Z (away from camera)

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
    function createScenery(x, z) {
        var group = new THREE.Group();
        group.position.set(x, 0, z);
        var theme = state.theme || 0;
        
        if (theme === 0) {
            // ===== CITY: box buildings =====
            var colors = [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B];
            var h = 3 + Math.random() * 6;
            var w = 1.5 + Math.random();
            var d = 1.5 + Math.random();
            var mesh = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
            );
            mesh.position.y = h / 2;
            group.add(mesh);
        } else if (theme === 1) {
            // ===== FOREST: trees =====
            // Trunk
            var trunkH = 2 + Math.random() * 3;
            var trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, trunkH, 6),
                new THREE.MeshLambertMaterial({ color: 0x5D4037 })
            );
            trunk.position.y = trunkH / 2;
            group.add(trunk);
            // Foliage (stacked cones)
            var folColor = [0x2E7D32, 0x388E3C, 0x43A047, 0x1B5E20][Math.floor(Math.random() * 4)];
            var folMat = new THREE.MeshLambertMaterial({ color: folColor });
            for (var i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                var cone = new THREE.Mesh(new THREE.ConeGeometry(0.8 - i * 0.15, 0.7, 6), folMat);
                cone.position.set(0, trunkH + 0.2 + i * 0.5, 0);
                group.add(cone);
            }
            // Random bush
            if (Math.random() > 0.5) {
                var bush = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 5),
                    new THREE.MeshLambertMaterial({ color: 0x66BB6A })
                );
                bush.position.set((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8);
                group.add(bush);
            }
        } else if (theme === 2) {
            // ===== DESERT: cacti + rocks =====
            if (Math.random() > 0.4) {
                // Saguaro cactus
                var cacMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
                var main = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2 + Math.random() * 2, 6), cacMat);
                main.position.y = 1 + Math.random();
                group.add(main);
                // Arms
                for (var a = 0; a < 2; a++) {
                    var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8 + Math.random() * 0.5, 6), cacMat);
                    arm.position.set((a === 0 ? -0.25 : 0.25), 0.6 + Math.random() * 0.8, 0);
                    arm.rotation.z = a === 0 ? 0.5 : -0.5;
                    group.add(arm);
                }
            } else {
                // Rock formation
                var rock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.6),
                    new THREE.MeshLambertMaterial({ color: 0xA1887F })
                );
                rock.position.y = 0.3 + Math.random() * 0.3;
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.scale.set(1, 0.5 + Math.random() * 0.5, 1);
                group.add(rock);
            }
        } else {
            // ===== OCEAN: icebergs / ice pillars =====
            var iceMat = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
            if (Math.random() > 0.3) {
                // Ice pillar
                var pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.3, 0.5, 2 + Math.random() * 4, 7),
                    iceMat
                );
                pillar.position.y = 1 + Math.random() * 2;
                pillar.scale.x = 0.6 + Math.random() * 0.8;
                group.add(pillar);
                // Sparkle
                var sparkle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
                );
                sparkle.position.set(0, pillar.position.y + 0.3, 0.2);
                group.add(sparkle);
            } else {
                // Iceberg mound
                var mound = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 6, 5),
                    iceMat
                );
                mound.position.y = 0.3;
                mound.scale.set(1, 0.4, 1);
                group.add(mound);
            }
        }
        
        scene.add(group);
        return group;
    }

    // ========== OBSTACLES ==========
    function createTrain(lane, zPos, isMoving) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];
        const moving = (isMoving !== false) && Math.random() < 0.18;
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
        group.userData.moving = moving;
        if (moving) {
            group.userData.moveDir = 1;
            group.userData.movePhase = Math.random() * Math.PI * 2;
            group.userData.baseX = laneX;
            // Yellow warning markers for moving trains
            group.userData.warningLights = [];
            const warnMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            for (let side = -1; side <= 1; side += 2) {
                for (let end = -1; end <= 1; end += 2) {
                    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), warnMat);
                    flash.position.set(side * 1.25, 0.9, end * 2.9);
                    group.add(flash);
                    group.userData.warningLights.push(flash);
                }
            }
        }
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

    function createFullLaneBarrier(zPos) {
        const group = new THREE.Group();
        
        // Full lane barrier - blocks ALL lanes, must jump over
        const beamMat = new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        const beam = new THREE.Mesh(new THREE.BoxGeometry(GROUND_WIDTH + 1.5, 0.5, 1.2), beamMat);
        beam.position.set(0, 0.25, 0);
        group.add(beam);
        
        // Warning stripe
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(GROUND_WIDTH + 1.0, 0.05, 0.05),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        stripe.position.set(0, 0.5, 0.6);
        group.add(stripe);
        const stripe2 = stripe.clone();
        stripe2.position.z = -0.6;
        group.add(stripe2);
        
        // Side posts
        const postMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (let side = -1; side <= 1; side += 2) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), postMat);
            post.position.set(side * (GROUND_WIDTH / 2 + 0.8), 0.35, 0);
            group.add(post);
            // Top light
            const light = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xFF0000 })
            );
            light.position.set(side * (GROUND_WIDTH / 2 + 0.8), 0.75, 0);
            group.add(light);
        }
        
        group.position.set(0, 0, zPos);
        group.userData = { type: 'full_barrier', width: GROUND_WIDTH + 1.5, height: 0.5, depth: 1.2 };
        return group;
    }
    
    function createLowFlyingObstacle(lane, zPos) {
        const group = new THREE.Group();
        const laneX = LANE_POSITIONS[lane];
        
        // A hovering drone - obstacle that you must roll under or jump over
        // Large bright neon body so it's ALWAYS visible
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFF3300 });
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.25, 1.0),
            bodyMat
        );
        body.position.set(0, 0.9, 0);
        group.add(body);
        
        // Rotor arms (bright)
        const armMat = new THREE.MeshLambertMaterial({ color: 0xDD8800 });
        for (let i = -1; i <= 1; i += 2) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), armMat);
            arm.position.set(i * 0.3, 1.05, 0);
            group.add(arm);
            // Rotor disc (white, highly visible)
            const rotor = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.02, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })
            );
            rotor.position.set(i * 0.3, 1.08, 0);
            group.add(rotor);
        }
        
        // Flashing beacon on top
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), beaconMat);
        beacon.position.set(0, 1.1, 0);
        group.add(beacon);
        
        // Bright glow underneath (constant, helps visibility at night/black bg)
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: 0.5 });
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.1, 8), glowMat);
        glow.position.set(0, 0.75, 0);
        group.add(glow);
        
        // HUD-style border lines (white glow strips)
        const hudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.4 });
        for (let side = -1; side <= 1; side += 2) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.8), hudMat);
            stripe.position.set(side * 0.6, 0.9, 0);
            group.add(stripe);
        }
        
        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'low_flying', lane: lane, width: 1.0, height: 0.8, depth: 0.8, yOffset: 0.8 };
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
    
    function scheduleSound(t, fn) {
        if (!audioCtx || state.muted) return;
        // Schedule sound 50ms ahead so AudioContext has time to wake from suspend
        var startTime = audioCtx.currentTime + 0.05;
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(function(){});
        fn(startTime);
    }

    function playCoinSound() {
        scheduleSound(0, function(t) {
            try {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.linearRampToValueAtTime(1320, t + 0.1);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
            } catch(e) {}
        });
    }

    function playCrashSound() {
        scheduleSound(0, function(t) {
            try {
                var bufferSize = audioCtx.sampleRate * 0.4;
                var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
                }
                var source = audioCtx.createBufferSource();
                source.buffer = buffer;
                var gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.4);
                var filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.linearRampToValueAtTime(100, t + 0.3);
                source.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                source.start(t);
            } catch(e) {}
        });
    }

    function playJumpSound() {
        scheduleSound(0, function(t) {
            try {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.linearRampToValueAtTime(600, t + 0.15);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
            } catch(e) {}
        });
    }

    function playRollSound() {
        scheduleSound(0, function(t) {
            try {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(200, t + 0.15);
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
            } catch(e) {}
        });
    }
    
    // ========== BACKGROUND MUSIC ==========
    // Procedural music system - beat tempo increases with game speed
    var bgMusicState = {
        running: false,
        beatInterval: null,
        lastBeat: 0,
        beatCount: 0,
        tempo: 120, // BPM
        currentOscs: []
    };
    
    function startBgMusic() {
        if (state.muted || !audioCtx || bgMusicState.running) return;
        bgMusicState.running = true;
        bgMusicState.lastBeat = audioCtx.currentTime;
        bgMusicState.beatCount = 0;
    }
    
    function stopBgMusic() {
        bgMusicState.running = false;
        // Stop any lingering oscillators
        for (const o of bgMusicState.currentOscs) {
            try { o.stop(); } catch(e) {}
        }
        bgMusicState.currentOscs = [];
    }
    
    function updateBgMusic(delta) {
        if (!bgMusicState.running || !audioCtx || state.muted || state.musicMuted) return;
        if (state.paused || !state.started) return;
        
        // Map speed to tempo: 1x=100bpm, 50x=200bpm
        const speedLevel = Math.floor((state.speed - START_SPEED) / (MAX_SPEED - START_SPEED) * 49) + 1;
        const targetBpm = 100 + Math.min(speedLevel, 50) * 2;
        bgMusicState.tempo += (targetBpm - bgMusicState.tempo) * 0.01;
        
        const beatInterval = 60 / bgMusicState.tempo; // seconds per beat
        const now = audioCtx.currentTime;
        
        if (now - bgMusicState.lastBeat >= beatInterval) {
            bgMusicState.lastBeat += beatInterval;
            bgMusicState.beatCount++;
            const beat = bgMusicState.beatCount;
            
            try {
                // ---- KICK DRUM (every beat, emphasis on 1 and 3) ----
                if (beat % 2 === 0 || beat % 4 === 1) {
                    const kick = audioCtx.createOscillator();
                    const kickGain = audioCtx.createGain();
                    kick.connect(kickGain);
                    kickGain.connect(audioCtx.destination);
                    kick.type = 'sine';
                    kick.frequency.setValueAtTime(150, now);
                    kick.frequency.linearRampToValueAtTime(40, now + 0.1);
                    kickGain.gain.setValueAtTime(0.35 * state.musicVolume, now);
                    kickGain.gain.linearRampToValueAtTime(0, now + 0.2);
                    kick.start(now);
                    kick.stop(now + 0.2);
                    bgMusicState.currentOscs.push(kick);
                    setTimeout(() => {
                        const idx = bgMusicState.currentOscs.indexOf(kick);
                        if (idx >= 0) bgMusicState.currentOscs.splice(idx, 1);
                    }, 300);
                }
                
                // ---- HI-HAT (every offbeat, faster at high speed) ----
                if (state.speed > START_SPEED * 2 || beat % 2 === 0) {
                    const hatGain = audioCtx.createGain();
                    hatGain.connect(audioCtx.destination);
                    // Create a click using short noise-like oscillator
                    const hat = audioCtx.createOscillator();
                    hat.connect(hatGain);
                    hat.type = 'square';
                    hat.frequency.setValueAtTime(5000, now);
                    hatGain.gain.setValueAtTime(0.12 * state.musicVolume, now);
                    hatGain.gain.linearRampToValueAtTime(0, now + 0.04);
                    hat.start(now);
                    hat.stop(now + 0.04);
                    bgMusicState.currentOscs.push(hat);
                    setTimeout(() => {
                        const idx = bgMusicState.currentOscs.indexOf(hat);
                        if (idx >= 0) bgMusicState.currentOscs.splice(idx, 1);
                    }, 100);
                }
                
                // ---- BASS LINE (every 4 beats) ----
                if (beat % 4 === 0) {
                    const bass = audioCtx.createOscillator();
                    const bassGain = audioCtx.createGain();
                    bass.connect(bassGain);
                    bassGain.connect(audioCtx.destination);
                    bass.type = 'sawtooth';
                    const notes = [110, 130.8, 110, 146.8]; // A3, C4, A3, D4
                    const note = notes[Math.floor(beat / 4) % 4];
                    bass.frequency.setValueAtTime(note, now);
                    bassGain.gain.setValueAtTime(0.15 * state.musicVolume, now);
                    bassGain.gain.linearRampToValueAtTime(0, now + 0.3);
                    bass.start(now);
                    bass.stop(now + 0.3);
                    bgMusicState.currentOscs.push(bass);
                    setTimeout(() => {
                        const idx = bgMusicState.currentOscs.indexOf(bass);
                        if (idx >= 0) bgMusicState.currentOscs.splice(idx, 1);
                    }, 400);
                }
            } catch(e) {}
        }
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
                    var scenery = createScenery(x, z);
                    state.buildings.push(scenery);
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
            // Difficulty-based initial spacing: easy=wide, medium=medium, hard=tight
            const initGap = [30, 20, 15][state.difficulty] || 15;
            const initCount = [10, 15, 20][state.difficulty] || 20;
            for (let z = -30; z > -initGap * initCount; z -= initGap) positions.push(z);
            // Occasionally spawn double obstacles, but not too often
            for (let i = 0; i < positions.length; i++) {
                const z = positions[i];
                // Double obstacle ~every 5th, blocks 2 lanes
                if (i % 5 === 0 && Math.random() < 0.5) {
                    const openLane = Math.floor(Math.random() * 3);
                    const lanes = [0,1,2].filter(l => l !== openLane);
                    for (const lane of lanes) {
                        let obs;
                        const t = Math.random();
                        if (t < 0.55) obs = createTrain(lane, z, false);
                        else if (t < 0.80) obs = createLowFlyingObstacle(lane, z);
                        else obs = createRollUnderTrain(lane, z);
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
                    if (type < 0.35) obs = createTrain(lane, z, false);
                    else if (type < 0.60) obs = createLowFlyingObstacle(lane, z);
                    else if (type < 0.75) obs = createFullLaneBarrier(z);
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

        // Difficulty-based pipe: easy=fewer, hard=more
        const diffMult = [0.4, 0.7, 1.0][state.difficulty] || 1.0;
        const targetCount = Math.min(Math.floor((6 + state.speed * 6) * diffMult), Math.floor(18 * diffMult));
        const spawnZ = -(45 + state.speed * 30 * diffMult) - Math.random() * 15 * diffMult;

        if (ahead.length < targetCount) {
            const z = spawnZ;

            // Skip spawn if any obstacle already in this Z range (overlap prevention)
            const zBlocked = state.obstacles.some(o => Math.abs(o.position.z - z) < 4);
            if (!zBlocked) {

            // Rare double obstacle (10%)
            if (Math.random() < 0.10) {
                const openLane = Math.floor(Math.random() * 3);
                for (const lane of [0,1,2].filter(l => l !== openLane)) {
                    let obs;
                    const t = Math.random();
                    if (t < 0.55) obs = createTrain(lane, z, true);
                    else if (t < 0.80) obs = createLowFlyingObstacle(lane, z);
                    else obs = createRollUnderTrain(lane, z);
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
                        Math.abs(o.position.z - z) < 10
                    );
                    if (hasRollUnderNearby) type = 0.8;
                }
                // Roll-under shouldn't be near ramp trains
                if (type >= 0.55) {
                    const hasRampNearby = state.obstacles.some(o =>
                        o.userData.hasRamp &&
                        Math.abs(o.position.z - z) < 8
                    );
                    if (hasRampNearby) type = 0.3;
                }

                let obs;
                if (type < 0.35) obs = createTrain(lane, z, true);
                else if (type < 0.60) obs = createLowFlyingObstacle(lane, z);
                else if (type < 0.75) obs = createFullLaneBarrier(z);
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
                <div class="diff-select">
                    <button class="diff-btn" data-diff="0">EASY</button>
                    <button class="diff-btn" data-diff="1">MEDIUM</button>
                    <button class="diff-btn active" data-diff="2">HARD</button>
                </div>
                <div id="menu-credits" style="color:#FFD700;font-size:18px;margin:8px 0;">💰 TOTAL: 0</div>
                <div class="menu-controls">
                    <span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;
                    <span class="key">↑</span> Jump &nbsp;|&nbsp;
                    <span class="key">↓</span> Roll
                </div>
                <div class="menu-keys">ESC / P = Pause &nbsp;|&nbsp; M = Menu &nbsp;|&nbsp; 👁 FPV</div>
                <div class="menu-mobile-hint">Swipe to play on mobile</div>
                <div class="menu-btn" id="shop-btn-menu" style="margin-top:10px;font-size:14px;padding:8px 16px;">🛒 SHOP</div>
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

        // ===== DEV CONSOLE =====
        const consoleEl = document.createElement('div');
        consoleEl.id = 'dev-console';
        consoleEl.style.display = 'none';
        consoleEl.innerHTML = '<input type="text" id="console-input" placeholder="enter command..." autofocus/>';
        uiOverlay.appendChild(consoleEl);



        // ===== PAUSE BUTTON =====
        pauseBtnEl = document.createElement('div');
        pauseBtnEl.id = 'pause-btn';
        pauseBtnEl.textContent = '⏸';
        pauseBtnEl.style.display = 'none';
        uiOverlay.appendChild(pauseBtnEl);
        
        // ===== FPV TOGGLE BUTTON =====
        const fpvBtn = document.createElement('div');
        fpvBtn.id = 'fpv-btn';
        fpvBtn.textContent = '\uD83D\uDC41';
        fpvBtn.style.display = 'none';
        uiOverlay.appendChild(fpvBtn);
        fpvBtn.addEventListener('click', () => { state.firstPerson = !state.firstPerson; fpvBtn.textContent = state.firstPerson ? '\uD83D\uDC41' : '\uD83D\uDC41'; });
        fpvBtn.addEventListener('touchend', (e) => { e.preventDefault(); state.firstPerson = !state.firstPerson; });
        
        // ===== CONSOLE BUTTON =====
        const conBtn = document.createElement('div');
        conBtn.id = 'con-btn';
        conBtn.textContent = '>_';
        conBtn.style.display = 'none';
        uiOverlay.appendChild(conBtn);
        conBtn.addEventListener('click', toggleConsole);
        conBtn.addEventListener('touchend', (e) => { e.preventDefault(); toggleConsole(); });
        
        // ===== AUDIO BUTTONS (mute, sfx, music) =====
        // Mute button (top-left, near pause)
        (function() {
            var btn = document.createElement('div');
            btn.id = 'mute-btn';
            btn.textContent = '\uD83D\uDD0A';
            btn.style.display = 'none';
            btn.style.cssText = 'position:absolute;top:16px;left:66px;width:40px;height:40px;font-size:18px;cursor:pointer;z-index:15;pointer-events:auto;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);border-radius:10px;border:1px solid rgba(255,255,255,0.08);transition:all 0.2s;color:rgba(255,255,255,0.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);text-align:center;line-height:40px;';
            uiOverlay.appendChild(btn);
            btn.addEventListener('click', function() { toggleMute(); });
            btn.addEventListener('touchend', function(e) { e.preventDefault(); toggleMute(); });
        })();
        
        // ===== MOBILE CONTROLS (cross layout at center bottom) =====
        const mobileCtrl = document.createElement('div');
        mobileCtrl.id = 'mobile-controls';
        mobileCtrl.innerHTML = `
            <div class="m-row">
                <button class="m-btn" id="m-jump">▲</button>
            </div>
            <div class="m-row">
                <button class="m-btn" id="m-left">◀</button>
                <button class="m-btn" id="m-roll">▼</button>
                <button class="m-btn" id="m-right">▶</button>
            </div>
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
        quitBtn.className = 'menu-btn';
        quitBtn.id = 'quit-btn';
        quitBtn.textContent = 'RETURN TO MENU';
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
        menuOverlay.addEventListener('click', (e) => { if (e.target.closest('.tap-to-start')) startGameFromMenu(); });
        menuOverlay.addEventListener('touchend', (e) => { e.preventDefault(); if (e.target.closest('.tap-to-start')) startGameFromMenu(); });
        
        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            const setDiff = () => {
                state.difficulty = parseInt(btn.dataset.diff);
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            btn.addEventListener('click', setDiff);
            btn.addEventListener('touchend', (e) => { e.preventDefault(); setDiff(); });
        });
        
        // Shop button
        const shopBtnMenu = document.getElementById('shop-btn-menu');
        if (shopBtnMenu) {
            shopBtnMenu.addEventListener('click', (e) => { e.stopPropagation(); showShop(); });
            shopBtnMenu.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); showShop(); });
        }
        
        // Pause overlay click to resume (with dedicated tap target)
        const pauseTapBtn = pauseOverlay.querySelector('.tap-to-start');
        if (pauseTapBtn) {
            pauseTapBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });
            pauseTapBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); togglePause(); });
        }
        pauseOverlay.addEventListener('click', (e) => {
            // Resume on overlay click but not on menu button clicks
            if (e.target.closest('.menu-btn')) return;
            if (e.target === pauseOverlay) togglePause();
        });
        pauseOverlay.addEventListener('touchend', (e) => {
            if (e.target.closest('.menu-btn')) return;
            e.preventDefault();
            if (e.target === pauseOverlay) togglePause();
        });
        
        // Pause button click
        pauseBtnEl.addEventListener('click', togglePause);
        pauseBtnEl.addEventListener('touchend', (e) => { e.preventDefault(); togglePause(); });
        
        // Pause menu - return to menu
        const pauseMenuBtn = document.getElementById('pause-menu-btn');
        if (pauseMenuBtn) {
            pauseMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); quitToMenu(); });
            pauseMenuBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); quitToMenu(); });
        }

        // Console input handler (mobile-friendly: keydown + input + blur)
        const conInput = document.getElementById('console-input');
        if (conInput) {
            function submitConsoleCommand() {
                const val = conInput.value.trim().toLowerCase();
                conInput.value = '';
                document.getElementById('dev-console').style.display = 'none';
                if (state.paused) state.paused = false;
                if (val === 'homelander') {
                    state.homelander = true;
                    activateHomelander();
                }
                if (val === 'quit' && state.homelander) {
                    deactivateHomelander();
                }
            }
            
            conInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    submitConsoleCommand();
                }
                if (e.key === 'Escape') {
                    document.getElementById('dev-console').style.display = 'none';
                    if (state.paused) state.paused = false;
                }
                e.stopPropagation();
            });
            // Mobile virtual keyboard fallback: input event detects newline
            conInput.addEventListener('input', () => {
                if (conInput.value.includes('\n')) {
                    submitConsoleCommand();
                }
            });
            // Blur fallback: pressing Done/Go on mobile keyboard (only if text exists)
            conInput.addEventListener('blur', () => {
                if (conInput.value.trim()) submitConsoleCommand();
            });
        }
        
        // Mobile buttons
        function bindMobileBtn(id, action, key) {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (key) keys[key] = true;
                if (state.started && !state.paused && !state.gameOver) action();
            };
            const end = (e) => {
                if (key) keys[key] = false;
            };
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('touchcancel', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
        }
        bindMobileBtn('m-left', moveLeft, 'ArrowLeft');
        bindMobileBtn('m-right', moveRight, 'ArrowRight');
        bindMobileBtn('m-jump', jump, 'w');
        bindMobileBtn('m-roll', roll, 's');
    }

    // ========== CONTROLS ==========
    const keys = {};

    function setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            // keyCode fallback for non-standard keyboard layouts
            if (e.keyCode) { keys['_kc_' + e.keyCode] = true; }
            
            // Start game from menu
            // Homelander direct movement (instant, held key = continuous smooth)
            if (state.homelander && homelanderGroup) {
                const hlSpeed = 0.25;
                const k = e.key, kc = e.keyCode || e.which;
                const isLeft = k === 'ArrowLeft' || k === 'a' || k === 'A' || kc === 37 || kc === 65;
                const isRight = k === 'ArrowRight' || k === 'd' || k === 'D' || kc === 39 || kc === 68;
                const isUp = k === 'ArrowUp' || k === 'w' || k === 'W' || kc === 38 || kc === 87;
                const isDown = k === 'ArrowDown' || k === 's' || k === 'S' || kc === 40 || kc === 83;
                if (isLeft) { homelanderGroup.position.x -= hlSpeed; e.preventDefault(); }
                if (isRight) { homelanderGroup.position.x += hlSpeed; e.preventDefault(); }
                if (isUp) { homelanderGroup.position.y = Math.min(20, homelanderGroup.position.y + hlSpeed); e.preventDefault(); }
                if (isDown) { homelanderGroup.position.y = Math.max(1, homelanderGroup.position.y - hlSpeed); e.preventDefault(); }
            }
            // Escape: close console first, then pause
            if (e.key === 'Escape') {
                const devCon = document.getElementById('dev-console');
                if (devCon && devCon.style.display === 'flex') {
                    toggleConsole();
                    return;
                }
                if (state.started && !state.gameOver) {
                    togglePause();
                    return;
                }
            }
            // Open dev console with backtick/tilde
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                if (state.started) toggleConsole();
                return;
            }
            
            if (!state.started && (e.key === ' ' || e.key === 'Enter')) {
                startGameFromMenu();
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
        // Homelander uses arrow keys for flight, not lane switching
        if (state.homelander && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown')) return;

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
        if (state.homelander && homelanderGroup) {
            homelanderGroup.position.x -= 0.35;
            return;
        }
        if (state.currentLane > 0) {
            state.startLaneX = player.position.x;
            state.currentLane--;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function moveRight() {
        if (state.homelander && homelanderGroup) {
            homelanderGroup.position.x += 0.35;
            return;
        }
        if (state.currentLane < LANE_COUNT - 1) {
            state.startLaneX = player.position.x;
            state.currentLane++;
            state.targetLane = state.currentLane;
            state.laneLerp = 0;
        }
    }

    function jump() {
        // If already in air: check abilities
        if (state.isJumping) {
            // Jetpack activation: press jump in air when jetpack is equipped and ready
            if (state.canJetpack && state.jetpackCooldown <= 0 && state.jetpackFuel <= 0) {
                state.jetpackFuel = JETPACK_FUEL_MAX;
                state.jumpVelocity = 0;
                playJumpSound();
                return;
            }
            // Jetpack already active, ignore extra presses
            if (state.canJetpack && state.jetpackFuel > 0) {
                return;
            }
            // Double jump: if already in air, can double jump
            if (state.canDoubleJump && !state.hasDoubleJumped) {
                state.hasDoubleJumped = true;
                state.jumpVelocity = DOUBLE_JUMP_VELOCITY;
                state.playerHeight = Math.max(state.playerHeight, 0.5);
                playJumpSound();
                return;
            }
            return;
        }
        
        state.isJumping = true;
        // If was rolling: stay squished during the jump, land back in squat
        // Jump velocity is higher for roll-jumps (spring-loaded) to compensate for low height
        if (state.isRolling) {
            state.rollEndTime = Date.now() + 99999; // keep rolling indefinitely
            state.targetPlayerHeight = ROLL_HEIGHT;
            state.jumpVelocity = JUMP_VELOCITY * 1.5; // spring up higher from squat
            playJumpSound();
            return;
        }
        // If on a roof, jump off it - keep current height and set jumpingFromRoof
        if (state.onRoof) {
            state.jumpingFromRoof = true;
            state.onRoof = false;
            // Keep player at roof height, let jump carry them up/away
            state.jumpVelocity = JUMP_VELOCITY;
            playJumpSound();
            return;
        }
        state.jumpVelocity = JUMP_VELOCITY;
        playJumpSound();
    }

    function roll() {
        if (state.isRolling) return;
        state.isRolling = true;
        state.targetPlayerHeight = ROLL_HEIGHT;
        state.rollEndTime = Date.now() + 400;
        playRollSound();
    }

    // ========== COLLISION DETECTION ==========
    function checkCollisions() {
        // Homelander: invincible, no collisions
        if (state.homelander) return false;
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
            
            // On roof: skip all collisions (ride over everything)
            if (state.onRoof) continue;
            
            // Jumping from roof: skip train collisions until clear
            if (state.jumpingFromRoof && od.type === 'train') {
                // Only skip if player is still near/above the train
                if (Math.abs(playerPos.z - obs.position.z) < 4) {
                    continue;
                }
            }
            
            // Train: height=1.8, visual body center at y=0.9
            // Barrier: height=0.6, visual body center at y=0.3
            // Roll-under: height=0.5 (gap), top bar at y=1.4
            // Full-barrier: height=0.5, center at y=0.25
            // Low-flying: height=0.8, center at y=0.9 (hovering drone)
            let obsY, obsH;
            if (od.type === 'roll_under') {
                obsY = 1.65;
                obsH = 0.5;
            } else if (od.type === 'low_flying') {
                obsY = 1.0;
                obsH = 0.8;
            } else {
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
            
            // Low flying: can roll under OR jump over
            // Use state.playerHeight (actual jump height), not player.position.y (always 0)
            if (od.type === 'low_flying') {
                if (state.isRolling) {
                    continue; // roll under drones
                }
                if (state.isJumping && state.playerHeight > 0.9) {
                    continue; // jumped over
                }
                // Standing: collides
            }
            
            // Full lane barrier: must jump over, rolling still hits
            if (od.type === 'full_barrier') {
                if (state.isJumping && state.playerHeight > 0.9) {
                    continue; // jumped over
                }
                // Standing or rolling: collides
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

            // AABB calculations
            const dx = Math.abs(playerHitbox.x - obsBox.x);
            const dz = Math.abs(playerHitbox.z - obsBox.z);
            const dy = Math.abs(playerHitbox.y - obsBox.y);
            
            // Z threshold: trains are long, barriers are short
            const zThreshold = (playerHitbox.d + obsBox.d) / 2 + 0.1;

            // Roof Walk ability: if player is above obstacle, walk on top instead of death
            if (state.canRoofWalk && !state.onRoof) {
                const obsTop = obsBox.y + obsH / 2;
                const playerBottom = playerHitbox.y - playerHitbox.h / 2;
                // Player is above the obstacle top
                if (playerBottom >= obsTop - 0.1) {
                    // Only sides/front/back count as death, top is safe
                    const sideHit = dx < (playerHitbox.w + obsBox.w) / 2 &&
                                    dz < zThreshold;
                    if (sideHit && playerBottom >= obsTop - 0.1) {
                        // Land on top of obstacle
                        state.onRoof = true;
                        state.playerHeight = obsTop + 0.1;
                        continue;
                    }
                    continue;
                }
            }

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
        const cb = document.getElementById('con-btn');
        if (cb) cb.style.display = 'block';
        var audioBtns = ['mute-btn', 'sfx-btn', 'music-btn'];
        audioBtns.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
        if (!audioCtx) initAudio();
        clock.getDelta();
        const f = document.getElementById('fpv-btn');
        if (f) f.style.display = 'block';
        startBgMusic();
    }
    
    function toggleConsole() {
        const con = document.getElementById('dev-console');
        if (!con) return;
        if (con.style.display === 'flex') {
            con.style.display = 'none';
            state.paused = false;
        } else {
            con.style.display = 'flex';
            state.paused = true;
            const ci = document.getElementById('console-input');
            if (ci) {
                ci.value = '';
                ci.focus();
                // Force keyboard on mobile (re-focus after a tick)
                setTimeout(() => ci.focus(), 100);
            }
        }
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
    
    function toggleMute() {
        state.muted = !state.muted;
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.textContent = state.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        }
        if (state.muted && audioCtx) {
            try { audioCtx.suspend(); } catch(e) {}
            stopBgMusic();
        } else if (!state.muted && audioCtx && audioCtx.state === 'suspended') {
            try { audioCtx.resume(); } catch(e) {}
            if (state.started && !state.gameOver) startBgMusic();
        }
    }

    // ========== CYBER MODE ==========
    function applyCyberColors(on) {
        if (!scene) return;
        // Helper: grayscale a hex color
        function gray(c) {
            const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
            const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            // Dark obstacles become white, bright objects become dark
            // Map lum (0-255) to high contrast range
            const target = lum > 127 ? 200 : 220;
            return (target << 16) | (target << 8) | target;
        }
        function darkGray(c) {
            return 0x222222;
        }
        
        // Iterate ALL scene children recursively
        scene.traverse(function(child) {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
                if (!mat.color) continue;
                const hex = mat.color.getHex();
                if (on) {
                    // Store original color if not already stored
                    if (child.userData._origColor === undefined) {
                        child.userData._origColor = hex;
                    }
                    // Apply grayscale based on original brightness
                    const g = gray(hex);
                    mat.color.setHex(g);
                } else if (child.userData._origColor !== undefined) {
                    mat.color.setHex(child.userData._origColor);
                    delete child.userData._origColor;
                }
            }
        });
        
        // Also change lighting for cyber mode
        if (ambientLight) {
            ambientLight.intensity = on ? 1.2 : 0.7;
            ambientLight.color.setHex(on ? 0xFFFFFF : 0xFFFFFF);
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
        state.hasDoubleJumped = false;
        state.jumpingFromRoof = false;
        state.jetpackFuel = 0;
        state.jetpackCooldown = 0;

        player.position.set(0, 0, 0);
        player.rotation.set(0, 0, 0);
        player.scale.set(1, 1, 1);
        camera.position.set(0, 6, 8);
        camera.lookAt(0, 0, -10);
        
        // Reset theme to City
        if (state.theme !== 0) {
            switchTheme(0);
        }

        gameOverEl.classList.remove('visible');
        pauseOverlay.style.display = 'none';
        stopBgMusic();
        pauseBtnEl.style.display = 'none';
        menuOverlay.style.display = 'flex';
        updateMenuCredits();
        ['mute-btn','sfx-btn','music-btn'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

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
        state.hasDoubleJumped = false;
        state.jumpingFromRoof = false;
        state.jetpackFuel = 0;
        state.jetpackCooldown = 0;
        
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

        // Reset theme to City
        if (state.theme !== 0) {
            switchTheme(0);
        }
        
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
        
        // Convert in-game coins to credits with difficulty multiplier
        const multipliers = [1, 5, 10];
        const multiplier = multipliers[state.difficulty] || 1;
        const earned = state.coins * multiplier;
        state.credits += earned;
        state.totalCoins += state.coins;
        try {
            localStorage.setItem('subwayCredits', String(state.credits));
            localStorage.setItem('subwayTotalCoins', String(state.totalCoins));
        } catch(e) {}
        saveShopData();
        
        // Add earned credits info to game over screen (remove old first)
        const oldCredits = document.getElementById('credits-earned');
        if (oldCredits) oldCredits.remove();
        const creditsInfo = document.createElement('div');
        creditsInfo.id = 'credits-earned';
        creditsInfo.className = 'final-coins';
        creditsInfo.style.color = '#FFD700';
        creditsInfo.style.fontSize = '14px';
        creditsInfo.textContent = '+ ' + earned + ' credits (' + multiplier + 'x)';
        const refEl = gameOverEl.querySelector('.final-coins');
        if (refEl) refEl.after(creditsInfo);
        
        gameOverEl.classList.add('visible');
        // Show best score
        const bestEl = document.getElementById('best-score');
        if (bestEl) bestEl.textContent = 'BEST: ' + state.bestScore + 'm';
        pauseBtnEl.style.display = 'none';
        var muteGO = document.getElementById('mute-btn');
        if (muteGO) muteGO.style.display = 'none';
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
        
        // Moving obstacles: oscillate left-right between lanes
        for (const obs of state.obstacles) {
            if (obs.userData.moving) {
                const ud = obs.userData;
                ud.movePhase += delta * 2.0;
                const offset = Math.sin(ud.movePhase) * LANE_WIDTH * 1.0;
                obs.position.x = ud.baseX + offset;
                // Flash warning lights
                if (ud.warningLights) {
                    const flashOn = Math.sin(state.gameTime * 12) > 0;
                    for (const light of ud.warningLights) {
                        if (light && light.material) {
                            light.material.color.setHex(flashOn ? 0xFFFF00 : 0x886600);
                        }
                    }
                }
            }
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

        // Jetpack: float upward when active
        if (state.isJumping && state.canJetpack && state.jetpackFuel > 0 && state.jetpackCooldown <= 0) {
            state.jumpVelocity = 0; // cancel gravity
            state.playerHeight += JETPACK_LIFT * delta * 60;
            state.jetpackFuel -= delta;
            if (state.jetpackFuel <= 0) {
                state.jetpackFuel = 0;
                state.jetpackCooldown = JETPACK_COOLDOWN_MAX;
            }
        } else if (state.jetpackCooldown > 0) {
            state.jetpackCooldown -= delta;
            if (state.jetpackCooldown < 0) state.jetpackCooldown = 0;
        }
        
        // Jump physics - roll in air = fall faster
        if (state.isJumping) {
            state.playerHeight += state.jumpVelocity * delta * 60;
            const gravMult = state.isRolling ? 2.5 : 1.0;
            state.jumpVelocity += GRAVITY * gravMult * delta * 60;
            if (state.playerHeight <= PLAYER_Y) {
                state.playerHeight = PLAYER_Y;
                state.isJumping = false;
                state.hasDoubleJumped = false;
                state.jumpingFromRoof = false;
                state.jumpVelocity = 0;
                // Roll-jump landing: stay in squat for a moment
                if (state.isRolling && !state.rolledLand) {
                    state.rolledLand = true;
                    state.rolledLandTime = Date.now();
                }
                // If jetpack was active, start cooldown
                if (state.canJetpack && state.jetpackFuel <= 0 && state.jetpackCooldown <= 0) {
                    // Already handled above
                }
            }
        }

        // Roll height - tuck in air OR on ground
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

        // Scale for roll (visual squash - always applied, even during jump)
        if (state.isRolling) {
            const scaleY = (ROLL_HEIGHT + 0.2) / (PLAYER_Y + 0.2);
            player.scale.y = 1 - (1 - scaleY) * 0.7;
            player.position.y = state.playerHeight; // stay low even when jumping
        } else {
            player.scale.y += (1 - player.scale.y) * 0.15;
        }
        
        // Release roll when down key not held
        // Roll-jump: lands in squat, auto-stands after a short delay
        if (state.isRolling && !state.isJumping) {
            const now = Date.now();
            const downHeld = keys['ArrowDown'] || keys['s'] || keys['S'];
            if (downHeld) {
                state.rollEndTime = now + 200;
                state.rolledLand = false;
            } else if (state.rolledLand && now > state.rolledLandTime + 400) {
                // Roll-jump landing: stayed in squat for 400ms, now stand
                state.isRolling = false;
                state.targetPlayerHeight = PLAYER_Y;
                state.rolledLand = false;
            } else if (now < state.rollEndTime) {
                // Still in min roll duration (from swipe or roll-jump)
            } else {
                state.isRolling = false;
                state.targetPlayerHeight = PLAYER_Y;
            }
        }
        
        // Roof mechanics: ride on any obstacle roofs, jump between them
        // When jumping, don't force player onto roof (allows jump from rooftops)
        if (state.onRoof && !state.isJumping) {
            state.playerHeight = ROOF_TOP_Y + PLAYER_Y;
            player.position.y = state.playerHeight;
            // Check if there's a surface beneath (train or roll-under)
            const hasSurfaceBelow = state.obstacles.some(o =>
                Math.abs(o.position.z) < 4 &&
                Math.abs(o.position.x - player.position.x) < 1.5
            );
            if (!hasSurfaceBelow) {
                state.onRoof = false;
            }
        }
        
        // jumpingFromRoof: clear when player is well clear of the train
        if (state.jumpingFromRoof && !state.isJumping) {
            state.jumpingFromRoof = false;
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

        // Homelander - override game over
        if (state.homelander) state.gameOver = false;
        
        // Collision detection
        if (checkCollisions()) {
            gameOver();
            updateCamera();
            return;
        }
        
        // Theme change based on score
        checkThemeChange();

        if (state.homelander) updateHomelander(delta);
        updateBgMusic(delta);
        updateCamera();
    }

    function easeOutQuad(t) {
        return t * (2 - t);
    }

    function updateCamera() {
        if (!camera) return;
        
        // Use Homelander position when in easter egg mode
        const camTarget = (state.homelander && homelanderGroup) ? homelanderGroup.position : (player ? player.position : null);
        if (!camTarget) return;

        if (isNaN(camTarget.x)) camTarget.x = 0;
        if (isNaN(camTarget.y)) camTarget.y = 1;
        if (isNaN(camTarget.z)) camTarget.z = 0;

        if (state.firstPerson) {
            // Drop camera significantly when rolling/sliding so it actually feels like ducking
            const rollDrop = state.isRolling ? -0.9 : 0;
            const eyeY = camTarget.y + 1.3 + rollDrop;
            const eyeZ = camTarget.z + 0.5;
            camera.position.set(camTarget.x, eyeY, eyeZ);
            camera.lookAt(camTarget.x, camTarget.y + 0.3, camTarget.z - 30);
            if (player) player.visible = false;
            // Hide Homelander model in FPV so it doesn't block the view
            if (homelanderGroup) homelanderGroup.visible = false;
        } else {
            if (homelanderGroup) homelanderGroup.visible = true;
            const targetX = camTarget.x;
            const targetY = camTarget.y + 5;
            const targetZ = camTarget.z + 7;
            let shakeX = 0, shakeY = 0;
            if (state.cameraShake > 0.01) {
                shakeX = (Math.random() - 0.5) * state.cameraShake * 0.3;
                shakeY = (Math.random() - 0.5) * state.cameraShake * 0.3;
            }
            camera.position.x += (targetX + shakeX - camera.position.x) * 0.1;
            camera.position.y += (targetY + shakeY - camera.position.y) * 0.1;
            camera.position.z += (targetZ - camera.position.z) * 0.1;
            camera.lookAt(camTarget.x, camTarget.y - 1, camTarget.z - 10);
            if (player && !state.homelander) player.visible = true;
        }
    }

    // ========== HOMELANDER EASTER EGG ==========
    let homelanderGroup = null;
    let laserBeams = [];
    let laserLeftBeam = null;
    let laserRightBeam = null;
    let homelanderCape = null;

    function activateHomelander() {
        if (!player) return;
        // Hide original player
        player.visible = false;
        // Create Homelander figure
        homelanderGroup = new THREE.Group();
        homelanderGroup.position.copy(player.position);
        homelanderGroup.position.y = 6;
        homelanderGroup.rotation.y = Math.PI; // face -Z (back to camera)
        
        // === BODY (improved proportions) ===
        const suitMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        const suitMatDark = new THREE.MeshLambertMaterial({ color: 0x15205A });
        
        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.10, 8), suitMat);
        neck.position.set(0, 1.08, 0);
        homelanderGroup.add(neck);
        
        // Upper torso (chest, wider)
        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.35, 0.30),
            suitMat
        );
        chest.position.set(0, 0.82, 0);
        homelanderGroup.add(chest);
        
        // Lower torso (waist, narrower)
        const waist = new THREE.Mesh(
            new THREE.BoxGeometry(0.50, 0.25, 0.25),
            suitMatDark
        );
        waist.position.set(0, 0.48, 0);
        homelanderGroup.add(waist);
        
        // Shoulders (broad)
        const shoulderMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.10, 0.30), shoulderMat);
        shoulder.position.y = 1.00;
        homelanderGroup.add(shoulder);
        
        // Pecs (chest muscles)
        const pecMat = new THREE.MeshLambertMaterial({ color: 0x1E2A6E });
        for (let side = -1; side <= 1; side += 2) {
            const pec = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), pecMat);
            pec.position.set(side * 0.14, 0.82, 0.17);
            homelanderGroup.add(pec);
        }
        
        // === HEAD (improved realism) ===
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xFFDDCC });
        // Main head shape (elongated oval)
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 12, 10),
            skinMat
        );
        head.position.y = 1.32;
        head.scale.set(1, 1.15, 0.85);
        homelanderGroup.add(head);
        
        // Strong jaw/chin
        const jaw = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.10, 0.16),
            skinMat
        );
        jaw.position.set(0, 1.14, 0.20);
        homelanderGroup.add(jaw);
        
        // Chin point
        const chin = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            skinMat
        );
        chin.position.set(0, 1.07, 0.24);
        homelanderGroup.add(chin);
        
        // Nose bridge
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xEECCB8 });
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), noseMat);
        nose.position.set(0, 1.26, 0.24);
        homelanderGroup.add(nose);
        const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), noseMat);
        noseTip.position.set(0, 1.24, 0.27);
        homelanderGroup.add(noseTip);
        
        // Eyebrows (slight ridges)
        const browMat = new THREE.MeshLambertMaterial({ color: 0xCCAA55 });
        for (let side = -1; side <= 1; side += 2) {
            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), browMat);
            brow.position.set(side * 0.08, 1.38, 0.22);
            brow.rotation.z = side * 0.15;
            homelanderGroup.add(brow);
        }
        
        // Blonde hair - larger, swept back
        const hairMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), hairMat);
        hair.position.set(0, 1.50, 0.02);
        hair.scale.set(1.05, 0.35, 0.75);
        homelanderGroup.add(hair);
        // Hair sides
        for (let side = -1; side <= 1; side += 2) {
            const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.12), hairMat);
            sideHair.position.set(side * 0.20, 1.42, 0.08);
            homelanderGroup.add(sideHair);
        }
        // Hair swoop/forelock (swept back)
        const swoop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.20), hairMat);
        swoop.position.set(0, 1.52, -0.08);
        swoop.rotation.x = -0.3;
        homelanderGroup.add(swoop);
        // Extra hair on top
        const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), hairMat);
        topHair.position.set(0, 1.53, 0.04);
        homelanderGroup.add(topHair);
        
        // Eyes (white sclera + red glowing pupils)
        const scleraMat = new THREE.MeshLambertMaterial({ color: 0xFFEEEE });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0xFF2200 });
        for (let side = -1; side <= 1; side += 2) {
            const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), scleraMat);
            sclera.position.set(side * 0.08, 1.34, 0.22);
            homelanderGroup.add(sclera);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
            pupil.position.set(side * 0.08, 1.34, 0.24);
            homelanderGroup.add(pupil);
        }
        
        // === CAPE with US Flag (3D mesh construction) ===
        const capeGroup = new THREE.Group();
        capeGroup.position.set(0, 0.60, -0.28);
        capeGroup.rotation.x = 0.25;
        homelanderGroup.add(capeGroup);
        homelanderCape = capeGroup;
        
        // Cape dimensions: narrower (0.9 wide x 0.85 tall)
        const CW = 0.9;
        const CH = 0.85;
        const stripeH = CH / 13;
        
        // BOTH sides visible always
        const ds = THREE.DoubleSide;
        // Base: red cape fabric
        const baseMat = new THREE.MeshBasicMaterial({ color: 0xB22234, side: ds });
        const baseCape = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), baseMat);
        capeGroup.add(baseCape);
        
        // White stripes (6 stripes)
        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        for (let i = 1; i < 13; i += 2) {
            const yPos = CH/2 - (i + 0.5) * stripeH;
            const s = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.02, stripeH * 0.9, 0.015), whiteMat);
            s.position.set(0, yPos, -0.015);
            capeGroup.add(s);
        }
        
        // Blue canton (top-left corner, covers top 7 stripes)
        const cantonW = CW * 0.40;
        const cantonH = stripeH * 7;
        const cantonMat = new THREE.MeshBasicMaterial({ color: 0x3C3B6E, side: ds });
        const canton = new THREE.Mesh(new THREE.BoxGeometry(cantonW, cantonH, 0.015), cantonMat);
        canton.position.set(-CW/2 + cantonW/2, CH/2 - cantonH/2, -0.015);
        capeGroup.add(canton);
        
        // Stars: small white cubes (visible from ALL angles, unlike CircleGeometry)
        const starMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        const starCols = [6, 5, 6, 5, 6, 5, 6, 5, 6];
        const cellW = cantonW / 7;
        const cellH = cantonH / 10;
        const starS = Math.min(cellW, cellH) * 0.12;
        const starGeo = new THREE.BoxGeometry(starS, starS, 0.02);
        for (let row = 0; row < 9; row++) {
            const cols = starCols[row];
            for (let col = 0; col < cols; col++) {
                const sx = -CW/2 + (col + 1) * cellW - cellW/2;
                const sy = CH/2 - (row + 1) * cellH + cellH/2;
                const star = new THREE.Mesh(starGeo, starMat);
                star.position.set(sx, sy, -0.02);
                capeGroup.add(star);
            }
        }
        
        // Dark red backing - positioned behind the flag cape
        const backMat = new THREE.MeshBasicMaterial({ color: 0x550000, side: THREE.DoubleSide });
        const backCape = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.96), backMat);
        backCape.position.set(0, 0.60, -0.35);
        backCape.rotation.x = 0.25;
        homelanderGroup.add(backCape);
        
        // Cape clasp/knot at the neck
        const claspMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 6), claspMat);
        clasp.position.set(0, 0.97, -0.13);
        clasp.rotation.x = 0.5;
        homelanderGroup.add(clasp);
        
        // Two small gold buttons at the connection point
        for (let side = -1; side <= 1; side += 2) {
            const btn = new THREE.Mesh(
                new THREE.CircleGeometry(0.04, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFD700 })
            );
            btn.position.set(side * 0.12, 0.95, -0.14);
            homelanderGroup.add(btn);
        }
        
        // === EAGLE EMBLEM on chest ===
        const emblemMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), emblemMat);
        emblem.position.set(0, 0.75, 0.18);
        homelanderGroup.add(emblem);
        // Eagle wings (small angled boxes)
        for (let side = -1; side <= 1; side += 2) {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), emblemMat);
            wing.position.set(side * 0.15, 0.78, 0.18);
            wing.rotation.z = side * 0.4;
            homelanderGroup.add(wing);
        }
        
        // === ARMS (thicker, more muscular) ===
        const armMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        const gloveMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        for (let side = -1; side <= 1; side += 2) {
            // Upper arm
            const upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), armMat);
            upper.position.set(side * 0.34, 0.75, 0);
            homelanderGroup.add(upper);
            // Forearm
            const fore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), armMat);
            fore.position.set(side * 0.34, 0.48, 0);
            homelanderGroup.add(fore);
            // Glove/fist
            const glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), gloveMat);
            glove.position.set(side * 0.34, 0.33, 0);
            homelanderGroup.add(glove);
        }
        
        // === LEGS (thicker) ===
        const legMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        const bootMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        for (let side = -1; side <= 1; side += 2) {
            // Thigh
            const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.14), legMat);
            thigh.position.set(side * 0.14, 0.32, 0);
            homelanderGroup.add(thigh);
            // Calf
            const calf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), legMat);
            calf.position.set(side * 0.14, 0.14, 0);
            homelanderGroup.add(calf);
            // Boot
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.22), bootMat);
            boot.position.set(side * 0.14, 0.05, 0.03);
            homelanderGroup.add(boot);
        }
        
        // Belt with buckle
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.05, 0.18),
            new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        belt.position.set(0, 0.36, 0.12);
        homelanderGroup.add(belt);
        // Belt buckle (gold)
        const buckle = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.02),
            new THREE.MeshBasicMaterial({ color: 0xFFD700 })
        );
        buckle.position.set(0, 0.36, 0.22);
        homelanderGroup.add(buckle);
        
        scene.add(homelanderGroup);
        // Update exposed reference for debugging
        if (window.__neoGame) window.__neoGame.homelanderGroup = homelanderGroup;
        
        // Disable normal physics, fly up
        state.isJumping = false;
        state.isRolling = false;
    }    function deactivateHomelander() {
        state.homelander = false;
        if (homelanderGroup) {
            // Dispose cape texture
            if (homelanderCape && homelanderCape.material) {
                if (homelanderCape.material.map) {
                    homelanderCape.material.map.dispose();
                }
                homelanderCape.material.dispose();
            }
            scene.remove(homelanderGroup);
            disposeObject(homelanderGroup);
            homelanderGroup = null;
        }
        // Clean up lasers
        if (laserLeftBeam) {
            if (laserLeftBeam.userData.glow) {
                scene.remove(laserLeftBeam.userData.glow);
                laserLeftBeam.userData.glow.geometry.dispose();
                laserLeftBeam.userData.glow.material.dispose();
            }
            scene.remove(laserLeftBeam);
            laserLeftBeam.geometry.dispose();
            laserLeftBeam.material.dispose();
        }
        if (laserRightBeam) {
            if (laserRightBeam.userData.glow) {
                scene.remove(laserRightBeam.userData.glow);
                laserRightBeam.userData.glow.geometry.dispose();
                laserRightBeam.userData.glow.material.dispose();
            }
            scene.remove(laserRightBeam);
            laserRightBeam.geometry.dispose();
            laserRightBeam.material.dispose();
        }
        laserLeftBeam = null;
        laserRightBeam = null;
        laserBeams = [];
        homelanderCape = null;
        // Show original player
        if (player) player.visible = true;
    }

    function updateHomelander(delta) {
        if (!state.homelander || !homelanderGroup) return;
        
        // WASD / Arrow keys to fly
        const speed = 0.15;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) homelanderGroup.position.y += speed * delta * 60;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) homelanderGroup.position.y -= speed * delta * 60;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) homelanderGroup.position.x -= speed * delta * 60;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) homelanderGroup.position.x += speed * delta * 60;
        
        // Float down slowly if not pressing anything
        if (!keys['ArrowUp'] && !keys['w'] && !keys['W'] && !keys['ArrowDown'] && !keys['s'] && !keys['S']) {
            homelanderGroup.position.y += Math.sin(state.gameTime * 1.5) * 0.008;
        }
        
        // Clamp Y (not too high/low)
        if (homelanderGroup.position.y < 1) homelanderGroup.position.y = 1;
        if (homelanderGroup.position.y > 20) homelanderGroup.position.y = 20;
        
        // Cape flutter animation - rotates the cape group and backCape together
        if (homelanderCape) {
            const flutter = Math.sin(state.gameTime * 3);
            const tilt = 0.25 + flutter * 0.20;
            homelanderCape.rotation.x = tilt;
            homelanderCape.rotation.z = Math.sin(state.gameTime * 2.5) * 0.06;
            // Find and sync the backCape (at position.z < -0.18 is not our capeGroup)
            for (let i = homelanderGroup.children.length - 1; i >= 0; i--) {
                const child = homelanderGroup.children[i];
                if (child === homelanderCape) continue;
                if (Math.abs(child.position.z - (-0.35)) < 0.01) {
                    child.rotation.x = tilt;
                    child.rotation.z = homelanderCape.rotation.z;
                    break;
                }
            }
        }
        
        // Background color changes with speed
        const speedLevel = Math.floor((state.speed - START_SPEED) / (MAX_SPEED - START_SPEED) * 49) + 1;
        const speedRatio = Math.min(state.speed / MAX_SPEED, 1.0);
        
        // CYBER MODE: at 48x+ speed, full black & white future tech scene
        const inCyber = speedLevel >= 48;
        if (inCyber !== state.cyberMode) {
            state.cyberMode = inCyber;
            applyCyberColors(inCyber);
        }
        if (inCyber) {
            scene.background.setHex(0x000000);
            scene.fog.color.setHex(0x000000);
            scene.fog.near = 25;
            scene.fog.far = 70;
        } else if (speedRatio < 0.3) {
            scene.background.setHex(0x87CEEB);
            scene.fog.color.setHex(0x87CEEB);
            scene.fog.near = 60;
            scene.fog.far = 120;
        } else if (speedRatio < 0.6) {
            const t = (speedRatio - 0.3) / 0.3;
            const r = Math.round(0x87 * (1-t) + 0xFF * t);
            const g = Math.round(0xCE * (1-t) + 0x99 * t);
            const b = Math.round(0xEB * (1-t) + 0x33 * t);
            scene.background.setRGB(r/255, g/255, b/255);
            scene.fog.color.copy(scene.background);
        } else {
            const t = Math.min((speedRatio - 0.6) / 0.4, 1.0);
            const r = Math.round(0xFF * (1-t) + 0x55 * t);
            const g = Math.round(0x99 * (1-t) + 0x11 * t);
            const b = Math.round(0x33 * (1-t) + 0x11 * t);
            scene.background.setRGB(r/255, g/255, b/255);
            scene.fog.color.copy(scene.background);
        }
        
        // Continuous laser beams from the eyes - always-on, pointing forward-downward
        const laserLength = 12;
        laserBeams.length = 0; // Clear old position cache
        
        // Get the homelander world position for the eyes
        const eyeY = homelanderGroup.position.y + 1.35;
        
        // Two beam positions (left/right eye)
        for (let side = -1; side <= 1; side += 2) {
            const bx = homelanderGroup.position.x + side * 0.08;
            const by = eyeY;
            const bz = homelanderGroup.position.z + 0.2;
            
            // Laser direction: forward (-Z) and slightly downward
            const dirZ = -1.0;
            const dirY = -0.35;
            const len = Math.sqrt(dirZ * dirZ + dirY * dirY);
            const nz = dirZ / len;
            const ny = dirY / len;
            
            // Create or reuse laser mesh
            let beam = side === -1 ? laserLeftBeam : laserRightBeam;
            if (!beam) {
                const laserGeo = new THREE.CylinderGeometry(0.025, 0.08, laserLength, 4);
                const laserMat = new THREE.MeshBasicMaterial({
                    color: 0xFF2200,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending
                });
                beam = new THREE.Mesh(laserGeo, laserMat);
                // Outer glow beam
                const glowGeo = new THREE.CylinderGeometry(0.05, 0.15, laserLength, 4);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: 0xFF0000,
                    transparent: true,
                    opacity: 0.2,
                    blending: THREE.AdditiveBlending
                });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                beam.userData.glow = glow;
                scene.add(glow);
                scene.add(beam);
                if (side === -1) laserLeftBeam = beam;
                else laserRightBeam = beam;
            }
            
            // FPV: show both laser beams clearly at half opacity (not blocking center view)
            if (state.firstPerson) {
                beam.material.opacity = 0.50;
                if (beam.userData.glow) beam.userData.glow.material.opacity = 0.20;
            } else {
                beam.material.opacity = 0.85;
                if (beam.userData.glow) beam.userData.glow.material.opacity = 0.25;
            }
            beam.scale.x = 1;
            beam.scale.z = 1;
            beam.visible = true;
            if (beam.userData.glow) beam.userData.glow.visible = true;
            
            // Position beam at midpoint between start and end
            const endX = bx;
            const endY = by + ny * laserLength;
            const endZ = bz + nz * laserLength;
            const midX = (bx + endX) / 2;
            const midY = (by + endY) / 2;
            const midZ = (bz + endZ) / 2;
            beam.position.set(midX, midY, midZ);
            
            // Rotate to face the direction (default cylinder is along Y)
            const angle = Math.atan2(dirZ, dirY);
            beam.rotation.x = angle;
            
            // Update glow
            if (beam.userData.glow) {
                beam.userData.glow.position.copy(beam.position);
                beam.userData.glow.rotation.copy(beam.rotation);
            }
            
            // Continuous pulse intensity
            const pulse = 0.85 + Math.sin(state.gameTime * 8 + side) * 0.15;
            beam.material.opacity = pulse;
            if (beam.userData.glow) beam.userData.glow.material.opacity = pulse * 0.25;
            
            // Destroy obstacles in the beam path
            for (let oi = state.obstacles.length - 1; oi >= 0; oi--) {
                const obs = state.obstacles[oi];
                const obsZ = obs.position.z;
                if (obsZ > bz || obsZ < bz - laserLength) continue; // not in beam range
                const dx = Math.abs(obs.position.x - bx);
                if (dx > 0.7) continue; // not in beam width
                // Check if beam Y reaches this obstacle's height
                const fraction = (bz - obsZ) / laserLength;
                const beamY = by - fraction * Math.abs(ny) * laserLength / Math.abs(nz);
                const obsHeight = obs.userData.height || 0.6;
                const obsTop = obs.position.y + obsHeight;
                if (beamY < obsTop + 0.5 && beamY > obs.position.y - 0.3) {
                    // Hit!
                    disposeObject(obs);
                    scene.remove(obs);
                    state.obstacles.splice(oi, 1);
                    spawnDestroyParticles(obs.position);
                }
            }
        }
        
        // Invincible
        state.gameOver = false;
    }

    function spawnDestroyParticles(pos) {
        // Cap particles to prevent performance issues
        if (state.particles.length > 300) return;
        
        const colors = [0xFF4400, 0xFFAA00, 0xFF6600, 0xFFFF00, 0xFF2200];
        const count = 6;
        
        // Flash sphere at explosion point
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 1 })
        );
        flash.position.copy(pos);
        flash.userData = {
            vx: 0, vy: 0, vz: 0,
            life: 0.4,
            decay: 0.04,
            scale: true
        };
        scene.add(flash);
        state.particles.push(flash);
        
        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 1
                })
            );
            p.position.copy(pos);
            p.position.x += (Math.random() - 0.5) * 0.8;
            p.position.y += Math.random() * 0.3;
            p.position.z += (Math.random() - 0.5) * 0.8;
            const speed = 0.12 + Math.random() * 0.2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.7;
            p.userData = {
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.15,
                vz: Math.cos(phi) * speed,
                life: 0.8 + Math.random() * 0.3,
                decay: 0.025 + Math.random() * 0.02
            };
            scene.add(p);
            state.particles.push(p);
        }
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

    // ========== THEME SYSTEM ==========
    
    const THEME_COLORS = [
        { // 0: City
            bg: 0x87CEEB,
            fog: 0x87CEEB,
            ground: 0x4a4a4e,
            laneMark: 0x6a6a6e,
            curb: 0x5a5a5a,
            buildings: [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B]
        },
        { // 1: Forest
            bg: 0x4CAF50,
            fog: 0x4CAF50,
            ground: 0x5D4037,
            laneMark: 0x6D4C41,
            curb: 0x4E342E,
            buildings: [0x5D4037, 0x6A4E37, 0x4C7A3A, 0x3E6B2F, 0x7B6B3B, 0x8B5E3C]
        },
        { // 2: Desert
            bg: 0xE8C170,
            fog: 0xE8C170,
            ground: 0xC2A670,
            laneMark: 0xD4C080,
            curb: 0xB8956A,
            buildings: [0xD4A86A, 0xC2956A, 0xB88A5A, 0xC8A878, 0xD8B888, 0xA8884A]
        },
        { // 3: Ocean/Arctic
            bg: 0x1a5276,
            fog: 0x1a5276,
            ground: 0x85C1E9,
            laneMark: 0xAED6F1,
            curb: 0x7FB3D8,
            buildings: [0x85C1E9, 0xAED6F1, 0x5DADE2, 0x7FB3D8, 0x95C8E0, 0xB8D8F0]
        }
    ];
    
    function switchTheme(themeIndex) {
        if (themeIndex === state.theme || themeIndex < 0 || themeIndex > 3) return;
        state.theme = themeIndex;
        
        const theme = THEME_COLORS[themeIndex];
        scene.background.setHex(theme.bg);
        scene.fog.color.setHex(theme.fog);
        scene.fog.near = themeIndex >= 2 ? 40 : 60;
        scene.fog.far = themeIndex >= 2 ? 90 : 120;
        
        // Update existing track segments
        for (const seg of state.trackSegments) {
            seg.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                // Ground
                if (child.geometry.type === 'BoxGeometry' && child.geometry.parameters.height === 0.2) {
                    child.material.color.setHex(theme.ground);
                }
                // Lane markings
                if (child.geometry.parameters.height === 0.01) {
                    child.material.color.setHex(theme.laneMark);
                }
                // Curbs
                if (child.geometry.parameters.height === 0.3) {
                    child.material.color.setHex(theme.curb);
                }
            });
        }
        
        // Respawn buildings with new theme shapes (remove old, spawn fresh)
        for (var i = state.buildings.length - 1; i >= 0; i--) {
            var b = state.buildings[i];
            disposeObject(b);
            scene.remove(b);
        }
        state.buildings = [];
        // Spawn a batch of new themed scenery ahead
        var spawnAhead = state.started ? SPAWN_AHEAD : 200;
        for (var z = 0; z > -spawnAhead; z -= 6 + Math.random() * 8) {
            for (var side = -1; side <= 1; side += 2) {
                if (Math.random() > 0.3) {
                    var x = side * (GROUND_WIDTH / 2 + 2 + Math.random() * 3);
                    var sc = createScenery(x, z);
                    state.buildings.push(sc);
                }
            }
        }
        
        // Update obstacles (train colors)
        for (const obs of state.obstacles) {
            obs.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                const hex = child.material.color.getHex();
                // Only color train body meshes
                if (hex === 0xE53935 || hex === 0x1E88E5 || hex === 0x43A047 || hex === 0xFB8C00 || hex === 0x8E24AA) {
                    const trainColors = themeIndex === 0 ? [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA] :
                        themeIndex === 1 ? [0x6A1B9A, 0x2E7D32, 0x1565C0, 0xE65100, 0x4E342E] :
                        themeIndex === 2 ? [0xD84315, 0xFF8F00, 0xC62828, 0xEF6C00, 0xBF360C] :
                        [0x00ACC1, 0x00838F, 0x0277BD, 0x00695C, 0x4DD0E1];
                    child.material.color.setHex(trainColors[Math.floor(Math.random() * trainColors.length)]);
                }
            });
        }
    }
    
    function hashCode(s) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            const chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }
    
    // Check for theme change based on score
    function checkThemeChange() {
        const score = Math.floor(state.score);
        let newTheme = 0;
        if (score >= 3000) newTheme = 3;
        else if (score >= 1500) newTheme = 2;
        else if (score >= 500) newTheme = 1;
        if (newTheme !== state.theme) {
            switchTheme(newTheme);
        }
    }

    // ========== SHOP SYSTEM ==========
    
    let shopOverlay = null;
    
    function loadShopData() {
        try {
            const saved = localStorage.getItem('subwayShop');
            if (saved) {
                const data = JSON.parse(saved);
                state.credits = data.credits || 0;
                state.equippedAbility = data.equippedAbility || 0;
                state.canDoubleJump = data.doubleJump || false;
                state.canJetpack = data.jetpack || false;
                state.canRoofWalk = data.roofWalk || false;
            }
        } catch(e) {}
    }
    
    function saveShopData() {
        try {
            const data = {
                credits: state.credits,
                equippedAbility: state.equippedAbility,
                doubleJump: state.canDoubleJump,
                jetpack: state.canJetpack,
                roofWalk: state.canRoofWalk
            };
            localStorage.setItem('subwayShop', JSON.stringify(data));
        } catch(e) {}
    }
    
    function showShop() {
        if (!shopOverlay) {
            shopOverlay = document.createElement('div');
            shopOverlay.id = 'shop-overlay';
            shopOverlay.className = 'overlay';
        }
        
        const owned = [false, state.canDoubleJump, state.canJetpack, state.canRoofWalk];
        const prices = [0, 10000, 50000, 100000];
        const names = ['None', 'Double Jump', 'Jetpack', 'Roof Walk'];
        const descs = ['No ability equipped', 'Double jump in mid-air', 'Fly for 30s every 15s cooldown', 'Walk on top of obstacles'];
        
        let html = '<div class="menu-content" style="max-height:85vh;overflow-y:auto;">';
        html += '<h1 class="menu-title" style="font-size:28px;margin-bottom:5px;">SHOP</h1>';
        html += '<div style="color:#FFD700;font-size:20px;margin-bottom:15px;">💰 ' + state.credits + ' credits</div>';
        
        for (let i = 0; i < 4; i++) {
            const isEquipped = state.equippedAbility === i;
            const isOwned = i === 0 || owned[i];
            const btnClass = isEquipped ? 'diff-btn active' : 'diff-btn';
            const btnDisabled = !isOwned && state.credits < prices[i] ? 'disabled' : '';
            html += '<div style="margin:8px 0;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;">';
            html += '<div style="font-size:16px;font-weight:bold;color:white;">' + names[i] + '</div>';
            html += '<div style="font-size:12px;color:#aaa;margin:3px 0;">' + descs[i] + '</div>';
            if (i === 0) {
                if (state.equippedAbility === 0) {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(0)">EQUIP NONE</button>';
                }
            } else if (isOwned) {
                if (isEquipped) {
                    html += '<button class="diff-btn active" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(' + i + ')">EQUIP</button>';
                }
            } else {
                if (state.credits >= prices[i]) {
                    html += '<button class="diff-btn" onclick="__neoBuy(' + i + ')">BUY ' + prices[i] + 'cr</button>';
                } else {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.4;">' + prices[i] + 'cr</button>';
                }
            }
            html += '</div>';
        }
        
        // Settings: audio controls
        html += '<hr style="border-color:rgba(255,255,255,0.1);margin:15px 0;">';
        html += '<h2 style="color:#fff;font-size:18px;margin-bottom:10px;">⚙ SETTINGS</h2>';
        html += '<div style="margin:5px 0;">🔊 Master: <span id="vol-master">' + (state.muted ? 'OFF' : 'ON') + '</span>';
        html += ' <button class="diff-btn" onclick="toggleMute();document.getElementById(\'vol-master\').textContent=state.muted?\'OFF\':\'ON\';showShop()">TOGGLE</button></div>';
        html += '<hr style="border-color:rgba(255,255,255,0.05);margin:8px 0;">';
        html += '<div style="color:#aaa;font-size:13px;margin-top:5px;">Controls: ↑ Jump | ↓ Roll | ← → Move | 👁 FPV | ` Console | M Menu</div>';
        html += '<div class="menu-btn" onclick="__neoCloseShop()">CLOSE</div>';
        html += '</div>';
        
        shopOverlay.innerHTML = html;
        document.body.appendChild(shopOverlay);
        shopOverlay.style.display = 'flex';
        
        // Wire up global click handlers
        window.__neoEquip = function(idx) {
            state.equippedAbility = idx;
            state.canDoubleJump = (idx === 1);
            state.canJetpack = (idx === 2);
            state.canRoofWalk = (idx === 3);
            saveShopData();
            showShop(); // refresh
        };
        window.__neoBuy = function(idx) {
            const prices = [0, 10000, 50000, 100000];
            if (state.credits >= prices[idx]) {
                state.credits -= prices[idx];
                if (idx === 1) state.canDoubleJump = true;
                else if (idx === 2) state.canJetpack = true;
                else if (idx === 3) state.canRoofWalk = true;
                state.equippedAbility = idx;
                saveShopData();
                showShop(); // refresh
            }
        };
        window.__neoCloseShop = function() {
            shopOverlay.style.display = 'none';
            updateMenuCredits();
        };
    }
    
    function updateMenuCredits() {
        const el = document.getElementById('menu-credits');
        if (el) el.textContent = '💰 TOTAL: ' + state.credits;
    }

    // ========== INIT ==========
    function init() {
        initScene();
        loadShopData();
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

        // Update menu credits
        updateMenuCredits();

        // Show menu initially
        menuOverlay.style.display = 'flex';
        state.started = false;
        
        window.__neoGame = { state, scene, camera, player, renderer, animate, restartGame, quitToMenu, togglePause, homelanderGroup };
        
        animate();
    }

    // Start when DOM ready (THREE is loaded synchronously from CDN)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

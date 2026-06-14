// ===== ENDLESS RUNNER - Track System =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createTrackSegment = function(zPos) {
        var group = new THREE.Group();
        group.position.z = zPos;

        var isPvp = !!(SG.state && SG.state.pvpMode);
        var groundMat = isPvp
            ? new THREE.MeshPhongMaterial({ color: 0x05060b, emissive: 0x14031f, shininess: 96, transparent: true, opacity: 0.88 })
            : (SG.createTrackGroundMaterial ? SG.createTrackGroundMaterial() : new THREE.MeshLambertMaterial({ color: 0x4a4a4e }));
        var ground = new THREE.Mesh(new THREE.BoxGeometry(SG.GROUND_WIDTH, 0.2, SG.TRACK_SEGMENT_LENGTH), groundMat);
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        ground.userData.pvpGlassTrack = isPvp;
        group.add(ground);

        var markMat = isPvp
            ? new THREE.MeshBasicMaterial({ color: 0x8d35ff, transparent: true, opacity: 0.92 })
            : (SG.createLanePaintMaterial ? SG.createLanePaintMaterial() : new THREE.MeshBasicMaterial({ color: 0x6a6a6e }));
        for (var lane = -1; lane <= 1; lane += 2) {
            var mark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, SG.TRACK_SEGMENT_LENGTH - 2), markMat);
            mark.position.set(lane * (SG.LANE_WIDTH / 2), 0.01, 0);
            group.add(mark);
        }

        var curbMat = isPvp
            ? new THREE.MeshBasicMaterial({ color: 0xff2ccf })
            : (SG.createCurbMaterial ? SG.createCurbMaterial() : new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
        for (var side = -1; side <= 1; side += 2) {
            var curb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, SG.TRACK_SEGMENT_LENGTH), curbMat);
            curb.position.set(side * (SG.GROUND_WIDTH / 2 + 0.25), 0.1, 0);
            curb.receiveShadow = true;
            curb.userData.pvpNeonEdge = isPvp;
            group.add(curb);
            if (isPvp) {
                var glow = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.04, SG.TRACK_SEGMENT_LENGTH),
                    new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2ccf : 0x9b4dff, transparent: true, opacity: 0.82 })
                );
                glow.position.set(side * (SG.GROUND_WIDTH / 2 + 0.46), 0.24, 0);
                glow.userData.pvpNeonGlow = true;
                group.add(glow);
            }
        }

        group.userData.pvpTrack = isPvp;
        return group;
    };

    SG.spawnInitialTrack = function() {
        for (var z = 0; z > -SG.SPAWN_AHEAD; z -= SG.TRACK_SEGMENT_LENGTH) {
            var seg = SG.createTrackSegment(z);
            SG.scene.add(seg);
            SG.state.trackSegments.push(seg);
        }
    };
})();

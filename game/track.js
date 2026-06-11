// ===== SUBWAY SURFER - Track System =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createTrackSegment = function(zPos) {
        var group = new THREE.Group();
        group.position.z = zPos;

        var groundMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4e });
        var ground = new THREE.Mesh(new THREE.BoxGeometry(SG.GROUND_WIDTH, 0.2, SG.TRACK_SEGMENT_LENGTH), groundMat);
        ground.position.y = -0.1;
        group.add(ground);

        var markMat = new THREE.MeshBasicMaterial({ color: 0x6a6a6e });
        for (var lane = -1; lane <= 1; lane += 2) {
            var mark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, SG.TRACK_SEGMENT_LENGTH - 2), markMat);
            mark.position.set(lane * (SG.LANE_WIDTH / 2), 0.01, 0);
            group.add(mark);
        }

        var curbMat = new THREE.MeshBasicMaterial({ color: 0x5a5a5a });
        for (var side = -1; side <= 1; side += 2) {
            var curb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, SG.TRACK_SEGMENT_LENGTH), curbMat);
            curb.position.set(side * (SG.GROUND_WIDTH / 2 + 0.25), 0.1, 0);
            group.add(curb);
        }

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

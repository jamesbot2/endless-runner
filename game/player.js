// ===== SUBWAY SURFER - Player =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createPlayer = function() {
        SG.player = new THREE.Group();
        SG.player.position.set(0, 0, 0);
        SG.player.rotation.y = Math.PI;

        var bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255aa });
        SG.playerBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), bodyMat);
        SG.playerBody.position.y = 0.7;
        SG.player.add(SG.playerBody);

        var headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), headMat);
        SG.playerHead.position.set(0, 1.15, 0);
        SG.player.add(SG.playerHead);

        var capMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 6), capMat);
        cap.position.set(0, 1.3, 0);
        SG.player.add(cap);

        var armMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat);
        SG.playerLeftArm.position.set(-0.4, 0.85, 0);
        SG.player.add(SG.playerLeftArm);
        SG.playerRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat);
        SG.playerRightArm.position.set(0.4, 0.85, 0);
        SG.player.add(SG.playerRightArm);

        var legMat = new THREE.MeshLambertMaterial({ color: 0x224488 });
        SG.playerLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat);
        SG.playerLeftLeg.position.set(-0.15, 0.2, 0);
        SG.player.add(SG.playerLeftLeg);
        SG.playerRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat);
        SG.playerRightLeg.position.set(0.15, 0.2, 0);
        SG.player.add(SG.playerRightLeg);

        var pack = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.45, 0.2),
            new THREE.MeshLambertMaterial({ color: 0xcc6622 })
        );
        pack.position.set(0, 0.8, -0.3);
        SG.player.add(pack);

        SG.scene.add(SG.player);
        return SG.player;
    };
})();

// ===== SUBWAY SURFER - Scene Setup =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.disposeObject = function(obj) {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        if (obj.children) {
            for (var i = obj.children.length - 1; i >= 0; i--) {
                SG.disposeObject(obj.children[i]);
            }
        }
    };

    SG.initScene = function() {
        SG.scene = new THREE.Scene();
        SG.scene.background = new THREE.Color(0x87CEEB);
        SG.scene.fog = new THREE.Fog(0x87CEEB, 60, 120);

        SG.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        SG.camera.position.set(0, 5, 7);
        SG.camera.lookAt(0, 0, -8);

        SG.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        SG.renderer.setSize(window.innerWidth, window.innerHeight);
        SG.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        document.body.appendChild(SG.renderer.domElement);

        SG.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        SG.scene.add(SG.ambientLight);

        var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.5);
        SG.scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 5);
        SG.scene.add(dirLight);

        SG.clock = new THREE.Clock();

        window.addEventListener('resize', SG.onResize);
    };

    SG.onResize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (SG.camera) {
            SG.camera.aspect = w / h;
            SG.camera.updateProjectionMatrix();
            SG.renderer.setSize(w, h);
        }
    };
})();

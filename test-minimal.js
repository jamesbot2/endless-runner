// Minimal Three.js game test
(function() {
    if (typeof THREE === 'undefined') {
        document.body.innerHTML = '<h1>Three.js not loaded</h1>';
        return;
    }
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 7);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Box
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    var mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    
    var light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
    
    function animate() {
        requestAnimationFrame(animate);
        mesh.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
    
    document.title = 'Three.js Test - Working!';
})();

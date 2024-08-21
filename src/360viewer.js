const THREE = require('three');

let camera, scene, renderer, thumbnail, textureLoader;

let onPointerDownMouseX = 0;
let onPointerDownMouseY = 0;
let lon = 0;
let onPointerDownLon = 0;
let lat = 0;
let onPointerDownLat = 0;
let phi = 0;
let theta = 0;

init();

function init() {
	const container = document.getElementById('viewer');

    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 1, 1100);
	scene = new THREE.Scene();

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(- 1, 1, 1);

    textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('./resources/nothumbnail.png');
    texture.colorSpace = THREE.LinearSRGBColorSpace.
    thumbnail = new THREE.MeshBasicMaterial({ map: texture, reflectivity: 0 });
    const mesh = new THREE.Mesh(geometry, thumbnail);
    mesh.name = "sphere";

    scene.add( mesh );

    renderer = new THREE.WebGLRenderer();
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.offsetWidth, container.offsetHeight);
	renderer.setAnimationLoop(animate);

	container.appendChild(renderer.domElement);

    container.style.touchAction = 'none';
	container.addEventListener('pointerdown', onPointerDown);

	window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
	const container = document.getElementById('viewer');
	camera.aspect = container.offsetWidth / container.offsetHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(container.offsetWidth, container.offsetHeight);
}

function onPointerDown( event ) {
    if ( event.isPrimary === false ) return;

    isUserInteracting = true;

    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

    document.addEventListener( 'pointermove', onPointerMove );
    document.addEventListener( 'pointerup', onPointerUp );
}

function onPointerMove( event ) {
    if ( event.isPrimary === false ) return;

    lon = ( onPointerDownMouseX - event.clientX ) * 0.1 + onPointerDownLon;
    lat = ( event.clientY - onPointerDownMouseY ) * 0.1 + onPointerDownLat;
}

function onPointerUp() {
    if ( event.isPrimary === false ) return;

    isUserInteracting = false;

    document.removeEventListener( 'pointermove', onPointerMove );
    document.removeEventListener( 'pointerup', onPointerUp );
}

function animate() {
	lat = Math.max( - 85, Math.min( 85, lat ) );
	phi = THREE.MathUtils.degToRad( 90 - lat );
	theta = THREE.MathUtils.degToRad( lon );
	const x = 500 * Math.sin( phi ) * Math.cos( theta );
	const y = 500 * Math.cos( phi );
	const z = 500 * Math.sin( phi ) * Math.sin( theta );
	camera.lookAt( x, y, z );
	renderer.render( scene, camera );
}

function updateThumbnail(thumbnailUrl) {
    const object = scene.getObjectByName('sphere'); 
    if (object) {
        object.material.map = textureLoader.load(thumbnailUrl);
        object.material.needsUpdate = true; 
    }
}
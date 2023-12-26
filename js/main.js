import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';


const floorObjectName = ['Object_2', 'Object_3', 'Object_6'];
const poiObjectName = ['Box1', 'Box2', 'Box3', 'Box4', 'Box5', 'Box6', 'Box7', 'Box8'];

let cameraPoints = [
    [-1.6, 1.5, 0.5],
    [-0.67, 1.5, 2.38],
    [2.18, 1.5, 2.38],
    [6.42, 1.5, 2.38],
    [8.82, 1.5, 2.38],
    [8.82, 1.5, 1.56],
    [8.52, 1.5, 0.88],
    [4.7, 1.5, 2.38],
    [2.33, 1.5, 2.38],
    [0, 1.5, 1.65],
];

let lookAtPoints = [
    [0, 3.66, 0],
    [-0.16, 3.14, 0],
    [-0.16, 3.14, 0],
    [-0.16, 3.14, 0],
    [-0.16, 3.14, 0],
    [0, 4.71, 0],
    [0, 0, 0],
    [0.16, 0, 0],
    [0, 0.71, 0],
    [0, 0, 0],
];

let pathPoints = [];

const mouse = new THREE.Vector2();
const model = '../assets/music_gallery.glb';
const clickableObjects = [], floorObject = [], poiObject = [];


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.10, 100 );
const renderer = new THREE.WebGLRenderer({canvas: document.querySelector("#canvas"),});
const raycaster = new THREE.Raycaster();
// let scene,  loader,  camera,  light,  renderer,  raycaster;
let composer, outlinePass, effectFXAA, smaaPass;
let outlinePoiObject;
let camPosPath, camRotatePath;
let roomModel;
let isUserInteracting = false;
let camPosition, camMoveDuration, camRotateDuration;
let mouseDownPointerX, mouseDownPointerY, pointerDownLon, pointerDownLat;
let lat = 0, lon = 0, phi = 0, theta = 0;
let touchStartY;
let mouseDownTime, clickToX, clickToZ;

let circleMarker;

function init() {
    
    
    const loader = new GLTFLoader();
    const light = new THREE.AmbientLight( 0x303030, 100);
    camPosPath = [];
    camRotatePath = [];
    
    camPosition = 0;
    camMoveDuration = 0.6;
    camRotateDuration = 0.6;
    mouseDownPointerX = 0;
    mouseDownPointerY = 0;
    pointerDownLon = 0;
    pointerDownLat = 0;
    touchStartY = 0;

    pathPoints = cameraPoints.map(item => new THREE.Vector3(item[0], item[1], item[2]));

    cameraPoints = cameraPoints.map(item => new THREE.Vector3(item[0], item[1], item[2]));
    cameraPoints.push(cameraPoints[0]);

    lookAtPoints = lookAtPoints.map(item => new THREE.Vector3(item[0], item[1], item[2]));
    lookAtPoints.push(lookAtPoints[0]);

    const circleRadius = 0.8;
    const circleSegments = 32;
    // const circleGeometry = new THREE.CircleGeometry(circleRadius, circleSegments);
    const circleGeometry = new THREE.RingGeometry(0.15, 0.3, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
    });
    circleMarker = new THREE.Mesh(circleGeometry, circleMaterial);
    circleMarker.rotation.x = -1.57; // -90 degree
    scene.add( circleMarker );
    circleMarker.visible = false;
    
    // renderer.setClearColor(0xA3A3A3);
    raycaster.setFromCamera(mouse, camera);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    camera.position.set(-1.6, 1.5, 0.5);
    camera.rotation.set(0, 3.66, 0);
    scene.add( camera );
    
    light.position.set(0,0,0);
    scene.add(light);
    
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    lat = Math.asin(cameraDirection.y);
    lon = Math.atan2(-cameraDirection.z, cameraDirection.x);
    lat = THREE.MathUtils.radToDeg(lat);
    lon = THREE.MathUtils.radToDeg(lon);
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;
    lon = -lon;
    
    outlinePoiObject = [];
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    
    
    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera, outlinePoiObject);
    
    const outputPass = new OutputPass();
    
    
    effectFXAA = new ShaderPass( FXAAShader );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    let params = {
        edgeStrength: 3,
        edgeGlow: 1,
        edgeThickness: 4,
        pulsePeriod: 0,
        usePatternTexture: false
    };
    
    outlinePass.edgeStrength = params.edgeStrength;
    outlinePass.edgeGlow = params.edgeGlow;
    outlinePass.visibleEdgeColor.set(0xffffff);
    outlinePass.hiddenEdgeColor.set(0xffffff);
    
     
    smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() );

    function calculateDistance(position1, position2) {
        const dx = position1.x - position2.x;
        const dy = position1.y - position2.y;
        const dz = position1.z - position2.z;
    
        // Pythagoras
        let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
        // if (distance > 10) {
        //     distance = distance / 1.5;
        // }
    
        return distance;
    }
    
    
    
    // Create camera track
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    let campointCount = 0;
    // create path between position
    for (let i = 0; i < cameraPoints.length - 1; i++) {
        let d = calculateDistance(cameraPoints[i], cameraPoints[i + 1]);
        d = d*2;
        for (let j = 0; j < d; j++) {
            const t = j / d;
            const intermediatePoint = new THREE.Vector3().lerpVectors(cameraPoints[i], cameraPoints[i + 1], t);
            camPosPath.push(intermediatePoint);
            campointCount += 1;
        }
    }
    console.log(camPosPath);
    // create path between rotate
    for (let i = 0; i < lookAtPoints.length - 1; i++) {
        let d = calculateDistance(cameraPoints[i], cameraPoints[i + 1]);
        d = d*2;
        for (let j = 0; j < d; j++) { 
            const t = j / d;
            const intermediatePoint = new THREE.Vector3().lerpVectors(lookAtPoints[i], lookAtPoints[i + 1], t);
            camRotatePath.push(intermediatePoint);
        }
    }

    loader.load(
        model,
        function ( gltf ) {
            roomModel = gltf.scene
            scene.add( roomModel );
            roomModel.traverse(function (object) {
                if (object.isMesh) {
                    clickableObjects.push(object);
    
                    if (poiObjectName.includes(object.name)) {

                        poiObject.push(object);
                        // Add outline to each poiObject
                        const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide });
                        const outlineMesh = new THREE.Mesh(object.geometry.clone(), outlineMaterial);
                        outlineMesh.scale.set(1.05, 1.05, 1.05); // Scale the outline slightly larger
                        outlineMesh.visible = false; // Initially hide the outline
                        object.add(outlineMesh);

                    }else if(floorObjectName.includes(object.name)){
                        floorObject.push(object);
                    }
                }
            });
        },
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            if ((xhr.loaded / xhr.total * 100) == 100) {
                const buttonCover = document.getElementById("coverButton");
                buttonCover.innerHTML = 'ENTER TOUR<i class="fa fa-chevron-right" style="margin-left: 12px;"></i>';
            }
        },
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    );

    composer.addPass(renderPass);
    composer.addPass(outlinePass);
    composer.addPass(outputPass);
    composer.addPass(effectFXAA);
    composer.addPass(smaaPass);
}

init();
animate();

document.addEventListener( 'mousedown', mouseDown, false );
document.addEventListener( 'mousemove', mouseMove, false );
document.addEventListener( 'mouseup', mouseUp, false );
window.addEventListener('wheel', mouseScroll, false);
window.addEventListener('touchstart', touchStart, false);
window.addEventListener('touchend', touchEnd, false);
window.addEventListener( 'resize', windowResize, false );

let coverShow = true;

const buttonCover = document.getElementById("coverButton");
buttonCover.addEventListener("click", function() {
    circleMarker.visible = false;
    const cover = document.getElementById('cover');
    cover.style.transform = 'translateY(100%)';
    coverShow = false;
});

const closeModalButton = document.getElementById("closeModal");
closeModalButton.addEventListener("click", function() {
    const modalElement = document.getElementById("modal");
    toggleElementDisplay(modalElement, 1);
});

function mouseScroll(event) {
    const delta = event.deltaY;
    if (camPosition == camPosPath.length - 1) {
        camPosition = 0;
    }
    if (delta > 0) {
        if (camPosition < camPosPath.length - 1) {
            camPosition++;
            moveCameraToPosition(camPosition);
        }
    } else {
        if (camPosition > 0) {
            camPosition--;
            moveCameraToPosition(camPosition);
        }else if (camPosition == 0) {
            camPosition = camPosPath.length - 1;
            camPosition--;
            moveCameraToPosition(camPosition);
        }
    }
}

function moveCameraToPosition(camPosition) {
    gsap.to(camera.position, {
        x: camPosPath[camPosition].x,
        y: camPosPath[camPosition].y,
        z: camPosPath[camPosition].z,
        duration: camMoveDuration
    });

    rotateCamera(camRotatePath[camPosition].x, camRotatePath[camPosition].y, camRotatePath[camPosition].z);
}

function moveCamera(x, y, z) {
    gsap.to(camera.position, {
        x,
        y,
        z,
        duration: camMoveDuration
    });
}

function rotateCamera(x, y, z) {
    gsap.to(camera.rotation, {
        x,
        y,
        z,
        duration: camRotateDuration,
        onUpdate: function () {
            const updateCameraDirection = camera.getWorldDirection(new THREE.Vector3());

            lat = Math.asin(updateCameraDirection.y);
            lon = Math.atan2(-updateCameraDirection.z, updateCameraDirection.x);

            lat = THREE.MathUtils.radToDeg(lat);
            lon = THREE.MathUtils.radToDeg(lon);

            if (lon < -180) lon += 360;
            if (lon > 180) lon -= 360;

            lon = -lon;
        }
    });
}


let interactingPoi = false;
function updateMousePosition(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function handlePoiClick(intersects, element) {
    if (intersects.length > 0 && !interactingPoi && element.style.display !== "flex") {
        const clickedObject = intersects[0].object;
        const objectName = clickedObject.name;

        if (poiObjectName.includes(objectName)) {
            interactingPoi = true;
            console.log('Object clicked:', objectName);
            var content = parseInt(objectName.substring(3));
            toggleElementDisplay(element, content);
        }
    }
}

function handleFloorClick(intersects) {
    if (intersects.length > 0 && !interactingPoi) {
        const clickedObject = intersects[0].object;
        const objectName = clickedObject.name;
        
        if (floorObjectName.includes(objectName)) {
            const point = intersects[0].point;
            clickToX = point.x;
            clickToZ = point.z;
        }
    }
}

const contentSet = [
    ['FUTURE', 'assets/images/1.jpg'],
    ['Britney Spears', 'assets/images/2.jpg'],
    ['Nick Jonas', 'assets/images/3.jpg'],
    ['Ariana & Nicki', 'assets/images/4.jpg'],
    ['Kanye West', 'assets/images/5.jpg'],
    ['Artist Tags', 'assets/images/6.jpg'],
    ['Collaboration', 'assets/images/7.jpg'],
    ['Rihana', 'assets/images/8.jpg'],
] 

function toggleElementDisplay(element, content) {
    const child = element.querySelector('.modal-content');
    const titleElement = child.querySelector('.modal-title');
    const imgElement = child.querySelector('.modal-img');
    if (element.style.display === "none" || element.style.display === "") {
        titleElement.innerHTML = contentSet[content-1][0];
        imgElement.src = contentSet[content-1][1];
        element.style.display = "flex";
        child.classList.remove('hidden');
        setTimeout(function() {
            child.style.transform = 'translateX(0)';
        }),300
    } else {
        child.style.transform = 'translateX(-100%)';
        child.classList.add('hidden');
        element.style.display = "none";
        interactingPoi = false;
    }
}

function mouseDown(event) {
    isUserInteracting = true;
    mouseDownTime = new Date();

    mouseDownPointerX = event.clientX;
    mouseDownPointerY = event.clientY;

    pointerDownLon = lon;
    pointerDownLat = lat;

    updateMousePosition(event);

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableObjects);
    handleFloorClick(intersects);
    intersects.length = 0;
}



function hideAllOutlines() {
    poiObject.forEach((poiObj) => {
        if (poiObj.children.length > 0 && poiObj.children[0].visible !== undefined) {
            poiObj.children[0].visible = false;
        }
    });
}

function resetCursorAndCircleMarker() {
    document.body.style.cursor = 'auto';
    circleMarker.visible = false;
}

function showOutline(obj) {
    // obj.children[0].visible = true;
    outlinePoiObject = [obj];
    outlinePass.selectedObjects = outlinePoiObject;
}

function handleFloorObject(intersection) {
    outlinePass.selectedObjects = [];
    document.body.style.cursor = 'none';
    const p = intersection.point;
    circleMarker.position.set(p.x, 0.25, p.z);
    circleMarker.visible = true;
}

function handleObjectInteractions() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableObjects);

    hideAllOutlines();
    resetCursorAndCircleMarker();

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const objectName = obj.name;

        if (poiObjectName.includes(objectName) && !interactingPoi) {
            showOutline(obj);
            document.body.style.cursor = 'pointer';
        } else if (floorObjectName.includes(objectName) && !interactingPoi && !coverShow) {
            outlinePass.selectedObjects = [];
            handleFloorObject(intersects[0]);
        }else{
            outlinePass.selectedObjects = [];
        }
    }else{
        outlinePass.selectedObjects = [];
    }
}

let canUpdate = true;
let isCamRotate = false;
function mouseMove( event ) {
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    if ( isUserInteracting && !interactingPoi) {
        isCamRotate = true;
        lon = (mouseDownPointerX - event.clientX) * 0.08 + pointerDownLon;
        lat = (event.clientY - mouseDownPointerY) * 0.08 + pointerDownLat;

        lat = Math.max(-85, Math.min(85, lat));
        lon = ((lon + 180) % 360 + 360) % 360 - 180;

        phi = THREE.MathUtils.degToRad(90 - lat);
        theta = THREE.MathUtils.degToRad(lon);

        camera.target = new THREE.Vector3();
        camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
        camera.target.y = 500 * Math.cos(phi);
        camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

        camera.lookAt(camera.target);
    }else{
        if (canUpdate) {
            handleObjectInteractions();
            canUpdate = false;
            setTimeout(() => {
                canUpdate = true;
            }, 1);
        };
        // checkPoiOverNew();
    }
}

function mouseUp( event ) {
    const mouseUpTime = new Date();
    const timeDiff = mouseUpTime - mouseDownTime;
    
    if (isCamRotate) {
        console.log(camPosition);
    }
    
    isUserInteracting = false;

    if (timeDiff < 200 && clickToX != null && clickToZ != null && circleMarker.visible == true && !coverShow) {
        gsap.to(camera.position, {
            x: clickToX,
            z: clickToZ,
            duration: camMoveDuration
        });
    }

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableObjects);
    const element = document.getElementById("modal");

    if (timeDiff < 200) {
        handlePoiClick(intersects, element);
    }

}

function touchStart(event) {
    touchStartY = event.touches[0].clientY;
}

function touchEnd(event) {
    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    if (deltaY < 0) {
        switch(camPosition) {
            case 0:
                // to 1
                moveCamera(0, 5, 18);
                rotateCamera(0, 0, 0); //degree -> radian
                camPosition = 1;
                break;
            case 1:
                // to 2
                moveCamera(-4.7, 5.6, 2);
                rotateCamera(0, 0.925025, 0); //degree -> radian
                camPosition = 2;
                break;
            case 2:
                // to 3
                moveCamera(2.5, 5, 1.6);
                rotateCamera(0, -1.88, 0); //degree -> radian
                camPosition = 3;
                break;
            case 3:
                // to 0
                moveCamera(0, 5, -24);
                rotateCamera(0, 3.14 ,0); //degree -> radian
                camPosition = 0;
                break;
        }
    } else if (deltaY > 0) {
        switch(camPosition) {
            case 0:
                // to 3
                moveCamera(2.5, 5, 1.6);
                rotateCamera(0, -1.88, 0); //degree -> radian
                camPosition = 3;
                break;
            case 1:
                // to 0
                moveCamera(0, 5, -24);
                rotateCamera(0, 3.14 ,0); //degree -> radian
                camPosition = 0;
                break;
            case 2:
                // to 1
                moveCamera(0, 5, 18);
                rotateCamera(0, 0, 0); //degree -> radian
                camPosition = 1;
                break;
            case 3:
                // to 2
                moveCamera(-4.7, 5.6, 2);
                rotateCamera(0, 0.925025, 0); //degree -> radian
                camPosition = 2;
                break;
        }
    }
}

function windowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}


function animate() {
    requestAnimationFrame( animate );

    // if (outlinePass.selectedObjects.length == 0) {
    //     renderer.render( scene, camera );
    // } else {
    //     composer.render();
    // }
    // renderer.render( scene, camera );
    composer.render();
}



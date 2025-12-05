import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Ammo from "ammojs-typed";
import { ConvexObjectBreaker } from "three/examples/jsm/misc/ConvexObjectBreaker.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

let container, stats;
let camera, controls, scene, renderer;
let textureLoader;
const clock = new THREE.Clock();

const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const ballMaterial = new THREE.MeshPhongMaterial({ color: 0x202020 });

const gravityConstant = 7.8;
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
const margin = 0.05;

const convexBreaker = new ConvexObjectBreaker();


const cupRadiusTop = 0.8;
const cupRadiusBottom = 0.6; 
const cupHeight = 1.2; 
const cupMass = 5; 
const cupSegments = 16; 


const rigidBodies = [];

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
let transformAux1;
let tempBtVec3_1;

const objectsToRemove = [];
let numObjectsToRemove = 0;

const impactPoint = new THREE.Vector3();
const impactNormal = new THREE.Vector3();
let PhysicsAmmo;

for (let i = 0; i < 500; i++) {
  objectsToRemove[i] = null;
}

Ammo().then((AmmoLib) => {
  PhysicsAmmo = AmmoLib;
  init();
});

function init() {
  initGraphics();
  initPhysics();
  createObjects();
  initInput();
}

function initGraphics() {
  container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera.position.set(-14, 8, 16);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.update();

  textureLoader = new THREE.TextureLoader();

  const ambientLight = new THREE.AmbientLight(0xbbbbbb);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-10, 18, 5);
  light.castShadow = true;
  const d = 14;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;

  light.shadow.mapSize.x = 1024;
  light.shadow.mapSize.y = 1024;

  scene.add(light);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.domElement);

  

  window.addEventListener("resize", onWindowResize);
}

function initPhysics() {
  collisionConfiguration = new PhysicsAmmo.btDefaultCollisionConfiguration();
  dispatcher = new PhysicsAmmo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new PhysicsAmmo.btDbvtBroadphase();
  solver = new PhysicsAmmo.btSequentialImpulseConstraintSolver();
  physicsWorld = new PhysicsAmmo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new PhysicsAmmo.btVector3(0, -gravityConstant, 0));

  transformAux1 = new PhysicsAmmo.btTransform();
  tempBtVec3_1 = new PhysicsAmmo.btVector3(0, 0, 0);
}


function createCup(mass, pos, quat, color) {
  const cupGeometry = new THREE.CylinderGeometry(
    cupRadiusTop, 
    cupRadiusBottom, 
    cupHeight,
    cupSegments
  );

  const material = createMaterial(color);

  const object = new THREE.Mesh(cupGeometry, material);
  object.position.copy(pos);
  object.quaternion.copy(quat);


  convexBreaker.prepareBreakableObject(
    object,
    mass,
    new THREE.Vector3(),
    new THREE.Vector3(),
    true
  );
  createDebrisFromBreakableObject(object);
}

function createObjects() {

  pos.set(0, -0.5, 0);
  quat.set(0, 0, 0, 1);
  const ground = createParalellepipedWithPhysics(
    40,
    1,
    40,
    0,
    pos,
    quat,
    new THREE.MeshPhongMaterial({ color: 0xffffff })
  );
  ground.receiveShadow = true;
  textureLoader.load("textures/grid.png", function (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    ground.material.map = texture;
    ground.material.needsUpdate = true;
  });


  const baseColors = [0xfdd835, 0xe53935, 0x1e88e5, 0x43a047];
  const cupSpacing = cupRadiusTop * 2 * 1.05; 

  const totalLevels = 8;
  const initialCups = 8;
  
  for (let level = 1; level <= totalLevels; level++) {
    const numCups = initialCups - (level - 1);
    if (numCups <= 0) break;
    const color = baseColors[(level - 1) % baseColors.length];
    const yOffset = (level - 1) * cupHeight;
    const startX = -((numCups - 1) * cupSpacing) / 2;
    for (let i = 0; i < numCups; i++) {
      pos.set(startX + i * cupSpacing, yOffset + cupHeight / 2, 0);
      quat.set(0, 0, 0, 1);
      createCup(cupMass, pos, quat, color);
    }
  }
}

function createParalellepipedWithPhysics(
  sx,
  sy,
  sz,
  mass,
  pos,
  quat,
  material
) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
    material
  );

  const shape = new PhysicsAmmo.btBoxShape(
    new PhysicsAmmo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);

  createRigidBody(object, shape, mass, pos, quat);

  return object;
}

function createDebrisFromBreakableObject(object) {
  object.castShadow = true;
  object.receiveShadow = true;

  const shape = createConvexHullPhysicsShape(
    object.geometry.attributes.position.array
  );
  shape.setMargin(margin);

  const body = createRigidBody(
    object,
    shape,
    object.userData.mass,
    null,
    null,
    object.userData.velocity,
    object.userData.angularVelocity
  );

  
  const btVecUserData = new PhysicsAmmo.btVector3(0, 0, 0);
  btVecUserData.threeObject = object;
  body.setUserPointer(btVecUserData);
}

function removeDebris(object) {
  scene.remove(object);

  physicsWorld.removeRigidBody(object.userData.physicsBody);
}

function createConvexHullPhysicsShape(coords) {
  const shape = new PhysicsAmmo.btConvexHullShape();

  for (let i = 0, il = coords.length; i < il; i += 3) {
    tempBtVec3_1.setValue(coords[i], coords[i + 1], coords[i + 2]);
    const lastOne = i >= il - 3;
    shape.addPoint(tempBtVec3_1, lastOne);
  }

  return shape;
}

function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
  if (pos) {
    object.position.copy(pos);
  } else {
    pos = object.position;
  }

  if (quat) {
    object.quaternion.copy(quat);
  } else {
    quat = object.quaternion;
  }

  const transform = new PhysicsAmmo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new PhysicsAmmo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(
    new PhysicsAmmo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
  );
  const motionState = new PhysicsAmmo.btDefaultMotionState(transform);

  const localInertia = new PhysicsAmmo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new PhysicsAmmo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    physicsShape,
    localInertia
  );
  const body = new PhysicsAmmo.btRigidBody(rbInfo);

  body.setFriction(0.5);

  if (vel) {
    body.setLinearVelocity(new PhysicsAmmo.btVector3(vel.x, vel.y, vel.z));
  }

  if (angVel) {
    body.setAngularVelocity(
      new PhysicsAmmo.btVector3(angVel.x, angVel.y, angVel.z)
    );
  }

  object.userData.physicsBody = body;
  object.userData.collided = false;

  scene.add(object);

  if (mass > 0) {
    rigidBodies.push(object);


    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);

  return body;
}

function createRandomColor() {
  return Math.floor(Math.random() * (1 << 24));
}

function createMaterial(color) {
  color = color || createRandomColor();
  return new THREE.MeshPhongMaterial({ color: color });
}

function initInput() {
  window.addEventListener("pointerdown", function (event) {
    mouseCoords.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouseCoords, camera);

   
    const ballMass = 35;
    const ballRadius = 0.4;

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius, 14, 10),
      ballMaterial
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
   
    const ballShape = new PhysicsAmmo.btSphereShape(ballRadius);
    ballShape.setMargin(margin);
    pos.copy(raycaster.ray.direction);
    pos.add(raycaster.ray.origin);
    quat.set(0, 0, 0, 1);
    const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);

    pos.copy(raycaster.ray.direction);
    pos.multiplyScalar(24);
    // AMMO -> PhysicsAmmo
    ballBody.setLinearVelocity(new PhysicsAmmo.btVector3(pos.x, pos.y, pos.z));
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  stats.update();
}

function render() {
  const deltaTime = clock.getDelta();

  updatePhysics(deltaTime);

  renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {

  physicsWorld.stepSimulation(deltaTime, 10);

  for (let i = 0, il = rigidBodies.length; i < il; i++) {
    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();

    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

      objThree.userData.collided = false;
    }
  }

  for (let i = 0, il = dispatcher.getNumManifolds(); i < il; i++) {
    const contactManifold = dispatcher.getManifoldByIndexInternal(i);
    const rb0 = PhysicsAmmo.castObject(
      contactManifold.getBody0(),
      PhysicsAmmo.btRigidBody
    );
    const rb1 = PhysicsAmmo.castObject(
      contactManifold.getBody1(),
      PhysicsAmmo.btRigidBody
    );


    const threeObject0 = rb0.getUserPointer()
      ? PhysicsAmmo.castObject(rb0.getUserPointer(), PhysicsAmmo.btVector3)
          .threeObject
      : null;
  
    const threeObject1 = rb1.getUserPointer()
      ? PhysicsAmmo.castObject(rb1.getUserPointer(), PhysicsAmmo.btVector3)
          .threeObject
      : null;

    if (!threeObject0 && !threeObject1) {
      continue;
    }

    const userData0 = threeObject0 ? threeObject0.userData : null;
    const userData1 = threeObject1 ? threeObject1.userData : null;

    const breakable0 = userData0 ? userData0.breakable : false;
    const breakable1 = userData1 ? userData1.breakable : false;

    const collided0 = userData0 ? userData0.collided : false;
    const collided1 = userData1 ? userData1.collided : false;

    if ((!breakable0 && !breakable1) || (collided0 && collided1)) {
      continue;
    }

    let contact = false;
    let maxImpulse = 0;
    for (let j = 0, jl = contactManifold.getNumContacts(); j < jl; j++) {
      const contactPoint = contactManifold.getContactPoint(j);

      if (contactPoint.getDistance() < 0) {
        contact = true;
        const impulse = contactPoint.getAppliedImpulse();

        if (impulse > maxImpulse) {
          maxImpulse = impulse;
          const pos = contactPoint.get_m_positionWorldOnB();
          const normal = contactPoint.get_m_normalWorldOnB();
          impactPoint.set(pos.x(), pos.y(), pos.z());
          impactNormal.set(normal.x(), normal.y(), normal.z());
        }

        break;
      }
    }


    if (!contact) continue;

  

    const fractureImpulse = 250;

    if (breakable0 && !collided0 && maxImpulse > fractureImpulse) {
      const debris = convexBreaker.subdivideByImpact(
        threeObject0,
        impactPoint,
        impactNormal,
        1,
        2
      );

      const numObjects = debris.length;
      for (let j = 0; j < numObjects; j++) {
        const vel = rb0.getLinearVelocity();
        const angVel = rb0.getAngularVelocity();
        const fragment = debris[j];
        fragment.userData.velocity.set(vel.x(), vel.y(), vel.z());
        fragment.userData.angularVelocity.set(
          angVel.x(),
          angVel.y(),
          angVel.z()
        );

        createDebrisFromBreakableObject(fragment);
      }

      objectsToRemove[numObjectsToRemove++] = threeObject0;
      userData0.collided = true;
    }

    if (breakable1 && !collided1 && maxImpulse > fractureImpulse) {
      const debris = convexBreaker.subdivideByImpact(
        threeObject1,
        impactPoint,
        impactNormal,
        1,
        2
      );

      const numObjects = debris.length;
      for (let j = 0; j < numObjects; j++) {
        const vel = rb1.getLinearVelocity();
        const angVel = rb1.getAngularVelocity();
        const fragment = debris[j];
        fragment.userData.velocity.set(vel.x(), vel.y(), vel.z());
        fragment.userData.angularVelocity.set(
          angVel.x(),
          angVel.y(),
          angVel.z()
        );

        createDebrisFromBreakableObject(fragment);
      }

      objectsToRemove[numObjectsToRemove++] = threeObject1;
      userData1.collided = true;
    }
  }

  for (let i = 0; i < numObjectsToRemove; i++) {
    removeDebris(objectsToRemove[i]);
  }

  numObjectsToRemove = 0;
}

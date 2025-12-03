# 🏰 Castillo de Vasos (VaseCastle)

## 📋 Descripción del Proyecto
Sistema interactivo 3D que construye una pirámide de vasos virtuales y permite al usuario destruirla lanzando una bola a gran velocidad. El foco principal es la simulación de fractura dinámica: cuando un vaso recibe un impacto fuerte, se rompe en múltiples fragmentos que continúan su movimiento bajo las leyes de la física y la gravedad.

## 👩‍💻 Autora
**Andrea Santaloz** - [@AndreaSantaloz](https://github.com/AndreaSantaloz)

## 🎮 Controles
- **Clic izquierdo** en cualquier parte de la pantalla: Lanza una bola de cañón desde la cámara hacia el punto donde apuntas
- **Arrastrar con el ratón**: Orbitar alrededor de la escena
- **Rueda del ratón**: Zoom in/out

## 📦 Herramientas Utilizadas
- **Three.js**: Motor 3D para renderizado gráfico
- **Ammo.js**: Motor de física para simulaciones realistas
- **OrbitControls**: Control de cámara interactiva
- **ConvexObjectBreaker**: Sistema de fractura de objetos convexos
- **Stats.js**: Monitor de rendimiento (FPS)

## 🧠 Explicación Detallada del Código

### 📊 Variables Globales

#### Variables de Gráficos (Three.js)
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `container` | `HTMLElement` | Elemento HTML donde se renderiza la escena 3D |
| `camera` | `THREE.PerspectiveCamera` | Cámara perspectiva con FOV de 60°, posición inicial (-14, 8, 16) |
| `scene` | `THREE.Scene` | Contenedor principal de todos los objetos 3D, fondo azul claro (0xbfd1e5) |
| `renderer` | `THREE.WebGLRenderer` | Motor de renderizado WebGL con sombras habilitadas |
| `controls` | `OrbitControls` | Control para orbitar la cámara alrededor del punto (0, 2, 0) |
| `textureLoader` | `THREE.TextureLoader` | Cargador de texturas para materiales |
| `clock` | `THREE.Clock` | Reloj para calcular deltaTime entre frames |
| `mouseCoords` | `THREE.Vector2` | Coordenadas normalizadas del ratón (-1 a 1) |
| `raycaster` | `THREE.Raycaster` | Lanza rayos desde la cámara para detectar interacciones |
| `ballMaterial` | `THREE.MeshPhongMaterial` | Material gris oscuro (0x202020) para las bolas |

#### Variables de Física (Ammo.js)
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `PhysicsAmmo` | Objeto | Instancia principal de la librería Ammo.js |
| `gravityConstant` | `const` | Valor de gravedad en eje Y (-7.8) |
| `collisionConfiguration` | Objeto | Configuración de memoria para detección de colisiones |
| `dispatcher` | Objeto | Gestiona contactos entre cuerpos colisionantes |
| `broadphase` | Objeto | DBVT broadphase para filtrado rápido de colisiones |
| `solver` | Objeto | Resuelve restricciones y colisiones |
| `physicsWorld` | Objeto | Mundo de simulación física principal |
| `margin` | `const` | Margen de colisión para shapes (0.05) |
| `transformAux1` | Objeto | Transform auxiliar para transferir posición/rotación |
| `tempBtVec3_1` | Objeto | Vector temporal de Ammo.js para operaciones |

#### Variables de Vasos y Fractura
| Variable | Tipo | Valor | Descripción |
|----------|------|-------|-------------|
| `convexBreaker` | `ConvexObjectBreaker` | Nueva instancia | Sistema que maneja la subdivisión de objetos |
| `cupRadiusTop` | `const` | 0.8 | Radio superior del vaso (base invertida) |
| `cupRadiusBottom` | `const` | 0.6 | Radio inferior del vaso (boca invertida) |
| `cupHeight` | `const` | 1.2 | Altura de cada vaso |
| `cupMass` | `const` | 5 | Masa física de cada vaso |
| `cupSegments` | `const` | 16 | Segmentos para suavidad del cilindro |
| `rigidBodies` | `Array` | Vacío | Array que almacena todos los objetos físicos movibles |
| `pos` | `THREE.Vector3` | (0,0,0) | Vector para posiciones temporales |
| `quat` | `THREE.Quaternion` | (0,0,0,1) | Cuaternión para rotaciones temporales |
| `objectsToRemove` | `Array` | 500 slots | Array para marcar objetos a eliminar |
| `numObjectsToRemove` | `Number` | 0 | Contador de objetos pendientes de eliminar |
| `impactPoint` | `THREE.Vector3` | (0,0,0) | Punto de impacto para fracturas |
| `impactNormal` | `THREE.Vector3` | (0,0,0) | Normal del impacto para fracturas |

### 🔧 Funciones Principales

#### 1. **Inicialización de Ammo.js y Sistema**
```javascript
Ammo().then((AmmoLib) => {
  PhysicsAmmo = AmmoLib;  // Almacena la librería cargada
  init();                 // Inicia la aplicación
});
```
**Propósito**: Carga asíncrona de Ammo.js y comienza la simulación.

---

#### 2. **`init()` - Función de Inicialización Principal**
```javascript
function init() {
  initGraphics();     // Configura componentes visuales
  initPhysics();      // Configura motor físico
  createObjects();    // Crea suelo y pirámide de vasos
  initInput();        // Configura controles de usuario
}
```
**Propósito**: Orquesta la inicialización completa del sistema.

---

#### 3. **`initGraphics()` - Configuración Gráfica**
```javascript
function initGraphics() {
  // Configura cámara perspectiva
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.2, 2000);
  
  // Crea escena con fondo azul
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);
  
  // Configura renderizador WebGL
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  
  // Configura controles de órbita
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  
  // Configura iluminación
  const ambientLight = new THREE.AmbientLight(0xbbbbbb);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.castShadow = true;
  
  // Añade monitor de estadísticas
  stats = new Stats();
  
  // Configura evento de redimensionado
  window.addEventListener("resize", onWindowResize);
}
```
**Propósito**: Configura todos los componentes visuales de Three.js.

---

#### 4. **`initPhysics()` - Configuración del Motor Físico**
```javascript
function initPhysics() {
  // Crea componentes del motor Bullet/Ammon
  collisionConfiguration = new PhysicsAmmo.btDefaultCollisionConfiguration();
  dispatcher = new PhysicsAmmo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new PhysicsAmmo.btDbvtBroadphase();
  solver = new PhysicsAmmo.btSequentialImpulseConstraintSolver();
  
  // Crea mundo físico con gravedad
  physicsWorld = new PhysicsAmmo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
  physicsWorld.setGravity(new PhysicsAmmo.btVector3(0, -gravityConstant, 0));
  
  // Inicializa objetos auxiliares
  transformAux1 = new PhysicsAmmo.btTransform();
  tempBtVec3_1 = new PhysicsAmmo.btVector3(0, 0, 0);
}
```
**Propósito**: Configura el motor de física Ammo.js con todos sus componentes.

---

#### 5. **`createObjects()` - Creación de Objetos en Escena**
```javascript
function createObjects() {
  // 1. Crea suelo físico
  pos.set(0, -0.5, 0);
  quat.set(0, 0, 0, 1);
  const ground = createParalellepipedWithPhysics(40, 1, 40, 0, pos, quat, material);
  
  // 2. Configura textura de rejilla para suelo
  textureLoader.load("textures/grid.png", function(texture) {
    texture.repeat.set(40, 40);
    ground.material.map = texture;
  });
  
  // 3. Construye pirámide de 8 niveles
  const baseColors = [0xfdd835, 0xe53935, 0x1e88e5, 0x43a047];
  const cupSpacing = cupRadiusTop * 2 * 1.05;
  const totalLevels = 8;
  const initialCups = 8;
  
  for (let level = 1; level <= totalLevels; level++) {
    const numCups = initialCups - (level - 1);
    const color = baseColors[(level - 1) % baseColors.length];
    const yOffset = (level - 1) * cupHeight;
    const startX = -((numCups - 1) * cupSpacing) / 2;
    
    for (let i = 0; i < numCups; i++) {
      pos.set(startX + i * cupSpacing, yOffset + cupHeight/2, 0);
      quat.set(0, 0, 0, 1);
      createCup(cupMass, pos, quat, color);
    }
  }
}
```
**Propósito**: Crea el suelo y la pirámide de vasos con posicionamiento calculado.

**Variables locales**:
- `ground`: Mesh del suelo con física
- `baseColors`: Array de 4 colores hexadecimales para los vasos
- `cupSpacing`: Distancia horizontal entre vasos (radio × 2 × 1.05)
- `totalLevels`: Número total de filas (8)
- `initialCups`: Vasos en la base (8)
- `level`: Nivel actual de la pirámide (1 a 8)
- `numCups`: Vasos en el nivel actual (8 a 1)
- `color`: Color del nivel actual (cíclico)
- `yOffset`: Altura acumulada del nivel
- `startX`: Posición X inicial para centrar la fila

---

#### 6. **`createCup()` - Creación de Vaso Individual**
```javascript
function createCup(mass, pos, quat, color) {
  // Crea geometría cilíndrica (vaso invertido)
  const cupGeometry = new THREE.CylinderGeometry(
    cupRadiusTop,    // Radio superior (base)
    cupRadiusBottom, // Radio inferior (boca)
    cupHeight,       // Altura
    cupSegments      // Segmentos para suavidad
  );
  
  // Crea material con color especificado
  const material = createMaterial(color);
  const object = new THREE.Mesh(cupGeometry, material);
  object.position.copy(pos);
  object.quaternion.copy(quat);
  
  // Prepara el objeto para fractura
  convexBreaker.prepareBreakableObject(
    object,           // Objeto Three.js
    mass,            // Masa física
    new THREE.Vector3(), // Centro de masa
    new THREE.Vector3(), // Velocidad inicial
    true             // Es rompible
  );
  
  // Crea cuerpo físico para el vaso
  createDebrisFromBreakableObject(object);
}
```
**Propósito**: Crea un vaso individual con geometría, material y física preparada para fractura.

**Parámetros**:
- `mass`: Masa física del vaso
- `pos`: Posición THREE.Vector3
- `quat`: Rotación THREE.Quaternion
- `color`: Color hexadecimal del material

---

#### 7. **`createParalellepipedWithPhysics()` - Creación de Prisma con Física**
```javascript
function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  const shape = new PhysicsAmmo.btBoxShape(
    new PhysicsAmmo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(margin);
  
  createRigidBody(object, shape, mass, pos, quat);
  return object;
}
```
**Propósito**: Crea un prisma rectangular con cuerpo físico asociado.

**Parámetros**:
- `sx, sy, sz`: Dimensiones del prisma
- `mass`: Masa física (0 para estático)
- `pos, quat`: Posición y rotación
- `material`: Material Three.js

---

#### 8. **`createDebrisFromBreakableObject()` - Creación de Fragmentos**
```javascript
function createDebrisFromBreakableObject(object) {
  object.castShadow = true;
  object.receiveShadow = true;
  
  // Crea shape de colisión convexa desde la geometría
  const shape = createConvexHullPhysicsShape(object.geometry.attributes.position.array);
  shape.setMargin(margin);
  
  // Crea cuerpo rígido para el fragmento
  const body = createRigidBody(
    object,
    shape,
    object.userData.mass,
    null,
    null,
    object.userData.velocity,
    object.userData.angularVelocity
  );
  
  // Configura puntero al objeto Three.js
  const btVecUserData = new PhysicsAmmo.btVector3(0, 0, 0);
  btVecUserData.threeObject = object;
  body.setUserPointer(btVecUserData);
}
```
**Propósito**: Convierte un objeto Three.js en un cuerpo físico rompible con sombras.

---

#### 9. **`removeDebris()` - Eliminación de Fragmentos**
```javascript
function removeDebris(object) {
  scene.remove(object);  // Elimina de la escena gráfica
  physicsWorld.removeRigidBody(object.userData.physicsBody); // Elimina de la física
}
```
**Propósito**: Elimina completamente un fragmento tanto de gráficos como de física.

---

#### 10. **`createConvexHullPhysicsShape()` - Creación de Shape Convexa**
```javascript
function createConvexHullPhysicsShape(coords) {
  const shape = new PhysicsAmmo.btConvexHullShape();
  
  // Añade cada vértice al shape convexo
  for (let i = 0, il = coords.length; i < il; i += 3) {
    tempBtVec3_1.setValue(coords[i], coords[i + 1], coords[i + 2]);
    const lastOne = i >= il - 3;
    shape.addPoint(tempBtVec3_1, lastOne);
  }
  
  return shape;
}
```
**Propósito**: Crea un shape de colisión convexo desde un array de coordenadas de vértices.

**Parámetros**:
- `coords`: Array de números con posiciones x,y,z de vértices

---

#### 11. **`createRigidBody()` - Conexión Objeto-Física**
```javascript
function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
  // Configura transform inicial
  const transform = new PhysicsAmmo.btTransform();
  transform.setOrigin(new PhysicsAmmo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new PhysicsAmmo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  
  // Crea motion state
  const motionState = new PhysicsAmmo.btDefaultMotionState(transform);
  
  // Calcula inercia local
  const localInertia = new PhysicsAmmo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);
  
  // Crea cuerpo rígido
  const rbInfo = new PhysicsAmmo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  const body = new PhysicsAmmo.btRigidBody(rbInfo);
  
  // Configura fricción
  body.setFriction(0.5);
  
  // Aplica velocidades iniciales si se especifican
  if (vel) body.setLinearVelocity(new PhysicsAmmo.btVector3(vel.x, vel.y, vel.z));
  if (angVel) body.setAngularVelocity(new PhysicsAmmo.btVector3(angVel.x, angVel.y, angVel.z));
  
  // Almacena referencia cruzada
  object.userData.physicsBody = body;
  object.userData.collided = false;
  
  // Añade a la escena y arrays
  scene.add(object);
  if (mass > 0) rigidBodies.push(object);
  
  // Añade al mundo físico
  physicsWorld.addRigidBody(body);
  
  return body;
}
```
**Propósito**: Crea la conexión bidireccional entre un objeto Three.js y un cuerpo físico Ammo.js.

**Parámetros**:
- `object`: Mesh Three.js
- `physicsShape`: Shape de colisión Ammo.js
- `mass`: Masa física
- `pos, quat`: Posición y rotación inicial
- `vel, angVel`: Velocidades lineal y angular iniciales

---

#### 12. **`createMaterial()` - Creación de Material con Color**
```javascript
function createMaterial(color) {
  color = color || createRandomColor();
  return new THREE.MeshPhongMaterial({ color: color });
}
```
**Propósito**: Crea material Phong con color especificado o aleatorio.

**Parámetros**:
- `color`: Color hexadecimal (opcional)

---

#### 13. **`createRandomColor()` - Generación de Color Aleatorio**
```javascript
function createRandomColor() {
  return Math.floor(Math.random() * (1 << 24));
}
```
**Propósito**: Genera un color hexadecimal aleatorio de 24 bits.

---

#### 14. **`initInput()` - Configuración de Controles**
```javascript
function initInput() {
  window.addEventListener("pointerdown", function(event) {
    // Convierte coordenadas de pantalla a normalizadas (-1 a 1)
    mouseCoords.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Lanza rayo desde la cámara
    raycaster.setFromCamera(mouseCoords, camera);
    
    // Configura parámetros de la bola
    const ballMass = 35;
    const ballRadius = 0.4;
    
    // Crea mesh de la bola
    const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 14, 10), ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    
    // Crea shape físico esférico
    const ballShape = new PhysicsAmmo.btSphereShape(ballRadius);
    ballShape.setMargin(margin);
    
    // Posiciona bola delante de la cámara
    pos.copy(raycaster.ray.direction);
    pos.add(raycaster.ray.origin);
    quat.set(0, 0, 0, 1);
    
    // Crea cuerpo rígido
    const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
    
    // Aplica velocidad en dirección del rayo
    pos.copy(raycaster.ray.direction);
    pos.multiplyScalar(24);
    ballBody.setLinearVelocity(new PhysicsAmmo.btVector3(pos.x, pos.y, pos.z));
  });
}
```
**Propósito**: Configura el evento de clic para lanzar bolas de cañón.

**Variables locales**:
- `event`: Objeto de evento pointerdown
- `ballMass`: Masa de la bola (35)
- `ballRadius`: Radio de la bola (0.4)
- `ball`: Mesh esférico Three.js
- `ballShape`: Shape esférico Ammo.js
- `ballBody`: Cuerpo rígido de la bola

---

#### 15. **`onWindowResize()` - Manejo de Redimensionado**
```javascript
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```
**Propósito**: Ajusta cámara y renderizador al cambiar tamaño de ventana.

---

#### 16. **`animate()` - Bucle de Animación Principal**
```javascript
function animate() {
  render();     // Renderiza la escena
  stats.update(); // Actualiza estadísticas
}
```
**Propósito**: Función llamada en cada frame por requestAnimationFrame.

---

#### 17. **`render()` - Renderizado de la Escena**
```javascript
function render() {
  const deltaTime = clock.getDelta(); // Obtiene tiempo desde último frame
  updatePhysics(deltaTime);          // Actualiza simulación física
  renderer.render(scene, camera);    // Dibuja la escena
}
```
**Propósito**: Coordina la actualización física y el renderizado gráfico.

**Variables locales**:
- `deltaTime`: Tiempo transcurrido en segundos desde el último frame

---

#### 18. **`updatePhysics()` - Actualización de Simulación Física**
```javascript
function updatePhysics(deltaTime) {
  // 1. Avanza simulación física
  physicsWorld.stepSimulation(deltaTime, 10);
  
  // 2. Sincroniza objetos Three.js con cuerpos físicos
  for (let i = 0, il = rigidBodies.length; i < il; i++) {
    const objThree = rigidBodies[i];
    const objPhys = objThree.userData.physicsBody;
    const ms = objPhys.getMotionState();
    
    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      
      // Actualiza posición y rotación
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      
      objThree.userData.collided = false;
    }
  }
  
  // 3. Detecta y procesa colisiones para fractura
  for (let i = 0, il = dispatcher.getNumManifolds(); i < il; i++) {
    const contactManifold = dispatcher.getManifoldByIndexInternal(i);
    
    // Obtiene cuerpos en colisión
    const rb0 = PhysicsAmmo.castObject(contactManifold.getBody0(), PhysicsAmmo.btRigidBody);
    const rb1 = PhysicsAmmo.castObject(contactManifold.getBody1(), PhysicsAmmo.btRigidBody);
    
    // Obtiene objetos Three.js asociados
    const threeObject0 = rb0.getUserPointer() ? 
      PhysicsAmmo.castObject(rb0.getUserPointer(), PhysicsAmmo.btVector3).threeObject : null;
    const threeObject1 = rb1.getUserPointer() ? 
      PhysicsAmmo.castObject(rb1.getUserPointer(), PhysicsAmmo.btVector3).threeObject : null;
    
    // Procesa fractura si es necesario
    if (threeObject0?.userData?.breakable || threeObject1?.userData?.breakable) {
      // Lógica de fractura aquí
    }
  }
}
```
**Propósito**: Actualiza la simulación física y sincroniza con los objetos gráficos.

**Variables locales**:
- `objThree`: Referencia al objeto Three.js
- `objPhys`: Referencia al cuerpo físico Ammo.js
- `ms`: Motion state del cuerpo
- `contactManifold`: Información de colisión entre dos cuerpos
- `rb0, rb1`: Cuerpos rígidos en colisión
- `threeObject0, threeObject1`: Objetos Three.js asociados



## Demo

---![AndreaSantanaLopez](https://github.com/user-attachments/assets/cccbd1c5-f6fd-4e19-b66e-f89fcbe41df8)
## 📞 Contacto
**Andrea Santaloz**  
GitHub: [@AndreaSantaloz](https://github.com/AndreaSantaloz)  
Proyecto: Castillo de Vasos (VaseCastle)

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

interface Puzzle {
    id: number;
    object: THREE.Mesh;
    hint: string;
    solved: boolean;
    key?: THREE.Mesh;
    requiredKeyId?: number;
}

class GrapplingHand {
    private hand: THREE.Group;
    private rope: THREE.Line;
    private isGrappling: boolean = false;
    private grapplePoint: THREE.Vector3 | null = null;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private ropeLength: number = 0;
    private handMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    private game: Game;
    private projectiles: THREE.Mesh[] = [];
    private readonly PROJECTILE_SPEED = 30;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, game: Game, isLeft: boolean) {
        this.scene = scene;
        this.camera = camera;
        this.game = game;
        
        // Create hand model with more visible design
        this.hand = new THREE.Group();
        
        // Main hand part
        const handGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
        const handMaterial = new THREE.MeshStandardMaterial({ 
            color: isLeft ? 0x00ff00 : 0x0000ff,
            metalness: 0.7,
            roughness: 0.3
        });
        this.handMesh = new THREE.Mesh(handGeometry, handMaterial);
        
        // Add fingers
        const fingerGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.15);
        const fingerMaterial = new THREE.MeshStandardMaterial({ 
            color: isLeft ? 0x00cc00 : 0x0000cc,
            metalness: 0.7,
            roughness: 0.3
        });
        
        // Add 3 fingers
        for (let i = 0; i < 3; i++) {
            const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
            finger.position.set(
                (i - 1) * 0.06,
                0.1,
                0.2
            );
            this.handMesh.add(finger);
        }

        this.hand.add(this.handMesh);

        // Create rope with thicker, more visible material
        const ropeGeometry = new THREE.BufferGeometry();
        const ropeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 3
        });
        this.rope = new THREE.Line(ropeGeometry, ropeMaterial);
        this.scene.add(this.rope);
        
        // Position hand relative to camera
        const offset = isLeft ? -0.7 : 0.7;
        this.hand.position.set(offset, -0.4, -1);
        this.camera.add(this.hand);
    }

    shoot(raycaster: THREE.Raycaster): void {
        if (this.isGrappling) return;

        const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const projectileMaterial = new THREE.MeshStandardMaterial({
            color: (this.handMesh.material as THREE.MeshStandardMaterial).color,
            emissive: (this.handMesh.material as THREE.MeshStandardMaterial).color,
            emissiveIntensity: 0.5
        });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        const handWorldPos = new THREE.Vector3();
        this.hand.getWorldPosition(handWorldPos);
        projectile.position.copy(handWorldPos);
        
        const direction = raycaster.ray.direction.clone();
        projectile.userData.velocity = direction.multiplyScalar(this.game.projectileSpeed);
        projectile.userData.timeAlive = 0;
        
        this.scene.add(projectile);
        this.projectiles.push(projectile);

        if (this.game.checkRatHit(raycaster)) {
            this.createHitEffect(raycaster.ray.direction);
        }
    }

    private createHitEffect(direction: THREE.Vector3): void {
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: (this.handMesh.material as THREE.MeshStandardMaterial).color,
                size: 0.05,
                transparent: true,
                opacity: 0.8
            })
        );

        const positions = [];
        for (let i = 0; i < 20; i++) {
            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            const pos = direction.clone().add(spread);
            positions.push(pos.x, pos.y, pos.z);
        }

        particles.geometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(positions, 3)
        );
        this.scene.add(particles);

        setTimeout(() => this.scene.remove(particles), 500);
    }

    release(): void {
        if (this.isGrappling) {
            // Add release momentum
            const handWorldPos = new THREE.Vector3();
            this.hand.getWorldPosition(handWorldPos);
            const releaseDir = new THREE.Vector3().subVectors(this.game.getVelocity(), handWorldPos).normalize();
            this.game.addForce(releaseDir.multiplyScalar(30));
        }
        
        this.isGrappling = false;
        this.grapplePoint = null;
        this.updateRope();
    }

    private updateRope(): void {
        if (this.isGrappling && this.grapplePoint) {
            const handWorldPos = new THREE.Vector3();
            this.hand.getWorldPosition(handWorldPos);
            
            // Update rope visualization
            const points = [handWorldPos, this.grapplePoint];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            this.rope.geometry.dispose();
            this.rope.geometry = geometry;

            // Animate hand grip
            this.handMesh.rotation.x = Math.sin(Date.now() * 0.01) * 0.2;
        } else {
            const emptyGeometry = new THREE.BufferGeometry().setFromPoints([]);
            this.rope.geometry.dispose();
            this.rope.geometry = emptyGeometry;
            this.handMesh.rotation.x = 0;
        }
    }

    update(): void {
        if (this.isGrappling && this.grapplePoint) {
            const handWorldPos = new THREE.Vector3();
            this.hand.getWorldPosition(handWorldPos);
            
            // Calculate swing force
            const toGrapple = new THREE.Vector3().subVectors(this.grapplePoint, handWorldPos);
            const distance = toGrapple.length();
            
            // Apply rope constraint
            if (distance > this.ropeLength) {
                const correction = toGrapple.normalize().multiplyScalar(distance - this.ropeLength);
                this.game.applyRopeConstraint(correction);
            }
            
            // Add swing force
            const swingForce = new THREE.Vector3().crossVectors(toGrapple.normalize(), new THREE.Vector3(0, 1, 0));
            this.game.addForce(swingForce.multiplyScalar(2));
            
            this.updateRope();
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.position.add(projectile.userData.velocity.clone().multiplyScalar(0.016));
            projectile.userData.timeAlive += 0.016;

            // Remove projectile after 1 second or if it hits something
            if (projectile.userData.timeAlive > 1) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
            }

            // Check for hits along projectile path
            const raycaster = new THREE.Raycaster(
                projectile.position,
                projectile.userData.velocity.clone().normalize(),
                0,
                projectile.userData.velocity.length() * 0.016
            );
            if (this.game.checkRatHit(raycaster)) {
                this.createHitEffect(projectile.userData.velocity.normalize());
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }
}

class PuzzleArrow {
    private arrow: THREE.Group;
    private light: THREE.PointLight;
    private targetObject: THREE.Object3D;
    private baseY: number;

    constructor(scene: THREE.Scene, targetObject: THREE.Object3D) {
        this.targetObject = targetObject;
        this.baseY = targetObject.position.y + 2;

        // Create arrow geometry
        const arrowBody = new THREE.ConeGeometry(0.2, 1, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });

        this.arrow = new THREE.Group();
        const arrowMesh = new THREE.Mesh(arrowBody, arrowMaterial);
        arrowMesh.rotation.x = Math.PI; // Point downward
        this.arrow.add(arrowMesh);

        // Add point light
        this.light = new THREE.PointLight(0xffff00, 1, 3);
        this.arrow.add(this.light);

        scene.add(this.arrow);
    }

    update() {
        // Hover animation
        const hoverOffset = Math.sin(Date.now() * 0.003) * 0.3;
        this.arrow.position.set(
            this.targetObject.position.x,
            this.baseY + hoverOffset,
            this.targetObject.position.z
        );
        
        // Rotate animation
        this.arrow.rotation.y += 0.02;
    }

    remove(scene: THREE.Scene) {
        scene.remove(this.arrow);
        this.light.dispose();
    }
}

class Rat {
    private rat: THREE.Group;
    private scene: THREE.Scene;
    private target: THREE.PerspectiveCamera;
    private velocity: THREE.Vector3;
    private _isDead: boolean = false;
    private runCycle: number = 0;
    private health: number;
    private bloodParticles: THREE.Points[] = [];
    private isBoss: boolean;
    private maxHealth: number;
    private scale: number;

    constructor(scene: THREE.Scene, target: THREE.PerspectiveCamera, position: THREE.Vector3, isBoss: boolean = false) {
        this.scene = scene;
        this.target = target;
        this.velocity = new THREE.Vector3();
        this.isBoss = isBoss;
        this.maxHealth = isBoss ? 10 : 2; // Boss has more health
        this.health = this.maxHealth;
        this.scale = isBoss ? 2.5 : 1; // Boss is bigger

        // Create rat model
        this.rat = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 * this.scale, 0.2 * this.scale, 0.5 * this.scale),
            new THREE.MeshStandardMaterial({ 
                color: isBoss ? 0x8B0000 : 0x505050,
                emissive: isBoss ? 0x8B0000 : 0x000000,
                emissiveIntensity: isBoss ? 0.5 : 0
            })
        );
        
        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x505050 })
        );
        head.position.z = 0.3;
        
        // Tail
        const tail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x505050 })
        );
        tail.rotation.x = Math.PI / 2;
        tail.position.z = -0.3;
        
        // Legs
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x505050 })
            );
            leg.position.y = -0.1;
            leg.position.x = (i < 2 ? 0.1 : -0.1);
            leg.position.z = (i % 2 === 0 ? 0.1 : -0.1);
            this.rat.add(leg);
        }

        // Eyes (red)
        for (let i = 0; i < 2; i++) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.02),
                new THREE.MeshStandardMaterial({ 
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 0.5
                })
            );
            eye.position.set(0.06 * (i === 0 ? 1 : -1), 0, 0.35);
            head.add(eye);
        }

        this.rat.add(body, head, tail);
        this.rat.position.copy(position);
        this.scene.add(this.rat);

        // Add glow effect for boss
        if (isBoss) {
            const glowLight = new THREE.PointLight(0xff0000, 1, 3);
            this.rat.add(glowLight);
        }
    }

    update(delta: number): boolean {
        if (this._isDead) {
            // Update blood particles
            this.bloodParticles.forEach((particles, index) => {
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] -= 0.1; // Fall down
                }
                particles.geometry.attributes.position.needsUpdate = true;

                // Remove particles after they fall
                if (positions[1] < -2) {
                    this.scene.remove(particles);
                    this.bloodParticles.splice(index, 1);
                }
            });

            return this.bloodParticles.length === 0; // Return true when all particles are gone
        }

        // Boss-specific movement
        if (this.isBoss) {
            // More aggressive movement towards player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.target.position, this.rat.position)
                .normalize();

            // Faster and more direct movement for boss
            this.velocity.x += (directionToPlayer.x * 0.8 - this.velocity.x) * 0.15;
            this.velocity.z += (directionToPlayer.z * 0.8 - this.velocity.z) * 0.15;

            // Occasional charge attack
            if (Math.random() < 0.02) {
                this.velocity.multiplyScalar(2);
            }
        } else {
            // Movement
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.target.position, this.rat.position)
                .normalize();

            // Update velocity with some randomness
            this.velocity.x += (directionToPlayer.x * 0.5 + (Math.random() - 0.5) * 0.2 - this.velocity.x) * 0.1;
            this.velocity.z += (directionToPlayer.z * 0.5 + (Math.random() - 0.5) * 0.2 - this.velocity.z) * 0.1;
        }

        // Apply velocity
        this.rat.position.x += this.velocity.x * delta * 2;
        this.rat.position.z += this.velocity.z * delta * 2;

        // Running animation
        this.runCycle += delta * 10;
        this.rat.rotation.x = Math.sin(this.runCycle) * 0.2;
        this.rat.children.forEach((child, index) => {
            if (index > 2) { // Legs
                child.rotation.x = Math.sin(this.runCycle + (index % 2) * Math.PI) * 0.5;
            }
        });

        // Look at player
        this.rat.lookAt(this.target.position);

        return false;
    }

    takeDamage(position: THREE.Vector3): void {
        this.health--;
        this.createBloodEffect(position);
        
        if (this.health <= 0) {
            this.die();
        } else if (this.isBoss) {
            // Boss rage effect when damaged
            this.rat.scale.multiplyScalar(1.1);
            setTimeout(() => this.rat.scale.multiplyScalar(1/1.1), 200);
        }
    }

    private createBloodEffect(position: THREE.Vector3): void {
        const particleCount = 20;
        const particles = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            particles[i] = position.x + (Math.random() - 0.5) * 0.3;
            particles[i + 1] = position.y + (Math.random() - 0.5) * 0.3;
            particles[i + 2] = position.z + (Math.random() - 0.5) * 0.3;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));

        const material = new THREE.PointsMaterial({
            color: 0xff0000,
            size: 0.05,
            transparent: true,
            opacity: 0.8
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.bloodParticles.push(points);
    }

    private die(): void {
        this._isDead = true;
        this.rat.rotation.z = Math.PI / 2;
        
        // More blood effects for boss
        const effectCount = this.isBoss ? 9 : 3;
        for (let i = 0; i < effectCount; i++) {
            this.createBloodEffect(this.rat.position);
        }

        setTimeout(() => {
            this.scene.remove(this.rat);
        }, this.isBoss ? 3000 : 2000);
    }

    getPosition(): THREE.Vector3 {
        return this.rat.position;
    }

    isDeadAndRemovable(): boolean {
        return this._isDead && this.bloodParticles.length === 0;
    }

    isDead(): boolean {
        return this._isDead;
    }

    getHealthPercent(): number {
        return this.health / this.maxHealth;
    }
}

// Type definitions
interface WeaponItem {
    name: string;
    damage: number;
    speed: number;
    unlockLevel: number;
    cost: number;
    owned: boolean;
}

interface ArmorItem {
    name: string;
    defense: number;
    unlockLevel: number;
    cost: number;
    owned: boolean;
}

interface HealthItem {
    name: string;
    heal: number;
    cost: number;
    quantity: number;
}

interface ShopItem {
    id: string;
    type: 'weapon' | 'armor' | 'health';
    disabled: boolean;
    name: string;
    cost: number;
    damage?: number;
    speed?: number;
    defense?: number;
    heal?: number;
    unlockLevel?: number;
    owned?: boolean;
    quantity?: number;
}

class Game {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: PointerLockControls;
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private velocity: THREE.Vector3 = new THREE.Vector3();
    private acceleration: THREE.Vector3 = new THREE.Vector3();
    private direction: THREE.Vector3 = new THREE.Vector3();
    private leftHand!: GrapplingHand;
    private rightHand!: GrapplingHand;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private gravity: number = 0.8;
    private jumpForce: number = 15;
    private isGrounded: boolean = false;
    private canJump: boolean = true;
    private readonly WORLD_SIZE = 50; // Size of the playable area
    private readonly MOVEMENT_SPEED = 8;
    private readonly RUNNING_SPEED = 12;
    private readonly CAMERA_BOB_SPEED = 8;
    private readonly CAMERA_BOB_AMOUNT = 0.08;
    private timeRemaining: number = 300; // 5 minutes in seconds
    private gameStarted: boolean = false;
    private puzzles: Puzzle[] = [];
    private currentPuzzleId: number = 1;
    private monster: THREE.Group | null = null;
    private monsterActive: boolean = false;
    private gameOver: boolean = false;
    private life: number = 100;
    private currentItem: string | null = null;
    private assetsLoaded: number = 0;
    private totalAssets: number = 10; // Adjust based on actual asset count
    private timerInterval: number | null = null;
    private isPaused: boolean = false;
    private bobTime: number = 0;
    private isRunning: boolean = false;
    private canInteract: boolean = false;
    private interactableObject: THREE.Object3D | null = null;
    private keyBindings: { [key: string]: string } = {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        jump: 'Space',
        run: 'ShiftLeft',
        interact: 'KeyE',
        rightHand: 'KeyR',
        store: 'KeyG'  // Add store key binding
    };
    private settings: {
        sensitivity: number;
        volume: number;
        showFps: boolean;
    } = {
        sensitivity: 5,
        volume: 100,
        showFps: false
    };
    private listeningForKey: string | null = null;
    private lastFrameTime: number = 0;
    private readonly WALL_HEIGHT = 20;
    private readonly GRAVITY = 30;
    private readonly GRAPPLE_SPEED = 20;
    private currentSwitchIndex: number = 0;
    private currentArrow: PuzzleArrow | null = null;
    private rats: Rat[] = [];
    private lastRatSpawn: number = 0;
    private readonly RAT_SPAWN_INTERVAL = 5000; // 5 seconds
    private minimap!: THREE.WebGLRenderer;
    private minimapCamera!: THREE.OrthographicCamera;
    private minimapScene!: THREE.Scene;
    private minimapObjects: { [key: string]: THREE.Mesh } = {};
    private damageOverlay!: HTMLDivElement;
    private lastBobTime: number = 0;
    private footstepTime: number = 0;
    private verticalBob: number = 0;
    private lateralBob: number = 0;
    private damageDirection: THREE.Vector3 = new THREE.Vector3();
    private score: number = 0;
    private ratsKilled: number = 0;
    private bossRatSpawnThreshold: number = 10; // Spawn boss every 10 kills
    private isBossActive: boolean = false;
    private bossRat: Rat | null = null;
    private level: number = 1;
    private coins: number = 0;
    private xp: number = 0;
    private xpToNextLevel: number = 100;
    public projectileDamage: number = 1;
    public projectileSpeed: number = 30;
    private minimapRadius: number = 30;
    // Add new properties
    private puzzleActive: boolean = false;
    private puzzlePieces: number[] = [];
    private puzzleSize: number = 3; // 3x3 puzzle
    private puzzleContainer: HTMLDivElement | null = null;
    private currentPuzzleLevel: number = 1;
    private puzzleImages: string[] = [
        'https://picsum.photos/300/300?random=1',
        'https://picsum.photos/300/300?random=2',
        'https://picsum.photos/300/300?random=3'
    ];
    private puzzleWall: THREE.Mesh | null = null;
    private puzzleUI: THREE.Group | null = null;
    private puzzleUIActive: boolean = false;

    // Weapon system
    private weapons: { [key: string]: WeaponItem } = {
        basic: { name: 'Basic Hand', damage: 1, speed: 30, unlockLevel: 1, cost: 0, owned: true },
        plasma: { name: 'Plasma Hand', damage: 2, speed: 35, unlockLevel: 2, cost: 200, owned: false },
        laser: { name: 'Laser Hand', damage: 3, speed: 40, unlockLevel: 3, cost: 400, owned: false },
        quantum: { name: 'Quantum Hand', damage: 4, speed: 45, unlockLevel: 5, cost: 800, owned: false },
        ultimate: { name: 'Ultimate Hand', damage: 5, speed: 50, unlockLevel: 8, cost: 1500, owned: false }
    };

    // Armor system
    private armor: { [key: string]: ArmorItem } = {
        none: { name: 'No Armor', defense: 0, unlockLevel: 1, cost: 0, owned: true },
        light: { name: 'Light Armor', defense: 10, unlockLevel: 2, cost: 150, owned: false },
        medium: { name: 'Medium Armor', defense: 20, unlockLevel: 4, cost: 300, owned: false },
        heavy: { name: 'Heavy Armor', defense: 30, unlockLevel: 6, cost: 600, owned: false },
        ultimate: { name: 'Ultimate Armor', defense: 40, unlockLevel: 10, cost: 1000, owned: false }
    };

    // Health items
    private healthItems: { [key: string]: HealthItem } = {
        smallPotion: { name: 'Small Health Potion', heal: 20, cost: 50, quantity: 0 },
        mediumPotion: { name: 'Medium Health Potion', heal: 40, cost: 100, quantity: 0 },
        largePotion: { name: 'Large Health Potion', heal: 60, cost: 150, quantity: 0 },
        fullPotion: { name: 'Full Health Potion', heal: 100, cost: 250, quantity: 0 }
    };

    private equippedWeapon = 'basic';
    private equippedArmor = 'none';
    private defense: number = 0;

    constructor() {
        this.showLoadingScreen();
        this.init().then(() => {
            this.animate();
            this.updateLoadingProgress(100);
            this.setupMenuSystem();
            this.setupMinimap();
            this.setupDamageOverlay();
        });
    }

    private async init(): Promise<void> {
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 2;  // Set initial camera height
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        this.updateLoadingProgress(20);

        // Controls setup
        this.controls = new PointerLockControls(this.camera, document.body);
        this.setupControls();
        this.updateLoadingProgress(40);

        // Create environment
        await this.createRoom();
        this.updateLoadingProgress(60);

        // Add lighting
        this.addLighting();
        this.updateLoadingProgress(80);

        // Create puzzles and game elements
        this.createPuzzles();
        this.updateLoadingProgress(90);

        // Initialize hands
        this.leftHand = new GrapplingHand(this.scene, this.camera, this, true);
        this.rightHand = new GrapplingHand(this.scene, this.camera, this, false);
        this.updateLoadingProgress(95);

        // Setup start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }

        window.addEventListener('resize', () => this.onWindowResize());
    }

    getVelocity(): THREE.Vector3 {
        return this.velocity.clone();
    }

    addForce(force: THREE.Vector3): void {
        this.acceleration.add(force);
    }

    applyRopeConstraint(correction: THREE.Vector3): void {
        this.camera.position.add(correction);
        this.velocity.multiplyScalar(0.8); // Dampen velocity when rope is stretched
    }

    private setupControls(): void {
        document.addEventListener('click', () => {
            this.controls.lock();
        });

        document.addEventListener('keydown', (event) => {
            if (!this.isPaused) {
                switch (event.code) {
                    case this.keyBindings.forward:
                    case 'ArrowUp':
                        this.moveForward = true;
                        break;
                    case this.keyBindings.backward:
                    case 'ArrowDown':
                        this.moveBackward = true;
                        break;
                    case this.keyBindings.left:
                    case 'ArrowLeft':
                        this.moveLeft = true;
                        break;
                    case this.keyBindings.right:
                    case 'ArrowRight':
                        this.moveRight = true;
                        break;
                    case this.keyBindings.run:
                        this.isRunning = true;
                        break;
                    case this.keyBindings.interact:
                        if (this.canInteract && this.interactableObject) {
                            this.handleInteraction(this.interactableObject);
                        }
                        break;
                    case this.keyBindings.jump:
                        if (this.canJump && this.isGrounded) {
                            this.velocity.y = this.jumpForce;
                            this.isGrounded = false;
                            this.canJump = false;
                            setTimeout(() => this.canJump = true, 500);
                        }
                        break;
                    case this.keyBindings.store:
                        this.toggleStore();
                        break;
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case this.keyBindings.forward:
                case 'ArrowUp':
                    this.moveForward = false;
                    break;
                case this.keyBindings.backward:
                case 'ArrowDown':
                    this.moveBackward = false;
                    break;
                case this.keyBindings.left:
                case 'ArrowLeft':
                    this.moveLeft = false;
                    break;
                case this.keyBindings.right:
                case 'ArrowRight':
                    this.moveRight = false;
                    break;
                case this.keyBindings.run:
                    this.isRunning = false;
                    break;
            }
        });

        document.addEventListener('mousedown', (event) => {
            if (!this.controls.isLocked) return;
            
            this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
            
            if (event.button === 0) {
                this.leftHand.shoot(this.raycaster);
            } else if (event.button === 2) {
                event.preventDefault();
                this.rightHand.shoot(this.raycaster);
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (!this.controls.isLocked) return;
            
            if (event.button === 0) {
                this.leftHand.release();
            } else if (event.button === 2) {
                this.rightHand.release();
            }
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private createRoom(): void {
        // Create ground with more interesting texture
        const groundGeometry = new THREE.PlaneGeometry(this.WORLD_SIZE * 2, this.WORLD_SIZE * 2, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2,
            wireframe: true
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add puzzle wall
        const wallGeometry = new THREE.BoxGeometry(4, 4, 0.2);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.3
        });
        this.puzzleWall = new THREE.Mesh(wallGeometry, wallMaterial);
        this.puzzleWall.position.set(0, 3, -this.WORLD_SIZE/2 + 1);
        this.puzzleWall.userData.interactive = true;
        this.puzzleWall.userData.isPuzzleWall = true;
        this.puzzleWall.userData.interactionText = "Solve Puzzle";
        this.scene.add(this.puzzleWall);

        // Create random room elements
        for (let i = 0; i < 15; i++) {
            const size = 1 + Math.random() * 2;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff,
                roughness: 0.7,
                metalness: 0.3
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
                (Math.random() - 0.5) * (this.WORLD_SIZE - 2),
                size / 2 + Math.random() * 10,
                (Math.random() - 0.5) * (this.WORLD_SIZE - 2)
            );
            cube.castShadow = true;
            cube.userData.grappable = true;
            this.scene.add(cube);
        }

        // Add pillars
        for (let i = 0; i < 8; i++) {
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 12, 8),
                new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    roughness: 0.7,
                    metalness: 0.3
                })
            );
            pillar.position.set(
                (Math.random() - 0.5) * (this.WORLD_SIZE - 2),
                6,
                (Math.random() - 0.5) * (this.WORLD_SIZE - 2)
            );
            pillar.castShadow = true;
            pillar.userData.grappable = true;
            this.scene.add(pillar);
        }

        // Add floating platforms
        for (let i = 0; i < 10; i++) {
            const platform = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.5, 4),
                new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    roughness: 0.7,
                    metalness: 0.3
                })
            );
            platform.position.set(
                (Math.random() - 0.5) * (this.WORLD_SIZE - 4),
                3 + Math.random() * 15,
                (Math.random() - 0.5) * (this.WORLD_SIZE - 4)
            );
            platform.castShadow = true;
            platform.receiveShadow = true;
            platform.userData.grappable = true;
            this.scene.add(platform);
        }

        this.assetLoaded(); // Signal room assets loaded
    }

    private addBoundaries(): void {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.5
        });

        // Create walls
        const walls = [
            { pos: [0, this.WALL_HEIGHT/2, -this.WORLD_SIZE/2], rot: [0, 0, 0], size: [this.WORLD_SIZE, this.WALL_HEIGHT, 1] },
            { pos: [0, this.WALL_HEIGHT/2, this.WORLD_SIZE/2], rot: [0, 0, 0], size: [this.WORLD_SIZE, this.WALL_HEIGHT, 1] },
            { pos: [-this.WORLD_SIZE/2, this.WALL_HEIGHT/2, 0], rot: [0, Math.PI/2, 0], size: [this.WORLD_SIZE, this.WALL_HEIGHT, 1] },
            { pos: [this.WORLD_SIZE/2, this.WALL_HEIGHT/2, 0], rot: [0, Math.PI/2, 0], size: [this.WORLD_SIZE, this.WALL_HEIGHT, 1] }
        ];

        walls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(wall.size[0], wall.size[1], wall.size[2]);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(wall.pos[0], wall.pos[1], wall.pos[2]);
            mesh.rotation.set(wall.rot[0], wall.rot[1], wall.rot[2]);
            mesh.userData.grappable = true;
            this.scene.add(mesh);
        });
    }

    private addLighting(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        this.assetLoaded(); // Signal lighting loaded
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private checkGroundCollision(): void {
        if (this.camera.position.y <= 2) {
            this.camera.position.y = 2;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
    }

    private startGame(): void {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
        this.gameStarted = true;
        this.controls.lock();
        this.startTimer();
        this.updatePuzzleStatus(); // Show initial puzzle status
    }

    private createPuzzles(): void {
        // Puzzle 1: Find the red button and activate it
        const button1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        button1.position.set(5, 1, 5);
        button1.userData.grappable = true;
        this.scene.add(button1);
        
        // Key 1: Blue key that appears after solving puzzle 1
        const key1 = this.createKey(0x0000ff);
        key1.position.set(5, 1.5, 5);
        key1.visible = false;
        this.scene.add(key1);

        // Puzzle 2: Activate three switches in order
        const switches = [];
        for (let i = 0; i < 3; i++) {
            const switch_ = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.8, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x00ff00 })
            );
            switch_.position.set(-5 + i * 2, 3, -5);
            switch_.userData.grappable = true;
            switch_.userData.switchIndex = i;
            this.scene.add(switch_);
            switches.push(switch_);
        }

        // Key 2: Red key that appears after solving puzzle 2
        const key2 = this.createKey(0xff0000);
        key2.position.set(-5, 3.5, -5);
        key2.visible = false;
        this.scene.add(key2);

        // Puzzle 3: Final escape door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(2, 3, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        door.position.set(0, 1.5, -this.WORLD_SIZE/2 + 0.5);
        door.userData.grappable = true;
        this.scene.add(door);

        this.puzzles = [
            {
                id: 1,
                object: button1,
                hint: "Find and activate the red button",
                solved: false,
                key: key1
            },
            {
                id: 2,
                object: switches[0], // Using first switch as reference
                hint: "Activate the three switches in order",
                solved: false,
                key: key2,
                requiredKeyId: 1
            },
            {
                id: 3,
                object: door,
                hint: "Find the escape door and use the final key",
                solved: false,
                requiredKeyId: 2
            }
        ];

        // Create initial arrow for first puzzle
        this.updatePuzzleArrow();
        
        // Create monster (initially hidden)
        this.createMonster();

        this.assetLoaded(); // Signal puzzles loaded
    }

    private createKey(color: number): THREE.Mesh {
        const keyGeometry = new THREE.Group();
        
        // Key head
        const head = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: color })
        );
        keyGeometry.add(head);

        // Key shaft
        const shaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.4, 0.1),
            new THREE.MeshStandardMaterial({ color: color })
        );
        shaft.position.y = -0.2;
        keyGeometry.add(shaft);

        // Key teeth
        const teeth = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ color: color })
        );
        teeth.position.y = -0.4;
        keyGeometry.add(teeth);

        return keyGeometry as unknown as THREE.Mesh;
    }

    private createMonster(): void {
        const monsterGeometry = new THREE.BoxGeometry(1, 2, 1);
        const monsterMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const monsterMesh = new THREE.Mesh(monsterGeometry, monsterMaterial);
        monsterMesh.position.set(0, 1, 0);
        
        this.monster = new THREE.Group();
        this.monster.add(monsterMesh);
        this.monster.visible = false;
        this.scene.add(this.monster);
    }

    private updatePuzzleStatus(): void {
        const statusElement = document.getElementById('puzzle-status');
        if (statusElement && this.currentPuzzleId <= this.puzzles.length) {
            const puzzle = this.puzzles[this.currentPuzzleId - 1];
            statusElement.textContent = `Current Puzzle (${this.currentPuzzleId}/${this.puzzles.length}): ${puzzle.hint}`;
        }
    }

    private updateTimer(): void {
        if (!this.gameStarted || this.gameOver) return;

        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            timerElement.textContent = `Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (this.timeRemaining <= 0) {
                this.activateMonster();
            }
        }
    }

    private startTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = window.setInterval(() => {
            if (this.gameStarted && !this.gameOver) {
                this.timeRemaining--;
                
                // Update timer display
                const timerElement = document.getElementById('timer');
                if (timerElement) {
                    const minutes = Math.floor(this.timeRemaining / 60);
                    const seconds = this.timeRemaining % 60;
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }

                // Activate monster when time runs out
                if (this.timeRemaining <= 0) {
                    this.activateMonster();
                    if (this.timerInterval) {
                        clearInterval(this.timerInterval);
                    }
                }
            }
        }, 1000);
    }

    private activateMonster(): void {
        if (this.monster) {
            this.monsterActive = true;
            // Make monster visible
            this.monster.visible = true;
            // Start monster movement in animation loop
        }
    }

    private updateMonster(): void {
        if (!this.monsterActive || !this.monster) return;

        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.camera.position, this.monster.position)
            .normalize();

        // Move monster towards player
        this.monster.position.add(directionToPlayer.multiplyScalar(0.1));
        
        // Rotate monster to face player
        this.monster.lookAt(this.camera.position);

        // Check if monster caught player
        if (this.monster.position.distanceTo(this.camera.position) < 2) {
            this.endGame(false, "The monster caught you!");
        }
    }

    private checkPuzzleInteraction(): void {
        if (!this.puzzleUIActive || !this.puzzleUI) return;

        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
        const intersects = this.raycaster.intersectObjects(this.puzzleUI.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData.isPuzzlePiece) {
                this.movePuzzlePiece(hit.userData.index);
            }
        }
    }

    private showInstruction(text: string): void {
        const instructionElement = document.getElementById('instructions');
        if (instructionElement) {
            instructionElement.textContent = text;
            setTimeout(() => {
                instructionElement.textContent = '';
            }, 3000);
        }
    }

    private endGame(won: boolean, message: string): void {
        this.gameOver = true;
        this.controls.unlock();
        
        const gameOverElement = document.getElementById('game-over');
        const messageElement = document.getElementById('game-over-message');
        
        if (gameOverElement && messageElement) {
            messageElement.textContent = message;
            gameOverElement.style.display = 'block';
        }
    }

    private showLoadingScreen(): void {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    private updateLoadingProgress(progress: number): void {
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
            loadingBar.style.width = `${progress}%`;
            if (progress >= 100) {
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loading-screen');
                    const startScreen = document.getElementById('start-screen');
                    if (loadingScreen && startScreen) {
                        loadingScreen.style.display = 'none';
                        startScreen.style.display = 'flex';
                    }
                }, 500);
            }
        }
    }

    private assetLoaded(): void {
        this.assetsLoaded++;
        const progress = (this.assetsLoaded / this.totalAssets) * 100;
        this.updateLoadingProgress(progress);
    }

    private updateHUD(): void {
        // Update life bar
        const lifeFill = document.getElementById('life-fill');
        if (lifeFill) {
            lifeFill.style.width = `${this.life}%`;
        }

        // Update score, level, and coins
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Level: ${this.level} | XP: ${this.xp}/${this.xpToNextLevel} | Coins: ${this.coins} | Score: ${this.score}`;
        }

        // Update item box
        const itemBox = document.getElementById('item-box');
        if (itemBox) {
            itemBox.textContent = this.currentItem || '';
        }
    }

    private takeDamage(amount: number, attackerPosition?: THREE.Vector3): void {
        const reducedDamage = Math.max(0, amount - (this.defense / 100 * amount));
        this.life = Math.max(0, this.life - reducedDamage);
        
        if (attackerPosition) {
            this.showDamageDirection(attackerPosition);
            
            const shakeIntensity = reducedDamage / 20;
            this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;
        }
        
        if (this.life <= 0) {
            this.endGame(false, "You died!");
        }
        this.updateHUD();
    }

    private setupMenuSystem(): void {
        // Pause menu handlers
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.gameStarted && !this.gameOver) {
                this.togglePause();
            }
        });

        const resumeButton = document.getElementById('resume-button');
        const settingsButton = document.getElementById('settings-button');
        const controlsButton = document.getElementById('controls-button');
        const quitButton = document.getElementById('quit-button');
        const settingsBack = document.getElementById('settings-back');
        const controlsBack = document.getElementById('controls-back');

        if (resumeButton) resumeButton.addEventListener('click', () => this.togglePause());
        if (settingsButton) settingsButton.addEventListener('click', () => this.showSettingsMenu());
        if (controlsButton) controlsButton.addEventListener('click', () => this.showControlsMenu());
        if (quitButton) quitButton.addEventListener('click', () => location.reload());
        if (settingsBack) settingsBack.addEventListener('click', () => this.showPauseMenu());
        if (controlsBack) controlsBack.addEventListener('click', () => this.showPauseMenu());

        // Settings handlers
        const sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
        const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
        const showFpsCheckbox = document.getElementById('show-fps') as HTMLInputElement;

        if (sensitivitySlider) {
            sensitivitySlider.value = this.settings.sensitivity.toString();
            sensitivitySlider.addEventListener('input', (e) => {
                this.settings.sensitivity = parseInt((e.target as HTMLInputElement).value);
            });
        }

        if (volumeSlider) {
            volumeSlider.value = this.settings.volume.toString();
            volumeSlider.addEventListener('input', (e) => {
                this.settings.volume = parseInt((e.target as HTMLInputElement).value);
            });
        }

        if (showFpsCheckbox) {
            showFpsCheckbox.checked = this.settings.showFps;
            showFpsCheckbox.addEventListener('change', (e) => {
                this.settings.showFps = (e.target as HTMLInputElement).checked;
            });
        }

        // Key binding handlers
        const keyBindButtons = document.querySelectorAll('.key-bind-button');
        keyBindButtons.forEach(button => {
            if (button instanceof HTMLButtonElement) {
                const action = button.dataset.action;
                if (action) {
                    button.textContent = this.getKeyDisplayName(this.keyBindings[action]);
                    button.addEventListener('click', () => this.startKeyBinding(action, button));
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.listeningForKey) {
                e.preventDefault();
                this.setKeyBinding(this.listeningForKey, e.code);
                this.listeningForKey = null;
                const buttons = document.querySelectorAll('.key-bind-button');
                buttons.forEach(b => b.classList.remove('listening'));
            }
        });
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showPauseMenu();
            this.controls.unlock();
        } else {
            this.hidePauseMenu();
            this.controls.lock();
        }
    }

    private showPauseMenu(): void {
        this.hideAllMenus();
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.style.display = 'flex';
    }

    private showSettingsMenu(): void {
        this.hideAllMenus();
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) settingsMenu.style.display = 'flex';
    }

    private showControlsMenu(): void {
        this.hideAllMenus();
        const controlsMenu = document.getElementById('controls-menu');
        if (controlsMenu) controlsMenu.style.display = 'flex';
    }

    private hideAllMenus(): void {
        const menus = document.querySelectorAll('.menu-screen');
        menus.forEach(menu => (menu as HTMLElement).style.display = 'none');
    }

    private hidePauseMenu(): void {
        this.hideAllMenus();
    }

    private startKeyBinding(action: string, button: HTMLButtonElement): void {
        if (this.listeningForKey === action) {
            this.listeningForKey = null;
            button.classList.remove('listening');
            button.textContent = this.getKeyDisplayName(this.keyBindings[action]);
        } else {
            const buttons = document.querySelectorAll('.key-bind-button');
            buttons.forEach(b => b.classList.remove('listening'));
            this.listeningForKey = action;
            button.classList.add('listening');
            button.textContent = 'Press a key...';
        }
    }

    private setKeyBinding(action: string, keyCode: string): void {
        this.keyBindings[action] = keyCode;
        const button = document.querySelector(`[data-action="${action}"]`);
        if (button instanceof HTMLButtonElement) {
            button.textContent = this.getKeyDisplayName(keyCode);
        }
    }

    private getKeyDisplayName(keyCode: string): string {
        const specialKeys: { [key: string]: string } = {
            'Space': 'SPACE',
            'ShiftLeft': 'SHIFT',
            'ControlLeft': 'CTRL',
            'AltLeft': 'ALT'
        };
        return specialKeys[keyCode] || keyCode.replace('Key', '');
    }

    private updateMovement(delta: number): void {
        if (!this.controls.isLocked) return;

        const currentSpeed = this.isRunning ? this.RUNNING_SPEED : this.MOVEMENT_SPEED;
        
        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Get camera direction vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        // Calculate target velocity
        const targetVelocity = new THREE.Vector3();
        targetVelocity.addScaledVector(forward, this.direction.z * currentSpeed);
        targetVelocity.addScaledVector(right, this.direction.x * currentSpeed);

        // Smooth acceleration
        const acceleration = this.isGrounded ? 15 : 3;
        this.velocity.x += (targetVelocity.x - this.velocity.x) * acceleration * delta;
        this.velocity.z += (targetVelocity.z - this.velocity.z) * acceleration * delta;

        // Ground friction
        if (this.isGrounded) {
            const friction = this.isRunning ? 0.7 : 0.85;
            this.velocity.x *= friction;
            this.velocity.z *= friction;
        }

        // Store original camera height
        const originalY = this.camera.position.y;

        // Advanced camera bob effect
        if ((this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) && this.isGrounded) {
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            const bobSpeed = this.isRunning ? 15 : 10;
            
            // Only vertical bob, no lateral movement
            this.verticalBob = Math.sin(this.footstepTime * bobSpeed) * 
                              (this.isRunning ? 0.12 : 0.08) * 
                              Math.min(1, speed / currentSpeed);
            
            this.footstepTime += delta;
            
            // Only apply vertical position offset
            this.camera.position.y = originalY + this.verticalBob;
        } else {
            // Smoothly reset bob effect
            this.verticalBob *= 0.8;
            this.camera.position.y = originalY + this.verticalBob;
        }

        // Apply movement with boundary checking
        const newPosX = this.camera.position.x + this.velocity.x * delta;
        const newPosZ = this.camera.position.z + this.velocity.z * delta;

        if (Math.abs(newPosX) < this.WORLD_SIZE/2 - 1) {
            this.camera.position.x = newPosX;
        } else {
            this.velocity.x = 0;
        }
        
        if (Math.abs(newPosZ) < this.WORLD_SIZE/2 - 1) {
            this.camera.position.z = newPosZ;
        } else {
            this.velocity.z = 0;
        }
    }

    private handleInteraction(object: THREE.Object3D): void {
        if (object.userData.isPuzzleWall) {
            this.showPuzzle();
            return;
        }
        // Handle different types of interactions
        if (object.userData.type === 'button') {
            this.activateButton(object);
        } else if (object.userData.type === 'switch') {
            this.activateSwitch(object);
        } else if (object.userData.type === 'door') {
            this.tryOpenDoor(object);
        }
    }

    private checkInteractables(): void {
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0 && intersects[0].distance < 3) {
            const object = intersects[0].object;
            if (object.userData.interactive) {
                this.canInteract = true;
                this.interactableObject = object;
                this.showInteractionPrompt(object);
            } else {
                this.canInteract = false;
                this.interactableObject = null;
                this.hideInteractionPrompt();
            }
        } else {
            this.canInteract = false;
            this.interactableObject = null;
            this.hideInteractionPrompt();
        }
    }

    private showInteractionPrompt(object: THREE.Object3D): void {
        const prompt = document.getElementById('interaction-prompt');
        if (prompt) {
            prompt.textContent = `Press ${this.getKeyDisplayName(this.keyBindings.interact)} to ${object.userData.interactionText || 'interact'}`;
            prompt.style.display = 'block';
        }
    }

    private hideInteractionPrompt(): void {
        const prompt = document.getElementById('interaction-prompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        if (this.gameStarted && !this.gameOver && !this.isPaused) {
            const delta = 0.016;

            // Update minimap
            this.updateMinimap();

            // Update rats
            this.updateRats(delta);

            // Apply physics and movement
            if (!this.isGrounded) {
                this.velocity.y -= this.GRAVITY * delta;
            }

            this.updateMovement(delta);
            this.checkGroundCollision();
            this.checkInteractables();
            this.checkPuzzleInteraction();

            // Update game elements
            this.updateTimer();
            this.updateMonster();
            this.leftHand.update();
            this.rightHand.update();

            // Update HUD
            this.updateHUD();

            // Handle monster damage
            if (this.monster && this.monsterActive) {
                const distanceToMonster = this.monster.position.distanceTo(this.camera.position);
                if (distanceToMonster < 5) {
                    this.takeDamage(0.1);
                }
            }

            // Update puzzle arrow
            if (this.currentArrow) {
                this.currentArrow.update();
            }
        }

        // Show FPS if enabled
        if (this.settings.showFps) {
            const fps = Math.round(1000 / (performance.now() - this.lastFrameTime));
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${fps}`;
                fpsElement.style.display = 'block';
            }
        }
        this.lastFrameTime = performance.now();

        this.renderer.render(this.scene, this.camera);
    }

    private activateButton(object: THREE.Object3D): void {
        const currentPuzzle = this.puzzles[this.currentPuzzleId - 1];
        if (!currentPuzzle.solved && object === currentPuzzle.object) {
            if (currentPuzzle.requiredKeyId) {
                const requiredPuzzle = this.puzzles[currentPuzzle.requiredKeyId - 1];
                if (!requiredPuzzle.solved) {
                    this.showInstruction("You need to solve the previous puzzle first!");
                    return;
                }
            }

            currentPuzzle.solved = true;
            if (currentPuzzle.key) {
                currentPuzzle.key.visible = true;
            }

            if (this.currentPuzzleId < this.puzzles.length) {
                this.currentPuzzleId++;
                this.updatePuzzleStatus();
                this.updatePuzzleArrow();
            } else {
                this.endGame(true, "Congratulations! You escaped!");
            }
        }
    }

    private activateSwitch(object: THREE.Object3D): void {
        const switchIndex = object.userData.switchIndex;
        const currentPuzzle = this.puzzles[this.currentPuzzleId - 1];
        
        if (currentPuzzle.id === 2 && !currentPuzzle.solved) {
            if (switchIndex === this.currentSwitchIndex) {
                (object as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                this.currentSwitchIndex++;
                
                if (this.currentSwitchIndex >= 3) {
                    currentPuzzle.solved = true;
                    if (currentPuzzle.key) {
                        currentPuzzle.key.visible = true;
                    }
                    this.currentPuzzleId++;
                    this.updatePuzzleStatus();
                    this.updatePuzzleArrow();
                }
            } else {
                // Reset switches if wrong order
                this.resetSwitches();
                this.currentSwitchIndex = 0;
                this.showInstruction("Wrong order! Try again.");
            }
        }
    }

    private tryOpenDoor(object: THREE.Object3D): void {
        const currentPuzzle = this.puzzles[this.currentPuzzleId - 1];
        if (currentPuzzle.id === 3 && !currentPuzzle.solved) {
            if (this.puzzles[1].solved) { // Check if we have the red key
                currentPuzzle.solved = true;
                this.endGame(true, "Congratulations! You escaped!");
            } else {
                this.showInstruction("You need the red key to open this door!");
            }
        }
    }

    private resetSwitches(): void {
        this.scene.children.forEach(child => {
            if (child.userData.type === 'switch') {
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            }
        });
    }

    private updatePuzzleArrow(): void {
        if (this.currentArrow) {
            this.currentArrow.remove(this.scene);
            this.currentArrow = null;
        }

        if (this.currentPuzzleId <= this.puzzles.length) {
            const currentPuzzle = this.puzzles[this.currentPuzzleId - 1];
            if (!currentPuzzle.solved) {
                this.currentArrow = new PuzzleArrow(this.scene, currentPuzzle.object);
            }
        }
    }

    private spawnRat(): void {
        // Random position around the player
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 5;
        const position = new THREE.Vector3(
            this.camera.position.x + Math.cos(angle) * distance,
            1,
            this.camera.position.z + Math.sin(angle) * distance
        );

        const rat = new Rat(this.scene, this.camera, position, false);
        this.rats.push(rat);
    }

    private updateRats(delta: number): void {
        // Spawn new regular rats
        const now = Date.now();
        if (!this.isBossActive && now - this.lastRatSpawn > this.RAT_SPAWN_INTERVAL) {
            this.spawnRat();
            this.lastRatSpawn = now;
        }

        // Update boss rat
        if (this.bossRat) {
            const done = this.bossRat.update(delta);
            if (!done) {
                const distance = this.bossRat.getPosition().distanceTo(this.camera.position);
                if (distance < 2 && !this.bossRat.isDeadAndRemovable()) {
                    this.takeDamage(25, this.bossRat.getPosition()); // Boss deals more damage
                }
            } else {
                this.bossRat = null;
                this.isBossActive = false;
            }
        }

        // Update regular rats
        this.rats = this.rats.filter(rat => {
            const done = rat.update(delta);
            if (!done) {
                const distance = rat.getPosition().distanceTo(this.camera.position);
                if (distance < 1.5 && !rat.isDeadAndRemovable()) {
                    this.takeDamage(10, rat.getPosition());
                }
            }
            return !done;
        });
    }

    checkRatHit(raycaster: THREE.Raycaster): boolean {
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length > 0) {
            const hitPoint = intersects[0].point;
            
            // Check boss rat first
            if (this.bossRat) {
                const distance = this.bossRat.getPosition().distanceTo(hitPoint);
                if (distance < 1) {
                    this.bossRat.takeDamage(hitPoint);
                    if (this.bossRat.isDead()) {
                        this.score += 100;
                        this.coins += 50;
                        this.addXP(50);
                        this.ratsKilled++;
                    }
                    return true;
                }
            }

            // Check regular rats
            for (const rat of this.rats) {
                const distance = rat.getPosition().distanceTo(hitPoint);
                if (distance < 0.5) {
                    rat.takeDamage(hitPoint);
                    if (rat.isDead()) {
                        this.score += 10;
                        this.coins += 5;
                        this.addXP(10);
                        this.ratsKilled++;
                        
                        if (this.ratsKilled % this.bossRatSpawnThreshold === 0) {
                            this.spawnBossRat();
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }

    private setupMinimap(): void {
        // Create minimap renderer with circular clipping
        this.minimap = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.minimap.setSize(200, 200);
        this.minimap.domElement.style.position = 'fixed';
        this.minimap.domElement.style.top = '20px';
        this.minimap.domElement.style.right = '20px';
        this.minimap.domElement.style.borderRadius = '50%';
        this.minimap.domElement.style.border = '3px solid rgba(255, 255, 255, 0.5)';
        this.minimap.domElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        document.body.appendChild(this.minimap.domElement);

        // Create minimap scene with darker background
        this.minimapScene = new THREE.Scene();
        this.minimapScene.background = new THREE.Color(0x111111);

        // Create orthographic camera for minimap
        this.minimapCamera = new THREE.OrthographicCamera(
            -this.minimapRadius, this.minimapRadius,
            this.minimapRadius, -this.minimapRadius,
            1, 1000
        );
        this.minimapCamera.up.set(0, 0, -1);

        // Add player marker (blue dot)
        const playerMarker = new THREE.Mesh(
            new THREE.CircleGeometry(1.5, 32),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            })
        );
        playerMarker.renderOrder = 1; // Ensure player is drawn on top
        this.minimapObjects.player = playerMarker;
        this.minimapScene.add(playerMarker);

        // Add direction indicator
        const directionIndicator = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 2, 3),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            })
        );
        directionIndicator.position.y = 0.1;
        playerMarker.add(directionIndicator);

        // Add minimap border
        const borderGeometry = new THREE.RingGeometry(this.minimapRadius - 1, this.minimapRadius, 32);
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.rotation.x = Math.PI / 2;
        this.minimapScene.add(border);
    }

    private setupDamageOverlay(): void {
        this.damageOverlay = document.createElement('div');
        this.damageOverlay.style.position = 'fixed';
        this.damageOverlay.style.top = '0';
        this.damageOverlay.style.left = '0';
        this.damageOverlay.style.width = '100%';
        this.damageOverlay.style.height = '100%';
        this.damageOverlay.style.pointerEvents = 'none';
        this.damageOverlay.style.transition = 'background-color 0.2s';
        document.body.appendChild(this.damageOverlay);
    }

    private updateMinimap(): void {
        // Update camera to follow player
        this.minimapCamera.position.set(
            this.camera.position.x,
            50,
            this.camera.position.z
        );
        this.minimapCamera.lookAt(this.camera.position.x, 0, this.camera.position.z);

        // Get player's forward direction
        const forward = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.camera.quaternion)
            .setY(0)
            .normalize();

        // Update player marker rotation
        if (this.minimapObjects.player) {
            this.minimapObjects.player.position.set(
                this.camera.position.x,
                0,
                this.camera.position.z
            );
            this.minimapObjects.player.rotation.y = Math.atan2(forward.x, forward.z);
        }

        // Update boss rat on minimap
        if (this.bossRat) {
            const bossMarkerId = 'boss_rat';
            if (!this.minimapObjects[bossMarkerId]) {
                const bossMarker = new THREE.Mesh(
                    new THREE.CircleGeometry(3, 32),
                    new THREE.MeshBasicMaterial({ 
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.8,
                        side: THREE.DoubleSide
                    })
                );
                bossMarker.renderOrder = 1;
                this.minimapObjects[bossMarkerId] = bossMarker;
                this.minimapScene.add(bossMarker);

                // Add boss health bar
                const healthBarWidth = 4;
                const healthBarHeight = 0.5;
                const healthBarBg = new THREE.Mesh(
                    new THREE.PlaneGeometry(healthBarWidth, healthBarHeight),
                    new THREE.MeshBasicMaterial({ 
                        color: 0x333333,
                        side: THREE.DoubleSide
                    })
                );
                healthBarBg.position.y = 2;
                bossMarker.add(healthBarBg);

                const healthBarFg = new THREE.Mesh(
                    new THREE.PlaneGeometry(healthBarWidth, healthBarHeight),
                    new THREE.MeshBasicMaterial({ 
                        color: 0xff0000,
                        side: THREE.DoubleSide
                    })
                );
                healthBarFg.position.y = 2;
                healthBarFg.userData.isHealthBar = true;
                bossMarker.add(healthBarFg);
            }

            const bossPos = this.bossRat.getPosition();
            this.minimapObjects[bossMarkerId].position.set(bossPos.x, 0, bossPos.z);
            
            // Update boss health bar
            const healthBar = this.minimapObjects[bossMarkerId].children
                .find(child => child.userData.isHealthBar);
            if (healthBar) {
                const healthPercent = this.bossRat.getHealthPercent();
                healthBar.scale.x = healthPercent;
                healthBar.position.x = (1 - healthPercent) * -2;
            }
        }

        // Update regular rats
        this.rats.forEach((rat, index) => {
            const markerId = `rat_${index}`;
            if (!this.minimapObjects[markerId]) {
                const ratMarker = new THREE.Mesh(
                    new THREE.CircleGeometry(1.2, 32),
                    new THREE.MeshBasicMaterial({ 
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.8,
                        side: THREE.DoubleSide
                    })
                );
                ratMarker.renderOrder = 1;
                this.minimapObjects[markerId] = ratMarker;
                this.minimapScene.add(ratMarker);
            }
            const pos = rat.getPosition();
            this.minimapObjects[markerId].position.set(pos.x, 0, pos.z);
        });

        // Clean up removed rats
        Object.keys(this.minimapObjects).forEach(key => {
            if (key.startsWith('rat_') && parseInt(key.split('_')[1]) >= this.rats.length) {
                this.minimapScene.remove(this.minimapObjects[key]);
                delete this.minimapObjects[key];
            }
        });

        // Render minimap
        this.minimap.render(this.minimapScene, this.minimapCamera);
    }

    private showDamageDirection(attackerPosition: THREE.Vector3): void {
        this.damageDirection.subVectors(attackerPosition, this.camera.position).normalize();
        
        // Calculate which edges of the screen should be red based on attack direction
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const angle = Math.atan2(this.damageDirection.x, this.damageDirection.z) -
                     Math.atan2(cameraDirection.x, cameraDirection.z);
        
        // Create radial gradient for damage direction
        const gradientAngle = ((angle * 180 / Math.PI) + 360) % 360;
        this.damageOverlay.style.background = `
            radial-gradient(
                circle at ${50 + Math.cos(angle) * 50}% ${50 + Math.sin(angle) * 50}%,
                rgba(255, 0, 0, 0.5) 0%,
                rgba(255, 0, 0, 0.2) 30%,
                transparent 70%
            )
        `;

        // Clear the overlay after a short delay
        setTimeout(() => {
            this.damageOverlay.style.background = 'transparent';
        }, 200);
    }

    private spawnBossRat(): void {
        if (this.bossRat) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = 20; // Spawn further away
        const position = new THREE.Vector3(
            this.camera.position.x + Math.cos(angle) * distance,
            1,
            this.camera.position.z + Math.sin(angle) * distance
        );

        this.bossRat = new Rat(this.scene, this.camera, position, true); // true for boss
        this.isBossActive = true;
        
        // Show boss warning
        const warning = document.createElement('div');
        warning.style.position = 'fixed';
        warning.style.top = '50%';
        warning.style.left = '50%';
        warning.style.transform = 'translate(-50%, -50%)';
        warning.style.color = 'red';
        warning.style.fontSize = '48px';
        warning.style.fontWeight = 'bold';
        warning.style.textShadow = '0 0 10px rgba(255,0,0,0.5)';
        warning.textContent = 'BOSS RAT APPROACHING!';
        document.body.appendChild(warning);
        
        setTimeout(() => warning.remove(), 3000);
    }

    private addXP(amount: number): void {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
        this.updateHUD();
    }

    private levelUp(): void {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        
        // Show puzzle instead of shop
        this.showPuzzle();
        
        // Show level up message
        const levelUpMsg = document.createElement('div');
        levelUpMsg.style.position = 'fixed';
        levelUpMsg.style.top = '30%';
        levelUpMsg.style.left = '50%';
        levelUpMsg.style.transform = 'translate(-50%, -50%)';
        levelUpMsg.style.color = '#ffff00';
        levelUpMsg.style.fontSize = '48px';
        levelUpMsg.style.fontWeight = 'bold';
        levelUpMsg.style.textShadow = '0 0 10px rgba(255,255,0,0.5)';
        levelUpMsg.textContent = `LEVEL UP! Level ${this.level}`;
        document.body.appendChild(levelUpMsg);
        
        setTimeout(() => levelUpMsg.remove(), 2000);
    }

    private showPuzzle(): void {
        if (this.puzzleUIActive) return;
        this.puzzleUIActive = true;

        // Create puzzle UI in 3D space
        this.puzzleUI = new THREE.Group();
        this.puzzleUI.position.copy(this.puzzleWall!.position);
        this.puzzleUI.position.z += 0.2; // Slightly in front of wall

        // Create puzzle grid
        const gridSize = 3;
        const pieceSize = 1;
        const spacing = 0.1;

        // Initialize puzzle pieces array if not already initialized
        if (this.puzzlePieces.length === 0) {
            this.initializePuzzle();
        }

        // Create puzzle pieces
        for (let i = 0; i < this.puzzleSize * this.puzzleSize; i++) {
            const pieceGeometry = new THREE.PlaneGeometry(pieceSize, pieceSize);
            const pieceMaterial = new THREE.MeshStandardMaterial({
                color: this.puzzlePieces[i] === this.puzzleSize * this.puzzleSize - 1 ? 0x000000 : 0xffffff,
                roughness: 0.5,
                metalness: 0.5
            });

            const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
            
            // Calculate position in grid
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            piece.position.set(
                (col - 1) * (pieceSize + spacing),
                (1 - row) * (pieceSize + spacing),
                0
            );

            piece.userData.index = i;
            piece.userData.isPuzzlePiece = true;
            this.puzzleUI.add(piece);
        }

        this.scene.add(this.puzzleUI);
    }

    private initializePuzzle(): void {
        // Create solved puzzle array
        this.puzzlePieces = Array.from(Array(this.puzzleSize * this.puzzleSize).keys());
        
        // Shuffle pieces
        for (let i = this.puzzlePieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.puzzlePieces[i], this.puzzlePieces[j]] = [this.puzzlePieces[j], this.puzzlePieces[i]];
        }
        
        // Ensure puzzle is solvable
        if (!this.isPuzzleSolvable()) {
            // Swap first two pieces if puzzle is not solvable
            [this.puzzlePieces[0], this.puzzlePieces[1]] = [this.puzzlePieces[1], this.puzzlePieces[0]];
        }
    }

    private isPuzzleSolvable(): boolean {
        let inversions = 0;
        const blankPosition = this.puzzlePieces.indexOf(this.puzzleSize * this.puzzleSize - 1);
        const blankRow = Math.floor(blankPosition / this.puzzleSize);
        
        for (let i = 0; i < this.puzzlePieces.length - 1; i++) {
            for (let j = i + 1; j < this.puzzlePieces.length; j++) {
                if (this.puzzlePieces[i] > this.puzzlePieces[j] && 
                    this.puzzlePieces[i] !== this.puzzleSize * this.puzzleSize - 1 && 
                    this.puzzlePieces[j] !== this.puzzleSize * this.puzzleSize - 1) {
                    inversions++;
                }
            }
        }
        
        if (this.puzzleSize % 2 === 1) {
            return inversions % 2 === 0;
        } else {
            return (inversions + blankRow) % 2 === 0;
        }
    }

    private movePuzzlePiece(index: number): void {
        if (!this.puzzleUI) return;

        const emptyIndex = this.puzzlePieces.indexOf(this.puzzleSize * this.puzzleSize - 1);
        
        const canMove = (
            (Math.abs(index - emptyIndex) === 1 && Math.floor(index / this.puzzleSize) === Math.floor(emptyIndex / this.puzzleSize)) ||
            Math.abs(index - emptyIndex) === this.puzzleSize
        );
        
        if (canMove) {
            [this.puzzlePieces[index], this.puzzlePieces[emptyIndex]] = [this.puzzlePieces[emptyIndex], this.puzzlePieces[index]];
            
            const pieces = this.puzzleUI.children.filter(child => child.userData.isPuzzlePiece) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>[];
            const piece1 = pieces.find(p => p.userData.index === index);
            const piece2 = pieces.find(p => p.userData.index === emptyIndex);
            
            if (piece1 && piece2) {
                const tempPos = piece1.position.clone();
                piece1.position.copy(piece2.position);
                piece2.position.copy(tempPos);
                
                piece1.material.color.setHex(
                    this.puzzlePieces[index] === this.puzzleSize * this.puzzleSize - 1 ? 0x000000 : 0xffffff
                );
                piece2.material.color.setHex(
                    this.puzzlePieces[emptyIndex] === this.puzzleSize * this.puzzleSize - 1 ? 0x000000 : 0xffffff
                );
            }

            if (this.isPuzzleSolved()) {
                this.completePuzzle();
            }
        }
    }

    private isPuzzleSolved(): boolean {
        return this.puzzlePieces.every((piece, index) => piece === index);
    }

    private completePuzzle(): void {
        if (!this.puzzleUI) return;

        const glowLight = new THREE.PointLight(0xffff00, 2, 5);
        this.puzzleUI.add(glowLight);

        // Create simple text mesh instead of TextGeometry for now
        const message = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 0.5),
            new THREE.MeshStandardMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.5
            })
        );
        message.position.set(0, 2, 0.1);
        this.puzzleUI.add(message);

        setTimeout(() => {
            if (this.puzzleUI) {
                this.scene.remove(this.puzzleUI);
                this.puzzleUI = null;
            }
            this.puzzleUIActive = false;
            this.showShop();
            this.currentPuzzleLevel = (this.currentPuzzleLevel % this.puzzleImages.length) + 1;
        }, 2000);
    }

    private showShop(): void {
        const shop = document.createElement('div');
        shop.style.position = 'fixed';
        shop.style.top = '50%';
        shop.style.left = '50%';
        shop.style.transform = 'translate(-50%, -50%)';
        shop.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        shop.style.padding = '20px';
        shop.style.width = '800px';
        shop.style.borderRadius = '10px';
        shop.style.border = '2px solid #ffff00';
        shop.style.color = 'white';
        shop.style.zIndex = '1000';

        const title = document.createElement('h2');
        title.textContent = 'SHOP';
        title.style.textAlign = 'center';
        title.style.color = '#ffff00';
        shop.appendChild(title);

        // Create tabs
        const tabs = document.createElement('div');
        tabs.style.display = 'flex';
        tabs.style.marginBottom = '20px';
        tabs.style.borderBottom = '2px solid #ffff00';

        const categories = ['Weapons', 'Armor', 'Health Items'];
        categories.forEach((category, index) => {
            const tab = document.createElement('div');
            tab.textContent = category;
            tab.style.padding = '10px 20px';
            tab.style.cursor = 'pointer';
            tab.style.backgroundColor = index === 0 ? '#ffff00' : 'transparent';
            tab.style.color = index === 0 ? 'black' : 'white';
            tab.onclick = () => {
                Array.from(tabs.children).forEach(t => {
                    (t as HTMLElement).style.backgroundColor = 'transparent';
                    (t as HTMLElement).style.color = 'white';
                });
                tab.style.backgroundColor = '#ffff00';
                tab.style.color = 'black';
                showCategory(category);
            };
            tabs.appendChild(tab);
        });
        shop.appendChild(tabs);

        const content = document.createElement('div');
        content.id = 'shop-content';
        shop.appendChild(content);

        const showCategory = (category: string) => {
            content.innerHTML = '';
            let items: ShopItem[] = [];
            
            switch(category) {
                case 'Weapons':
                    items = Object.entries(this.weapons).map(([id, weapon]) => ({
                        id,
                        ...weapon,
                        type: 'weapon',
                        disabled: weapon.owned || weapon.unlockLevel > this.level || weapon.cost > this.coins
                    }));
                    break;
                case 'Armor':
                    items = Object.entries(this.armor).map(([id, armor]) => ({
                        id,
                        ...armor,
                        type: 'armor',
                        disabled: armor.owned || armor.unlockLevel > this.level || armor.cost > this.coins
                    }));
                    break;
                case 'Health Items':
                    items = Object.entries(this.healthItems).map(([id, item]) => ({
                        id,
                        ...item,
                        type: 'health',
                        disabled: item.cost > this.coins
                    }));
                    break;
                default:
                    items = [];
            }

            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.style.margin = '10px 0';
                itemDiv.style.padding = '10px';
                itemDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                itemDiv.style.borderRadius = '5px';
                itemDiv.style.display = 'flex';
                itemDiv.style.justifyContent = 'space-between';
                itemDiv.style.alignItems = 'center';

                const info = document.createElement('div');
                info.innerHTML = `
                    <div style="font-size: 18px; color: ${item.owned ? '#00ff00' : 'white'}">${item.name}</div>
                    <div style="font-size: 14px; color: #aaa">
                        ${item.type === 'weapon' ? `Damage: ${item.damage}, Speed: ${item.speed}` :
                          item.type === 'armor' ? `Defense: ${item.defense}` :
                          `Heal: ${item.heal}`}
                        ${item.type !== 'health' ? `, Required Level: ${item.unlockLevel}` : ''}
                    </div>
                `;
                itemDiv.appendChild(info);

                const buyButton = document.createElement('button');
                buyButton.textContent = item.owned ? 'Owned' : 
                                      item.type === 'health' ? `Buy (${item.cost} coins)` :
                                      `Purchase (${item.cost} coins)`;
                buyButton.style.padding = '8px 16px';
                buyButton.style.backgroundColor = item.disabled ? '#666' : '#4CAF50';
                buyButton.style.border = 'none';
                buyButton.style.borderRadius = '5px';
                buyButton.style.color = 'white';
                buyButton.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
                
                if (!item.disabled) {
                    buyButton.onclick = () => {
                        if (this.coins >= item.cost) {
                            this.coins -= item.cost;
                            
                            switch(item.type) {
                                case 'weapon':
                                    if (item.damage !== undefined && item.speed !== undefined) {
                                        this.weapons[item.id].owned = true;
                                        this.equippedWeapon = item.id;
                                        this.projectileDamage = item.damage;
                                        this.projectileSpeed = item.speed;
                                    }
                                    break;
                                case 'armor':
                                    if (item.defense !== undefined) {
                                        this.armor[item.id].owned = true;
                                        this.equippedArmor = item.id;
                                        this.defense = item.defense;
                                    }
                                    break;
                                case 'health':
                                    this.healthItems[item.id].quantity++;
                                    break;
                            }
                            
                            this.updateHUD();
                            showCategory(category); // Refresh the current category
                        }
                    };
                }
                
                itemDiv.appendChild(buyButton);
                content.appendChild(itemDiv);
            });
        };

        showCategory('Weapons'); // Show weapons by default

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.display = 'block';
        closeButton.style.margin = '20px auto 0';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#ff4444';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => shop.remove();
        shop.appendChild(closeButton);

        document.body.appendChild(shop);
    }

    // Add method to use health items
    private useHealthItem(itemId: string): void {
        const item = this.healthItems[itemId];
        if (item.quantity > 0) {
            this.life = Math.min(100, this.life + item.heal);
            item.quantity--;
            this.updateHUD();
        }
    }

    private toggleStore(): void {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showStore();
            this.controls.unlock();
        } else {
            const shop = document.querySelector('.shop-container');
            if (shop) shop.remove();
            this.controls.lock();
        }
    }

    private showStore(): void {
        const shop = document.createElement('div');
        shop.className = 'shop-container';
        shop.style.position = 'fixed';
        shop.style.top = '50%';
        shop.style.left = '50%';
        shop.style.transform = 'translate(-50%, -50%)';
        shop.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        shop.style.padding = '20px';
        shop.style.width = '1000px';
        shop.style.height = '80vh';
        shop.style.borderRadius = '10px';
        shop.style.border = '2px solid #ffff00';
        shop.style.color = 'white';
        shop.style.zIndex = '1000';
        shop.style.display = 'flex';
        shop.style.flexDirection = 'column';

        const title = document.createElement('h2');
        title.textContent = 'EQUIPMENT & STORE';
        title.style.textAlign = 'center';
        title.style.color = '#ffff00';
        title.style.marginBottom = '20px';
        shop.appendChild(title);

        // Create main content container
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.gap = '20px';
        content.style.height = '100%';

        // Equipment section
        const equipmentSection = document.createElement('div');
        equipmentSection.style.flex = '0 0 300px';
        equipmentSection.style.padding = '15px';
        equipmentSection.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        equipmentSection.style.borderRadius = '8px';

        const equipmentTitle = document.createElement('h3');
        equipmentTitle.textContent = 'Equipment';
        equipmentTitle.style.marginBottom = '15px';
        equipmentTitle.style.color = '#ffff00';
        equipmentSection.appendChild(equipmentTitle);

        // Equipment slots
        const slots = [
            { name: 'Weapon', item: this.weapons[this.equippedWeapon] as WeaponItem },
            { name: 'Armor', item: this.armor[this.equippedArmor] as ArmorItem }
        ];

        slots.forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.style.marginBottom = '15px';
            slotDiv.style.padding = '10px';
            slotDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            slotDiv.style.borderRadius = '5px';
            slotDiv.style.border = '1px solid #444';

            const slotTitle = document.createElement('div');
            slotTitle.textContent = slot.name;
            slotTitle.style.color = '#aaa';
            slotTitle.style.marginBottom = '5px';
            slotDiv.appendChild(slotTitle);

            const itemName = document.createElement('div');
            itemName.textContent = slot.item.name;
            itemName.style.color = '#fff';
            slotDiv.appendChild(itemName);

            const stats = document.createElement('div');
            stats.style.fontSize = '12px';
            stats.style.color = '#888';
            if (slot.name === 'Weapon' && 'damage' in slot.item && 'speed' in slot.item) {
                stats.textContent = `Damage: ${slot.item.damage}, Speed: ${slot.item.speed}`;
            } else if (slot.name === 'Armor' && 'defense' in slot.item) {
                stats.textContent = `Defense: ${slot.item.defense}`;
            }
            slotDiv.appendChild(stats);

            equipmentSection.appendChild(slotDiv);
        });

        // Inventory section
        const inventoryTitle = document.createElement('h3');
        inventoryTitle.textContent = 'Health Items';
        inventoryTitle.style.marginTop = '20px';
        inventoryTitle.style.marginBottom = '15px';
        inventoryTitle.style.color = '#ffff00';
        equipmentSection.appendChild(inventoryTitle);

        Object.entries(this.healthItems).forEach(([id, item]) => {
            if (item.quantity > 0) {
                const itemDiv = document.createElement('div');
                itemDiv.style.marginBottom = '10px';
                itemDiv.style.padding = '8px';
                itemDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                itemDiv.style.borderRadius = '5px';
                itemDiv.style.display = 'flex';
                itemDiv.style.justifyContent = 'space-between';
                itemDiv.style.alignItems = 'center';

                const itemInfo = document.createElement('div');
                itemInfo.innerHTML = `
                    <div>${item.name}</div>
                    <div style="font-size: 12px; color: #888">Heal: ${item.heal}</div>
                    <div style="font-size: 12px; color: #888">Quantity: ${item.quantity}</div>
                `;
                itemDiv.appendChild(itemInfo);

                const useButton = document.createElement('button');
                useButton.textContent = 'Use';
                useButton.style.padding = '5px 10px';
                useButton.style.backgroundColor = '#4CAF50';
                useButton.style.border = 'none';
                useButton.style.borderRadius = '3px';
                useButton.style.color = 'white';
                useButton.style.cursor = 'pointer';
                useButton.onclick = () => {
                    this.useHealthItem(id);
                    this.toggleStore();
                    this.toggleStore(); // Refresh the store
                };
                itemDiv.appendChild(useButton);

                equipmentSection.appendChild(itemDiv);
            }
        });

        content.appendChild(equipmentSection);

        // Store section
        const storeSection = document.createElement('div');
        storeSection.style.flex = '1';
        content.appendChild(storeSection);

        // Create tabs
        const tabs = document.createElement('div');
        tabs.style.display = 'flex';
        tabs.style.marginBottom = '20px';
        tabs.style.borderBottom = '2px solid #ffff00';

        const categories = ['Weapons', 'Armor', 'Health Items'];
        categories.forEach((category, index) => {
            const tab = document.createElement('div');
            tab.textContent = category;
            tab.style.padding = '10px 20px';
            tab.style.cursor = 'pointer';
            tab.style.backgroundColor = index === 0 ? '#ffff00' : 'transparent';
            tab.style.color = index === 0 ? 'black' : 'white';
            tab.onclick = () => {
                Array.from(tabs.children).forEach(t => {
                    (t as HTMLElement).style.backgroundColor = 'transparent';
                    (t as HTMLElement).style.color = 'white';
                });
                tab.style.backgroundColor = '#ffff00';
                tab.style.color = 'black';
                showCategory(category);
            };
            tabs.appendChild(tab);
        });
        storeSection.appendChild(tabs);

        const storeContent = document.createElement('div');
        storeContent.id = 'shop-content';
        storeContent.style.overflowY = 'auto';
        storeContent.style.maxHeight = 'calc(80vh - 150px)';
        storeSection.appendChild(storeContent);

        const showCategory = (category: string) => {
            storeContent.innerHTML = '';
            let items: ShopItem[] = [];
            
            switch(category) {
                case 'Weapons':
                    items = Object.entries(this.weapons).map(([id, weapon]) => ({
                        id,
                        ...weapon,
                        type: 'weapon',
                        disabled: weapon.owned || weapon.unlockLevel > this.level || weapon.cost > this.coins
                    }));
                    break;
                case 'Armor':
                    items = Object.entries(this.armor).map(([id, armor]) => ({
                        id,
                        ...armor,
                        type: 'armor',
                        disabled: armor.owned || armor.unlockLevel > this.level || armor.cost > this.coins
                    }));
                    break;
                case 'Health Items':
                    items = Object.entries(this.healthItems).map(([id, item]) => ({
                        id,
                        ...item,
                        type: 'health',
                        disabled: item.cost > this.coins
                    }));
                    break;
            }

            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.style.margin = '10px 0';
                itemDiv.style.padding = '10px';
                itemDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                itemDiv.style.borderRadius = '5px';
                itemDiv.style.display = 'flex';
                itemDiv.style.justifyContent = 'space-between';
                itemDiv.style.alignItems = 'center';

                const info = document.createElement('div');
                info.innerHTML = `
                    <div style="font-size: 18px; color: ${item.owned ? '#00ff00' : 'white'}">${item.name}</div>
                    <div style="font-size: 14px; color: #aaa">
                        ${item.type === 'weapon' ? `Damage: ${item.damage}, Speed: ${item.speed}` :
                          item.type === 'armor' ? `Defense: ${item.defense}` :
                          `Heal: ${item.heal}`}
                        ${item.type !== 'health' ? `, Required Level: ${item.unlockLevel}` : ''}
                    </div>
                `;
                itemDiv.appendChild(info);

                const buyButton = document.createElement('button');
                buyButton.textContent = item.owned ? 'Owned' : 
                                      item.type === 'health' ? `Buy (${item.cost} coins)` :
                                      `Purchase (${item.cost} coins)`;
                buyButton.style.padding = '8px 16px';
                buyButton.style.backgroundColor = item.disabled ? '#666' : '#4CAF50';
                buyButton.style.border = 'none';
                buyButton.style.borderRadius = '5px';
                buyButton.style.color = 'white';
                buyButton.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
                
                if (!item.disabled) {
                    buyButton.onclick = () => {
                        if (this.coins >= item.cost) {
                            this.coins -= item.cost;
                            
                            switch(item.type) {
                                case 'weapon':
                                    if (item.damage !== undefined && item.speed !== undefined) {
                                        this.weapons[item.id].owned = true;
                                        this.equippedWeapon = item.id;
                                        this.projectileDamage = item.damage;
                                        this.projectileSpeed = item.speed;
                                    }
                                    break;
                                case 'armor':
                                    if (item.defense !== undefined) {
                                        this.armor[item.id].owned = true;
                                        this.equippedArmor = item.id;
                                        this.defense = item.defense;
                                    }
                                    break;
                                case 'health':
                                    this.healthItems[item.id].quantity++;
                                    break;
                            }
                            
                            this.updateHUD();
                            this.toggleStore();
                            this.toggleStore(); // Refresh the store
                        }
                    };
                }
                
                itemDiv.appendChild(buyButton);
                storeContent.appendChild(itemDiv);
            });
        };

        showCategory('Weapons'); // Show weapons by default
        shop.appendChild(content);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close (G)';
        closeButton.style.display = 'block';
        closeButton.style.margin = '20px auto 0';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#ff4444';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.toggleStore();
        shop.appendChild(closeButton);

        document.body.appendChild(shop);
    }
}

// Start the game
new Game(); 
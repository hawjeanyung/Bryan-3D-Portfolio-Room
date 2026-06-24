import * as THREE from "three";
import Experience from "../Experience.js";
import GSAP from "gsap";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";

export default class Room {
    constructor() {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.time = this.experience.time;
        this.room = this.resources.items.room;
        this.actualRoom = this.room.scene;
        this.roomChildren = {};

        this.lerp = {
            current: 0,
            target: 0,
            ease: 0.1,
        };

        this.HOVERABLE = {
            computer:     "About Me",
            shelves:      "My Projects",
            mailbox:      "Contact Me",
            chair:        "Take a seat",
            pictureframe: "Gallery",
        };

        this._introComplete = false;

        this.indicatorVector = new THREE.Vector3();
        this.indicators = [];

        // Raycasting setup for clicks
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Grab both cameras from your Camera.js instance
        this.orthoCamera = this.experience.camera.orthographicCamera;
        this.perspCamera = this.experience.camera.perspectiveCamera;

        // Set the active camera (Start with ortho since your room is isometric)
        this.activeCamera = this.perspCamera; 

        // Bind the click event
        this.onClick();
        this.setModel();
        this.setAnimation();
        this.onMouseMove();
        this.setupTooltip();
        this.setupIndicators();
    }

    setModel() {
        this.actualRoom.children.forEach((child) => {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child instanceof THREE.Group) {
                child.children.forEach((groupchild) => {
                    groupchild.castShadow = true;
                    groupchild.receiveShadow = true;
                });
            }

            if (child.name === "Aquarium") {
                child.children[0].material = new THREE.MeshPhysicalMaterial();
                child.children[0].material.roughness = 0;
                child.children[0].material.color.set(0x549dd2);
                child.children[0].material.ior = 3;
                child.children[0].material.transmission = 1;
                child.children[0].material.opacity = 1;
                child.children[0].material.depthWrite = false;
                child.children[0].material.depthTest = false;
            }

            if (child.name === "Computer") {
                child.children[1].material = new THREE.MeshBasicMaterial({
                    map: this.resources.items.screen,
                });
            }

            if (child.name === "MiniFloor") {
                child.position.x = .2;
                child.position.z = 6.82473;
            }

            child.scale.set(0, 0, 0);
            if (child.name === "Cube") {
                child.position.set(0, .5, 0);
                child.rotation.y = Math.PI + Math.PI / 4 + (Math.PI / 2);
            }

            this.roomChildren[child.name.toLowerCase()] = child;
        });

        const width = 0.7;
        const height = 1;
        const intensity = 1;
        const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
        rectLight.position.set(7.74153, 9, 0);
        rectLight.rotation.x = -Math.PI / 2;
        rectLight.rotation.z = Math.PI / 4.5;
        this.actualRoom.add(rectLight);

        this.roomChildren["rectLight"] = rectLight;

        this.scene.add(this.actualRoom);
        this.actualRoom.scale.set(0.11, 0.11, 0.11);
    }

    setAnimation() {
        this.mixer = new THREE.AnimationMixer(this.actualRoom);
        this.swim = this.mixer.clipAction(this.room.animations[8]);
        this.swim.play();
    }

    onMouseMove() {
        window.addEventListener("mousemove", (e) => {
            this.rotation =
                ((e.clientX - window.innerWidth / 2) * 2) / window.innerWidth;
            this.lerp.target = this.rotation * 0.08;

            if (this.tooltip) {
                this.tooltip.style.left = (e.clientX + 14) + "px";
                this.tooltip.style.top  = (e.clientY - 36) + "px";
            }
        });
    }

    onClick() {
        window.addEventListener("click", (e) => {
            // 1. Calculate mouse position in normalized device coordinates (-1 to +1)
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // 2. Set the raycaster from the active camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.activeCamera);

            // 3. Calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects(this.actualRoom.children, true);

            if (intersects.length > 0) {
                let object = intersects[0].object;
                let targetKey = null;
                
                // Traverse up to find the main group name
                while (object) {
                    const name = object.name.toLowerCase();
                    if (this.HOVERABLE[name]) {
                        targetKey = name;
                        break;
                    }
                    object = object.parent;
                }

                // 4. If we clicked a hoverable object, trigger an action!
                if (targetKey) {
                    console.log(`Successfully clicked on: ${this.HOVERABLE[targetKey]}`);
                    
                    // Highlight the clicked object using your existing function
                    this.isolateObject(targetKey);
                }
            } else {
                // If the user clicks empty space, reset the room visibility
                this.resetIsolation();
            }
        });
    }

    setupIndicators() {
        this.indicatorsContainer = document.createElement("div");
        this.indicatorsContainer.className = "room-indicators";
        document.body.appendChild(this.indicatorsContainer);

        this.indicators = [];
        
        Object.keys(this.HOVERABLE).forEach((key) => {
            const object3D = this.roomChildren[key];
            if (object3D) {
                const element = document.createElement("div");
                element.className = "indicator-dot";
                element.style.opacity = "0"; // Keep hidden during loading
                this.indicatorsContainer.appendChild(element);

                this.indicators.push({
                    key: key,
                    element: element,
                    object3D: object3D,
                    anchor: null // We will create this after the intro!
                });
            }
        });
    }

    setupTooltip() {
        this.tooltip = document.createElement("div");
        this.tooltip.className = "room-tooltip";
        this.tooltip.style.cssText = `
            position: fixed;
            padding: 6px 12px;
            border-radius: 6px;
            font-family: 'Montserrat', sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.04em;
            pointer-events: none;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.18s ease, transform 0.18s ease;
            z-index: 200;
            white-space: nowrap;
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.10);
            color: #111;
            box-shadow: 0 2px 12px rgba(0,0,0,0.10);
        `;
        document.body.appendChild(this.tooltip);

        const syncTheme = () => {
            const dark = document.body.classList.contains("dark-theme");
            this.tooltip.style.background = dark
                ? "rgba(20,20,30,0.88)"
                : "rgba(255,255,255,0.88)";
            this.tooltip.style.color  = dark ? "#f0f0f0" : "#111";
            this.tooltip.style.border = dark
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid rgba(0,0,0,0.10)";
        };
        syncTheme();
        new MutationObserver(syncTheme).observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });
    }

    showTooltip(label) {
        if (!this.tooltip) return;
        this.tooltip.textContent = "✦ " + label;
        this.tooltip.style.opacity   = "1";
        this.tooltip.style.transform = "translateY(0)";
    }

    hideTooltip() {
        if (!this.tooltip) return;
        this.tooltip.style.opacity   = "0";
        this.tooltip.style.transform = "translateY(4px)";
    }

    isolateObject(focusKey) {
        if (!this._introComplete) return;

        Object.entries(this.roomChildren).forEach(([key, obj]) => {
            if (!obj.traverse) return;
            const isFocus = key === focusKey;
            obj.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.transparent = true;
                    GSAP.to(child.material, {
                        opacity: isFocus ? 1 : 0.35,
                        duration: 0.25,
                    });
                }
            });
        });
    }

    resetIsolation() {
        if (!this._introComplete) return;

        Object.values(this.roomChildren).forEach((obj) => {
            if (!obj.traverse) return;
            obj.traverse((child) => {
                if (child.isMesh && child.material) {
                    GSAP.to(child.material, {
                        opacity: 1,
                        duration: 0.25,
                        onComplete: () => {
                            child.material.transparent = false;
                        },
                    });
                }
            });
        });
    }

    markIntroComplete() {
        this._introComplete = true;

        // MANAUL NUDGING: If a dot is slightly off-center, change these X, Y, Z values!
        // Y is up/down. X and Z are left/right/forward/back relative to the room.
        const tweaks = {
            computer:     { x: 0, y: 0, z: 0 },
            shelves:      { x: 0, y: 0, z: 0 },
            mailbox:      { x: 0, y: 0, z: 0 },
            chair:        { x: 0, y: 0, z: 0 },
            pictureframe: { x: 0, y: 0, z: 0 },
        };

        // Calculate true centers and attach permanent invisible anchors
        this.indicators.forEach((indicator) => {
            const anchor = new THREE.Object3D();
            
            // 1. Get the true bounding box center now that scaling is at 100%
            const box = new THREE.Box3().setFromObject(indicator.object3D);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            // 2. Convert to the room's local coordinate space
            this.actualRoom.worldToLocal(center);
            anchor.position.copy(center);

            // 3. Apply any manual nudges from the tweaks dictionary
            const tweak = tweaks[indicator.key];
            if (tweak) {
                anchor.position.x += tweak.x;
                anchor.position.y += tweak.y;
                anchor.position.z += tweak.z;
            }

            // 4. Attach to the room so it rotates perfectly with it!
            this.actualRoom.add(anchor);
            indicator.anchor = anchor;
            
            // Show the dot!
            indicator.element.style.opacity = "1";
        });
    }

    resize() {}

    update() {
        this.lerp.current = GSAP.utils.interpolate(
            this.lerp.current,
            this.lerp.target,
            this.lerp.ease
        );

        this.actualRoom.rotation.y = this.lerp.current;
        this.mixer.update(this.time.delta * 0.003);

        // --- NEW: Update Indicator Positions ---
        // Only run this if the intro is complete and anchors exist
        if (this.indicators && this.activeCamera && this._introComplete) {
            for (const indicator of this.indicators) {
                if (!indicator.anchor) continue;

                // 1. Get the world position of our static, invisible anchor
                indicator.anchor.getWorldPosition(this.indicatorVector);

                // 2. Project to 2D screen space
                this.indicatorVector.project(this.activeCamera);

                // 3. Convert to CSS pixels
                const x = Math.round((0.5 + this.indicatorVector.x / 2) * window.innerWidth);
                const y = Math.round((0.5 - this.indicatorVector.y / 2) * window.innerHeight);

                // 4. Update the CSS transform
                indicator.element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

                // 5. Hide if behind camera
                if (this.indicatorVector.z > 1) {
                    indicator.element.style.display = "none";
                } else {
                    indicator.element.style.display = "block";
                }
            }
        }
    }
}
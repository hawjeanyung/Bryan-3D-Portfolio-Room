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

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.orthoCamera = this.experience.camera.orthographicCamera;
        this.perspCamera = this.experience.camera.perspectiveCamera;

        // Fixed: use orthoCamera — matches what the renderer actually uses
        this.activeCamera = this.orthoCamera;

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
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.activeCamera);

            const intersects = this.raycaster.intersectObjects(
                this.actualRoom.children, true
            );

            if (intersects.length > 0) {
                let object = intersects[0].object;
                let targetKey = null;

                while (object) {
                    const name = object.name.toLowerCase();
                    if (this.HOVERABLE[name]) {
                        targetKey = name;
                        break;
                    }
                    object = object.parent;
                }

                if (targetKey) {
                    this.isolateObject(targetKey);
                }
            } else {
                this.resetIsolation();
            }
        });
    }

    setupIndicators() {
        this.labelsContainer = document.createElement("div");
        this.labelsContainer.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 200;
        `;
        document.body.appendChild(this.labelsContainer);

        this.indicators = [];

        Object.keys(this.HOVERABLE).forEach((key) => {
            const object3D = this.roomChildren[key];
            if (!object3D) return;

            const wrapper = document.createElement("div");
            wrapper.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            `;
            wrapper.innerHTML = `
                <div class="room-label-chip">${this.HOVERABLE[key]}</div>
                <div class="room-label-line"></div>
            `;
            this.labelsContainer.appendChild(wrapper);

            this.indicators.push({
                key,
                element: wrapper,
                object3D,
                anchor: null,
            });
        });

        const style = document.createElement("style");
        style.textContent = `
            .room-label-chip {
                background: rgba(255,255,255,0.92);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 0.5px solid rgba(0,0,0,0.12);
                border-radius: 6px;
                padding: 5px 12px;
                font-family: 'Montserrat', sans-serif;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #111;
                white-space: nowrap;
                box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            }
            .room-label-line {
                width: 1px;
                height: 12px;
                background: rgba(0,0,0,0.25);
            }
            body.dark-theme .room-label-chip {
                background: rgba(20,20,30,0.92);
                border-color: rgba(255,255,255,0.12);
                color: #f0f0f0;
            }
            body.dark-theme .room-label-line {
                background: rgba(255,255,255,0.25);
            }
        `;
        document.head.appendChild(style);
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

    showLabel(key) {
        for (const indicator of this.indicators) {
            indicator.element.style.opacity = indicator.key === key ? "1" : "0";
        }
    }

    hideLabel() {
        for (const indicator of this.indicators) {
            indicator.element.style.opacity = "0";
        }
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

        this.experience.scene.updateMatrixWorld(true);

        const yLifts = {
            computer:     15,
            shelves:      25,
            mailbox:      8,
            chair:        12,
            pictureframe: 20,
        };

        this.indicators.forEach((indicator) => {
            const anchor = new THREE.Object3D();

            const worldPos = new THREE.Vector3();
            indicator.object3D.getWorldPosition(worldPos);
            this.actualRoom.worldToLocal(worldPos);
            anchor.position.copy(worldPos);
            anchor.position.y += (yLifts[indicator.key] ?? 10);

            this.actualRoom.add(anchor);
            indicator.anchor = anchor;
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

        // Only project indicators that are currently visible
        if (this.indicators && this._introComplete) {
            for (const indicator of this.indicators) {
                if (!indicator.anchor) continue;
                if (indicator.element.style.opacity === "0") continue; // ← skip hidden ones

                indicator.anchor.getWorldPosition(this.indicatorVector);
                this.indicatorVector.project(this.orthoCamera);

                const x = Math.round((0.5 + this.indicatorVector.x / 2) * window.innerWidth);
                const y = Math.round((0.5 - this.indicatorVector.y / 2) * window.innerHeight);

                indicator.element.style.transform =
                    `translate(${x}px, ${y}px) translate(-50%, -100%)`;
                indicator.element.style.display =
                    this.indicatorVector.z > 1 ? "none" : "flex";
            }
        }
    }
}
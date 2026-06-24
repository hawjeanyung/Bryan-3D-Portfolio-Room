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

        this.setModel();
        this.setAnimation();
        this.onMouseMove();
        this.setupTooltip();
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
    }
}
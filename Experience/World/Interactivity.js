import * as THREE from "three";
import Experience from "../Experience.js";

export default class Interactivity {
    constructor() {
        this.experience = new Experience();
        this.camera     = this.experience.camera;
        this.canvas     = this.experience.canvas;
        this.room       = this.experience.world.room;
        this.renderer   = this.experience.renderer;

        this.raycaster         = new THREE.Raycaster();
        this.mouse             = new THREE.Vector2(-10, -10);
        this.hoveredKey        = null;
        this.interactiveMeshes = [];

        this._buildMeshList();
        this._bindEvents();
    }

    _buildMeshList() {
        const hoverable = this.room.HOVERABLE;
        const children  = this.room.roomChildren;

        Object.keys(hoverable).forEach((key) => {
            const obj = children[key];
            if (!obj) return;
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.userData.interactiveKey = key;
                    this.interactiveMeshes.push(child);
                }
            });
        });
    }

    _bindEvents() {
        window.addEventListener("mousemove", (e) => {
            this.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    update() {
        if (!this.room._introComplete) return;

        this.raycaster.setFromCamera(
            this.mouse,
            this.camera.orthographicCamera
        );

        const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        if (hits.length > 0) {
            const key = hits[0].object.userData.interactiveKey;
            if (key !== this.hoveredKey) {
                this.hoveredKey = key;
                const obj = this.room.roomChildren[key];
                this.renderer.outlineObject(obj);
                this.room.showLabel(key);
                this.canvas.style.cursor = "pointer";
            }
        } else {
            if (this.hoveredKey !== null) {
                this.hoveredKey = null;
                this.renderer.clearOutline();
                this.room.hideLabel();
                this.canvas.style.cursor = "default";
            }
        }
    }

    resize() {}
}
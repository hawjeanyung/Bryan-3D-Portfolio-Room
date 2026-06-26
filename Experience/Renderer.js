import * as THREE from "three";
import Experience from "./Experience.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";

export default class Renderer {
    constructor() {
        this.experience = new Experience();
        this.sizes      = this.experience.sizes;
        this.scene      = this.experience.scene;
        this.canvas     = this.experience.canvas;
        this.camera     = this.experience.camera;

        this.hasOutline = false; // track if anything is outlined

        this.setRenderer();
        this.setComposer();
    }

    setRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // composer handles edge quality
            powerPreference: "high-performance",
        });

        this.renderer.useLegacyLights     = false;
        this.renderer.outputColorSpace    = THREE.SRGBColorSpace;
        this.renderer.toneMapping         = THREE.CineonToneMapping;
        this.renderer.toneMappingExposure = 1.75;
        this.renderer.shadowMap.enabled   = true;
        this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        // Cap at 1 — composer multiplies cost by pixelRatio squared
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    }

    setComposer() {
        const cam = this.camera.orthographicCamera;
        const w   = this.sizes.width;
        const h   = this.sizes.height;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, cam));

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(w, h),
            this.scene,
            cam
        );
        this.outlinePass.edgeStrength   = 4;
        this.outlinePass.edgeGlow       = 0;
        this.outlinePass.edgeThickness  = 1.5;
        this.outlinePass.visibleEdgeColor.set("#ffffff");
        this.outlinePass.hiddenEdgeColor.set("#ffffff");
        this.outlinePass.enabled        = false; // off until needed
        this.composer.addPass(this.outlinePass);

        this.composer.addPass(new ShaderPass(GammaCorrectionShader));
    }

    outlineObject(object3D) {
        if (!object3D) {
            this.clearOutline();
            return;
        }
        const meshes = [];
        object3D.traverse((child) => {
            if (child.isMesh) meshes.push(child);
        });
        this.outlinePass.selectedObjects = meshes;
        this.outlinePass.enabled         = true;
        this.hasOutline                  = true;
    }

    clearOutline() {
        if (!this.hasOutline) return; // skip if already clear
        this.outlinePass.selectedObjects = [];
        this.outlinePass.enabled         = false;
        this.hasOutline                  = false;
    }

    resize() {
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.composer.setSize(this.sizes.width, this.sizes.height);
    }

    update() {
        this.composer.render();
    }
}
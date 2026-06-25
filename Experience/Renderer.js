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

        this.setRenderer();
        this.setComposer();
    }

    setRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });

        this.renderer.useLegacyLights     = false;
        this.renderer.outputColorSpace    = THREE.SRGBColorSpace;
        this.renderer.toneMapping         = THREE.CineonToneMapping;
        this.renderer.toneMappingExposure = 1.75;
        this.renderer.shadowMap.enabled   = true;
        this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);
    }

    setComposer() {
        const cam = this.camera.orthographicCamera;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, cam));

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(this.sizes.width, this.sizes.height),
            this.scene,
            cam
        );
        this.outlinePass.edgeStrength  = 4;
        this.outlinePass.edgeGlow      = 0;
        this.outlinePass.edgeThickness = 1.5;
        this.outlinePass.visibleEdgeColor.set("#ffffff");
        this.outlinePass.hiddenEdgeColor.set("#ffffff");
        this.composer.addPass(this.outlinePass);

        // Use GammaCorrectionShader instead of OutputPass for r150
        this.composer.addPass(new ShaderPass(GammaCorrectionShader));
    }

    outlineObject(object3D) {
        if (!object3D) {
            this.outlinePass.selectedObjects = [];
            return;
        }
        const meshes = [];
        object3D.traverse((child) => {
            if (child.isMesh) meshes.push(child);
        });
        this.outlinePass.selectedObjects = meshes;
    }

    clearOutline() {
        this.outlinePass.selectedObjects = [];
    }

    resize() {
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);
        this.composer.setSize(this.sizes.width, this.sizes.height);
    }

    update() {
        this.composer.render();
    }
}
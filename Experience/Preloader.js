import { EventEmitter } from "events";
import Experience from "./Experience.js";
import GSAP from "gsap";
import convert from "./Utils/covertDivsToSpans.js";

export default class Preloader extends EventEmitter {
    constructor() {
        super();
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.sizes = this.experience.sizes;
        this.resources = this.experience.resources;
        this.camera = this.experience.camera;
        this.world = this.experience.world;
        this.device = this.sizes.device;

        this.displayedProgress = 0;

        this.sizes.on("switchdevice", (device) => {
            this.device = device;
        });

        this.resources.on("progress", (realProgress) => {
            if (realProgress <= this.displayedProgress) return;
            GSAP.to(this, {
                displayedProgress: realProgress,
                duration: 2,
                ease: "power1.out",
                onUpdate: () => {
                    const el = document.querySelector(".loading-percentage");
                    if (el) el.innerHTML = Math.round(this.displayedProgress) + "%";
                },
            });
        });

        this.world.on("worldready", () => {
            this.setAssets();
            this.playIntro();
        });
    }

    setAssets() {
        convert(document.querySelector(".hero-main-title"));
        convert(document.querySelector(".hero-main-description"));
        convert(document.querySelector(".first-sub"));
        convert(document.querySelector(".second-sub"));

        this.room = this.experience.world.room.actualRoom;
        this.roomChildren = this.experience.world.room.roomChildren;
    }

    finishLoadingCounter() {
        return new Promise((resolve) => {
            GSAP.to(this, {
                displayedProgress: 100,
                duration: 0.6,
                ease: "power2.out",
                onUpdate: () => {
                    const el = document.querySelector(".loading-percentage");
                    if (el) el.innerHTML = Math.round(this.displayedProgress) + "%";
                },
                onComplete: resolve,
            });
        });
    }

    secondIntro() {
        return new Promise((resolve) => {
            this.introStarted = true;
            // Hide hero text spans before animating them in
            GSAP.set(".hero-main-title .animatedis", { yPercent: 100 });
            GSAP.set(".hero-main-description .animatedis", { yPercent: 100 });
            GSAP.set(".first-sub .animatedis", { yPercent: 100 });
            GSAP.set(".second-sub .animatedis", { yPercent: 100 });
            // Position the room off-screen to start
            if (this.room) {
                this.room.scale.set(0.08, 0.08, 0.08);
                this.room.position.set(
                    this.device === "desktop" ? -1 : 0,
                    -1,
                    this.device === "desktop" ? 0 : -1
                );
            }

            // Fade out the preloader overlay
            GSAP.to(".preloader", {
                opacity: 0,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                    document.querySelector(".preloader").classList.add("hidden");
                },
            });

            this.secondTimeline = new GSAP.timeline({ delay: 0.6 });

            this.secondTimeline
                .to(this.room.position, {
                    x: 0, y: 0, z: 0,
                    ease: "power1.out",
                    duration: 1.2,
                }, "same")
                .to(this.roomChildren.cube.rotation, {
                    y: 2 * Math.PI + Math.PI / 4,
                }, "same")
                .to(this.roomChildren.cube.scale, {
                    x: 10, y: 10, z: 10,
                }, "same")
                .to(this.camera.orthographicCamera.position, {
                    y: 6.5,
                }, "same")
                .to(this.roomChildren.cube.position, {
                    x: 0.638711,
                    y: 10.5618,
                    z: 1.3243,
                }, "same")
                .set(this.roomChildren.scale, { x: 1, y: 1, z: 1 })
                .to(this.roomChildren.cube.scale, {
                    x: 0, y: 0, z: 0,
                    duration: 1,
                }, "introtext")
                .to(".hero-main-title .animatedis", {
                    yPercent: 0,
                    stagger: 0.07,
                    ease: "back.out(1.7)",
                }, "introtext")
                .to(".hero-main-description .animatedis", {
                    yPercent: 0,
                    stagger: 0.07,
                    ease: "back.out(1.7)",
                }, "introtext")
                .to(".first-sub .animatedis", {
                    yPercent: 0,
                    stagger: 0.07,
                    ease: "back.out(1.7)",
                }, "introtext")
                .to(".second-sub .animatedis", {
                    yPercent: 0,
                    stagger: 0.07,
                    ease: "back.out(1.7)",
                }, "introtext")
                .to(this.roomChildren.room.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, "introtext")
                .to(this.roomChildren.aquarium.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">+0.5")
                .to(this.roomChildren.clock.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">-0.4")
                .to(this.roomChildren.shelves.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">-0.3")
                .to(this.roomChildren.pictureframe.scale, {
                    x: 1, y: 1, z: 1,
                    duration: 0.1,
                }, ">-0.3")
                .to(this.roomChildren.flooritems.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">-0.2")
                .to(this.roomChildren.desks.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">-0.1")
                .to(this.roomChildren.tablestuff.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, ">-0.1")
                .to(this.roomChildren.computer.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                })
                .set(this.roomChildren.minifloor.scale, { x: 1, y: 1, z: 1 })
                .to(this.roomChildren.chair.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, "chair")
                .to(this.roomChildren.fish.scale, {
                    x: 1, y: 1, z: 1,
                    ease: "back.out(2.2)",
                    duration: 0.5,
                }, "chair")
                .to(this.roomChildren.chair.rotation, {
                    y: 4 * Math.PI + Math.PI / 4,
                    ease: "power2.out",
                    duration: 1,
                }, "chair")
                .to(".arrow-svg-wrapper", {
                    opacity: 1,
                    onComplete: () => {
                        this.experience.world.room.markIntroComplete();
                        resolve();
                    },
                });
        });
    }

    async playIntro() {
        this.scaleFlag = true;
        await this.finishLoadingCounter();
        await this.secondIntro();
        this.scaleFlag = false;
        this.emit("enablecontrols");
    }

    move() {
        if (this.device === "desktop") {
            this.room.position.set(-1, 0, 0);
        } else {
            this.room.position.set(0, 0, -1);
        }
    }

    scale() {
        if (this.introStarted) return;

        this.roomChildren.rectLight.width = 0;
        this.roomChildren.rectLight.height = 0;

        if (this.device === "desktop") {
            this.room.scale.set(0.11, 0.11, 0.11);
        } else {
            this.room.scale.set(0.07, 0.07, 0.07);
        }
    }

    update() {
        if (this.moveFlag) {
            this.move();
        }
        if (this.scaleFlag) {
            this.scale();
        }
    }
}
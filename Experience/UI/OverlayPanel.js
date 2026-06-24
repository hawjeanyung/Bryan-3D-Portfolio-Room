// Experience/UI/OverlayPanel.js
import GSAP from "gsap";
import Experience from "../Experience.js";

// All your portfolio content lives here
const PANEL_DATA = {
    computer: {
        title: "About Me",
        subtitle: "Haw Jean Yung · CS @ UTP",
        body: `Computer Science undergrad passionate about full-stack dev,
               ML, and embedded systems. 7 hackathons deep and counting.`,
        tags: ["React", "TypeScript", "Python", "Arduino"],
        links: [],
    },
    shelves: {
        title: "My Projects",
        subtitle: "CampusCare + AgentBanjir",
        body: `CampusCare: AI chatbot (React + Gemini + MongoDB).
               AgentBanjir: autonomous flood management with Vertex AI & Firebase Genkit.`,
        tags: ["React", "Node.js", "Vertex AI", "Genkit"],
        links: [
            { label: "GitHub", url: "https://github.com/hawjeanyung" },
        ],
    },
    mailbox: {
        title: "Contact Me",
        subtitle: "Let's connect",
        body: `Open to collaborations, hackathons, and new opportunities.`,
        tags: [],
        links: [
            { label: "LinkedIn", url: "https://www.linkedin.com/in/haw-jean-yung/" },
            { label: "GitHub",   url: "https://github.com/hawjeanyung" },
            { label: "Kaggle",   url: "https://www.kaggle.com/hawjeanyung" },
        ],
    },
};

export default class OverlayPanel {
    constructor() {
        this.experience = new Experience();
        this.isOpen     = false;
        this._buildDOM();
        this._bindClicks();
    }

    _buildDOM() {
        this.el = document.createElement("div");
        this.el.className = "overlay-panel";
        this.el.innerHTML = `
          <button class="overlay-close" aria-label="Close">✕</button>
          <p  class="overlay-subtitle"></p>
          <h2 class="overlay-title"></h2>
          <p  class="overlay-body"></p>
          <div class="overlay-tags"></div>
          <div class="overlay-links"></div>
        `;
        document.body.appendChild(this.el);
    }

    _bindClicks() {
        this.el.querySelector(".overlay-close").addEventListener("click", () => {
            this.close();
            this.experience.controls?.resetCamera();
        });
    }

    open(key) {
        const data = PANEL_DATA[key];
        if (!data) return;

        this.el.querySelector(".overlay-title").textContent    = data.title;
        this.el.querySelector(".overlay-subtitle").textContent = data.subtitle;
        this.el.querySelector(".overlay-body").textContent     = data.body;

        const tagsEl = this.el.querySelector(".overlay-tags");
        tagsEl.innerHTML = data.tags.map(t => `<span class="overlay-tag">${t}</span>`).join("");

        const linksEl = this.el.querySelector(".overlay-links");
        linksEl.innerHTML = data.links
            .map(l => `<a href="${l.url}" target="_blank" class="overlay-link">${l.label} ↗</a>`)
            .join("");

        this.isOpen = true;
        GSAP.fromTo(this.el,
            { opacity: 0, y: 20, pointerEvents: "none" },
            { opacity: 1, y: 0,  pointerEvents: "all", duration: 0.4, ease: "power2.out" }
        );
    }

    close() {
        this.isOpen = false;
        GSAP.to(this.el, {
            opacity: 0, y: 20, pointerEvents: "none",
            duration: 0.3, ease: "power2.in"
        });
    }
}
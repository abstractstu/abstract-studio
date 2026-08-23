/* ============================================================
   ABSTRACT STUDIO — JavaScript

   Funcionalidad del sitio.

   Contiene toda la interacción del usuario,
   animaciones, navegación y componentes dinámicos.
   ============================================================ */

/* ============================================================

   INDEX

   01. DOM Elements
   02. Configuration
   03. Header Scroll
   04. Mobile Navigation
   05. Scroll Reveal
   06. Active Navigation
   07. Smooth Scroll
   08. Utilities
   09. Initialization

   ============================================================ */

"use strict";

/* ============================================================
   DOM ELEMENTS
   ============================================================ */

// Header
const header = document.querySelector(".header");

// Navigation
const menuLinks = document.querySelectorAll(".menu-list a");

// Mobile nav controls (may not exist yet in the markup — guarded below)
const menuToggle = document.querySelector(".menu-toggle");
const menuList = document.querySelector(".menu-list");

// Project panel
const projectTrigger = document.querySelector(".project-trigger");
const projectPanel = document.querySelector(".project-panel");
const projectPanelClose = document.querySelector(".project-panel__close");
const projectForm = document.querySelector(".project-form");
const projectFormNotice = document.querySelector(".project-form__notice");
const projectSuccess = document.querySelector(".project-success");
const projectSuccessClose = document.querySelector(".project-success__close");

let projectPanelLastFocus = null;

// Reveal Elements
const revealElements = document.querySelectorAll(".reveal");

// Sections referenced by the menu (derived from menuLinks' hashes)
const sections = Array.from(menuLinks)
    .map((link) => {
        const hash = link.getAttribute("href");
        return hash && hash.startsWith("#")
            ? document.querySelector(hash)
            : null;
    })
    .filter(Boolean);

/* ============================================================
   CONFIGURATION
   ============================================================ */

// Scroll offset (px) after which the header switches to "scrolled" state
const HEADER_SCROLL_OFFSET = 40;

// IntersectionObserver threshold for the scroll-reveal effect
const REVEAL_THRESHOLD = 0;

// Delay (ms) used to throttle scroll-based handlers
const SCROLL_THROTTLE_MS = 100;

/* ============================================================
   HEADER SCROLL
   ============================================================ */

function handleHeaderScroll() {

    if (!header) return;

    if (window.scrollY > HEADER_SCROLL_OFFSET) {

        header.classList.add("scrolled");

    } else {

        header.classList.remove("scrolled");

    }

}

/* ============================================================
   MOBILE NAVIGATION
   ============================================================ */

function openMenu() {

    if (!menuList || !menuToggle) return;

    menuList.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");

}

function closeMenu() {

    if (!menuList || !menuToggle) return;

    menuList.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");

}

function toggleMenu() {

    if (!menuList) return;

    if (menuList.classList.contains("open")) {
        closeMenu();
    } else {
        openMenu();
    }

}

/* ============================================================
   PROJECT PANEL
   ============================================================ */

function getProjectPanelFocusableElements() {

    if (!projectPanel) return [];

    return Array.from(projectPanel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.closest("[hidden]"));

}

function resetProjectFormState() {

    if (!projectForm) return;

    projectForm.reset();
    projectForm.hidden = false;

    projectForm.querySelectorAll("[aria-invalid]").forEach((field) => {
        field.removeAttribute("aria-invalid");
    });

    if (projectFormNotice) projectFormNotice.textContent = "";
    if (projectSuccess) projectSuccess.hidden = true;

}

function openProjectPanel() {

    if (!projectPanel || !projectTrigger) return;

    projectPanelLastFocus = document.activeElement;
    resetProjectFormState();

    projectPanel.classList.add("is-open");
    projectPanel.setAttribute("aria-hidden", "false");
    projectTrigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("project-panel-open");

    window.setTimeout(() => projectPanelClose?.focus(), 250);

}

function closeProjectPanel({ restoreFocus = true } = {}) {

    if (!projectPanel || !projectTrigger) return;

    projectPanel.classList.remove("is-open");
    projectPanel.setAttribute("aria-hidden", "true");
    projectTrigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("project-panel-open");

    if (restoreFocus) {
        (projectPanelLastFocus || projectTrigger).focus();
    }

}

async function handleProjectFormSubmit(event) {

    event.preventDefault();

    if (!projectForm) return;

    // 1. Recortar espacios automáticamente en campos de texto, email y teléfono para evitar fallos por autocompletado móvil
    projectForm.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach((field) => {
        if (typeof field.value === "string") {
            field.value = field.value.trim();
        }
    });

    const selectedServices = projectForm.querySelectorAll('input[name="servicios"]:checked').length;
    const invalidFields = Array.from(projectForm.querySelectorAll("input[required], textarea[required]"))
        .filter((field) => !field.checkValidity());

    projectForm.querySelectorAll("input[required], textarea[required]").forEach((field) => {
        field.toggleAttribute("aria-invalid", !field.checkValidity());
    });

    if (!selectedServices || invalidFields.length) {
        if (projectFormNotice) {
            projectFormNotice.textContent = !selectedServices
                ? "Selecciona al menos un servicio para continuar."
                : "Revisa los campos marcados e inténtalo de nuevo.";
        }

        // Enfocar primer campo no válido de forma segura en dispositivos móviles (evitar saltos de foco en inputs 1x1px ocultos)
        const firstInvalid = !selectedServices
            ? projectForm.querySelector('input[name="servicios"]')
            : invalidFields[0];

        if (firstInvalid) {
            const isVisuallyHidden = firstInvalid.type === "radio" || firstInvalid.type === "checkbox";
            if (isVisuallyHidden) {
                const parentGroup = firstInvalid.closest(".project-form__group");
                parentGroup?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
                firstInvalid.focus();
            }
        }
        return;
    }

    const submitBtn = projectForm.querySelector(".project-submit");
    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    const endpoint = projectForm.action || "https://formspree.io/f/xyegvakr";

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Enviando...";
        }

        const formData = new FormData(projectForm);
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
            headers: {
                Accept: "application/json"
            }
        });

        if (response.ok) {
            if (projectFormNotice) projectFormNotice.textContent = "";
            projectForm.hidden = true;

            if (projectSuccess) {
                projectSuccess.hidden = false;
                projectSuccess.focus();
            }
        } else {
            // Manejo seguro de la respuesta de error (soporta JSON o HTML de Formspree/reCAPTCHA/Servidor)
            let errorMessage = "Hubo un problema al enviar tu mensaje. Inténtalo de nuevo o contáctanos por WhatsApp.";
            try {
                const data = await response.json();
                if (data && Array.isArray(data.errors) && data.errors.length > 0) {
                    errorMessage = data.errors.map((err) => err.message || err.field).join(", ");
                } else if (data && data.error) {
                    errorMessage = data.error;
                }
            } catch (_) {
                // Si Formspree devolvió HTML (403, 429, 500 o desafío reCAPTCHA anti-spam)
                if (response.status === 403) {
                    errorMessage = "La solicitud fue rechazada por seguridad. Intenta desde el navegador principal o contáctanos por WhatsApp.";
                } else if (response.status === 429) {
                    errorMessage = "Has realizado varios intentos. Por favor espera unos minutos o escríbenos directamente por WhatsApp.";
                } else if (response.status >= 500) {
                    errorMessage = "El servicio de mensajería está temporalmente fuera de servicio. Por favor escríbenos por WhatsApp.";
                }
            }

            if (projectFormNotice) {
                projectFormNotice.textContent = errorMessage;
            }
        }
    } catch (error) {
        // Error de red (offline, DNS o fallo de conexión)
        if (projectFormNotice) {
            projectFormNotice.textContent = "Error de conexión. Verifica tu acceso a internet o contáctanos directamente por WhatsApp.";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

}

function initProjectPanel() {

    if (!projectPanel || !projectTrigger || !projectForm) return;

    projectTrigger.addEventListener("click", openProjectPanel);
    projectPanelClose?.addEventListener("click", closeProjectPanel);
    projectSuccessClose?.addEventListener("click", closeProjectPanel);
    projectForm.addEventListener("submit", handleProjectFormSubmit);

    projectForm.addEventListener("input", (event) => {
        if (event.target.matches("input, textarea")) {
            event.target.removeAttribute("aria-invalid");
            if (projectFormNotice) projectFormNotice.textContent = "";
        }
    });

    projectForm.addEventListener("change", () => {
        if (projectFormNotice) projectFormNotice.textContent = "";
    });

    document.addEventListener("keydown", (event) => {
        if (!projectPanel.classList.contains("is-open")) return;

        if (event.key === "Escape") {
            closeProjectPanel();
            return;
        }

        if (event.key !== "Tab") return;

        const focusableElements = getProjectPanelFocusableElements();
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    });

}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */

function createRevealObserver() {

    if (!revealElements.length) return;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {

        revealElements.forEach((el) =>
            el.classList.add("is-visible")
        );

        return;

    }

    const observer = new IntersectionObserver(

        (entries, obs) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("is-visible");

                    obs.unobserve(entry.target);

                }

            });

        },

        {
            threshold: REVEAL_THRESHOLD
        }

    );

    revealElements.forEach((el) => observer.observe(el));

}

/* ============================================================
   SERVICES CINEMATIC
   ============================================================ */

function createServicesObserver() {

    const scenes = document.querySelectorAll(".service-scene");

    if (!scenes.length) return;

    const observer = new IntersectionObserver(

        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("scene-active");

                } else {

                    entry.target.classList.remove("scene-active");

                }

            });

        },

        {

            threshold: 0,

            rootMargin: "0px 0px -5% 0px"

        }

    );

    scenes.forEach(scene => observer.observe(scene));

}

/* ============================================================
   ACTIVE NAVIGATION
   ============================================================ */

function updateActiveNavigation() {

    if (!sections.length || !menuLinks.length) return;

    const scrollPosition = window.scrollY + (header?.offsetHeight ?? 0) + 1;

    let currentSection = sections[0];

    sections.forEach((section) => {
        if (section.offsetTop <= scrollPosition) {
            currentSection = section;
        }
    });

    menuLinks.forEach((link) => {
        const hash = link.getAttribute("href");
        const isActive = hash === `#${currentSection.id}`;

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

}

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */

function smoothScroll() {

    menuLinks.forEach((link) => {

        const hash = link.getAttribute("href");

        if (!hash || !hash.startsWith("#")) return;

        link.addEventListener("click", (event) => {

            const target = document.querySelector(hash);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });

            // Close mobile menu (if open) after navigating
            closeMenu();

        });

    });

}

/* ============================================================
   UTILITIES
   ============================================================ */

function debounce(fn, delay = 200) {

    let timeoutId;

    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };

}

function throttle(fn, delay = 150) {

    let lastCall = 0;
    let timeoutId;

    return function throttled(...args) {

        const now = Date.now();
        const remaining = delay - (now - lastCall);

        if (remaining <= 0) {
            clearTimeout(timeoutId);
            lastCall = now;
            fn.apply(this, args);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                fn.apply(this, args);
            }, remaining);
        }

    };

}

/* ============================================================
   SERVICES SCROLL ANIMATION FALLBACK
   Para navegadores que no soportan CSS Scroll-Driven Animations
   ============================================================ */

function initServicesScrollFallback() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Si el navegador soporta CSS animation-timeline nativo, el CSS se encarga
    if (window.CSS && CSS.supports && CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
        return;
    }

    const scenes = document.querySelectorAll(".service-scene");
    if (!scenes.length) return;

    // Desactivar la transición CSS estática para controlar transform y opacity vía scroll
    scenes.forEach(scene => {
        scene.style.transition = "none";
        scene.style.willChange = "transform, opacity";
    });

    function updateServiceCards() {
        const vh = window.innerHeight;

        scenes.forEach((scene) => {
            const rect = scene.getBoundingClientRect();

            // Fuera de pantalla completamente
            if (rect.bottom <= 0 || rect.top >= vh) {
                scene.style.transform = "scale(0.8)";
                scene.style.opacity = "0.2";
                return;
            }

            let progress = 1;
            const entryDistance = Math.min(rect.height, vh * 0.6);

            // Entrada por abajo
            if (rect.top > vh - entryDistance) {
                const distIntoView = vh - rect.top;
                progress = Math.max(0, Math.min(1, distIntoView / entryDistance));
            }
            // Salida por arriba
            else if (rect.bottom < entryDistance) {
                progress = Math.max(0, Math.min(1, rect.bottom / entryDistance));
            }

            const scale = 0.8 + (0.2 * progress);
            const opacity = 0.2 + (0.8 * progress);

            scene.style.transform = `scale(${scale.toFixed(3)})`;
            scene.style.opacity = opacity.toFixed(3);
        });
    }

    let ticking = false;
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateServiceCards();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateServiceCards, { passive: true });
    updateServiceCards();
}

/* ============================================================
   CINEMATIC CAMERA CONTROLLER (PLANO SECUENCIA CONTINUO)
   ============================================================ */

function initCinematicCameraTrack() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const heroContent = document.querySelector(".hero-content");
    const heroTriangleWrapper = document.querySelector(".hero-triangle-wrapper");
    
    const serviceScenes = document.querySelectorAll(".service-scene");
    
    const aboutSection = document.querySelector("#about");
    const plasmaMass = document.querySelector(".plasma-mass");
    const plasmaGlow = document.querySelector(".about-glow");

    let currentScroll = window.scrollY;
    let targetScroll = window.scrollY;
    let isTicking = false;

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    function onRenderFrame() {
        currentScroll = lerp(currentScroll, targetScroll, 0.12);
        const vh = window.innerHeight || 800;

        // 1. HERO DEPARTURE & PARALLAX
        if (heroContent && currentScroll < vh * 1.4) {
            const progress = currentScroll / vh;
            heroContent.style.transform = `translate3d(0, ${(currentScroll * 0.16).toFixed(1)}px, 0) scale(${Math.max(0.95, 1 - progress * 0.05).toFixed(3)})`;
            heroContent.style.opacity = Math.max(0, 1 - progress * 1.15).toFixed(3);

            if (heroTriangleWrapper) {
                heroTriangleWrapper.style.transform = `translate(-50%, calc(-50% + ${(currentScroll * 0.08).toFixed(1)}px))`;
            }
        }

        // 2. SERVICES CINEMATIC STAGE FOCUS & PINNING
        serviceScenes.forEach((scene) => {
            const rect = scene.getBoundingClientRect();
            // Se activa en cuanto la sección entra por abajo (a menos del 90% del viewport) y se mantiene visible mientras esté en pantalla
            if (rect.top < vh * 0.88 && rect.bottom > vh * 0.12) {
                scene.classList.add("scene-active");
            } else {
                scene.classList.remove("scene-active");
            }
        });

        // 3. ABOUT PLASMA REACTOR REACTION
        if (aboutSection && plasmaMass) {
            const rect = aboutSection.getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) {
                const enterProgress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
                const scale = 1 + enterProgress * 0.07;
                const glowOpacity = 0.35 + enterProgress * 0.65;

                plasmaMass.style.transform = `scale(${scale.toFixed(3)})`;
                if (plasmaGlow) {
                    plasmaGlow.style.opacity = glowOpacity.toFixed(2);
                }
            }
        }

        if (Math.abs(targetScroll - currentScroll) > 0.1) {
            requestAnimationFrame(onRenderFrame);
        } else {
            isTicking = false;
        }
    }

    function requestRender() {
        targetScroll = window.scrollY;
        if (!isTicking) {
            isTicking = true;
            requestAnimationFrame(onRenderFrame);
        }
    }

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    requestRender();
}

/* ============================================================
   GLOBAL WEBGL ATMOSPHERE SIMULATION
   Simulación de fluido/plasma cuántico continuo para todo el sitio
   ============================================================ */

function initGlobalFluidSimulation() {
    const canvas = document.getElementById("global-fluid-canvas");
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    // Shaders: Vertex & Fragment (Domain-warping liquid plasma + Scroll Parallax)
    const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            v_uv.y = 1.0 - v_uv.y;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fsSource = `
        precision highp float;
        varying vec2 v_uv;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_time;
        uniform float u_scroll;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                               -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            for (int i = 0; i < 4; i++) {
                value += amplitude * snoise(p * frequency);
                frequency *= 2.05;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            st.x *= u_resolution.x / u_resolution.y;

            // Incorporate scroll displacement for continuous depth evolution
            st.y += u_scroll * 0.15;

            vec2 mouse = u_mouse / u_resolution.xy;
            mouse.x *= u_resolution.x / u_resolution.y;

            float dist = distance(st, mouse);
            float mouseForce = smoothstep(0.48, 0.0, dist) * 0.45;

            float t = u_time * 0.06;
            
            vec2 q = vec2(0.0);
            q.x = fbm(st + vec2(t * 0.3, t * 0.15));
            q.y = fbm(st + vec2(0.25, t * 0.4));

            vec2 mouseOffset = (st - mouse) * mouseForce;
            vec2 r = vec2(0.0);
            r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.12 * t + mouseOffset * 2.0);
            r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.1 * t - mouseOffset * 2.0);

            float f = fbm(st + r * 1.5 + mouseOffset * 2.8);

            // Strict Brand Palette Mapping: #050505, #3264d2, #3296ff
            vec3 bgColor = vec3(0.02, 0.02, 0.02);
            vec3 deepBlue = vec3(0.196, 0.392, 0.824);
            vec3 lightBlue = vec3(0.196, 0.588, 1.0);

            vec3 color = mix(bgColor, deepBlue, clamp(f * f * 2.6, 0.0, 1.0));
            color = mix(color, lightBlue, clamp(length(q) * 0.6 + mouseForce * 0.8, 0.0, 1.0));

            vec2 uvCenter = v_uv - vec2(0.5);
            float vignette = smoothstep(0.9, 0.1, length(uvCenter));
            color *= (0.3 + 0.7 * vignette);

            float alpha = clamp((f * 0.75 + mouseForce * 0.45) * vignette, 0.05, 0.85);

            gl_FragColor = vec4(color, alpha);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile error:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const mouseLoc = gl.getUniformLocation(program, "u_mouse");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const scrollLoc = gl.getUniformLocation(program, "u_scroll");

    let mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    let targetMouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    let scrollY = 0;

    function onPointerMove(e) {
        const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        if (x !== null && y !== null) {
            targetMouse.x = x;
            targetMouse.y = y;
        }
    }

    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });

    let width = 0;
    let height = 0;

    function resizeCanvas() {
        const isMobile = window.innerWidth <= 768;
        const dpr = isMobile ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5);
        
        width = Math.floor(window.innerWidth * dpr);
        height = Math.floor(window.innerHeight * dpr);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
        }
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();

    let startTime = performance.now();

    function render(now) {
        const currentTime = ((now || performance.now()) - startTime) * 0.001;

        // Smooth mouse lerp
        mouse.x += (targetMouse.x - mouse.x) * 0.08;
        mouse.y += (targetMouse.y - mouse.y) * 0.08;

        // Smooth scroll progress
        scrollY = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        gl.uniform2f(mouseLoc, mouse.x * (canvas.width / window.innerWidth), (window.innerHeight - mouse.y) * (canvas.height / window.innerHeight));
        gl.uniform1f(timeLoc, currentTime);
        gl.uniform1f(scrollLoc, scrollY);

        gl.clearColor(0.02, 0.02, 0.02, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    render();
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeSite() {

    // Run once on load so state is correct before the first scroll event
    handleHeaderScroll();
    updateActiveNavigation();

    // Attach a single throttled scroll listener (no re-registration bugs)
    const onScroll = throttle(() => {
        handleHeaderScroll();
        updateActiveNavigation();
    }, SCROLL_THROTTLE_MS);

    window.addEventListener("scroll", onScroll);

    // Mobile nav (safe no-op if the toggle button doesn't exist yet)
    if (menuToggle) {
        menuToggle.addEventListener("click", toggleMenu);
    }
    createRevealObserver();
    createServicesObserver();
    initCinematicCameraTrack();
    initGlobalFluidSimulation();
    smoothScroll();
    initProjectPanel();

}

initializeSite();

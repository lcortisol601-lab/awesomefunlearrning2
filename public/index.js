"use strict";

/* ============================================
   NOZIS — Frontend Logic
   Particle mesh background + Proxy controller
   ============================================ */

// --- DOM References ---
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const errorEl = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const errorContainer = document.getElementById("uv-error-container");
const frame = document.getElementById("uv-frame");
const landing = document.getElementById("landing");
const uvNav = document.getElementById("uv-nav");
const uvNavUrl = document.getElementById("uv-nav-url");
const canvas = document.getElementById("bg-canvas");

// --- BareMux Connection ---
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// ======================
// PARTICLE MESH BACKGROUND
// ======================
(function initParticles() {
	const ctx = canvas.getContext("2d");
	let width, height;
	const particles = [];
	const PARTICLE_COUNT = 80;
	const CONNECT_DIST = 150;
	const MOUSE_DIST = 200;
	let mouseX = -9999, mouseY = -9999;

	function resize() {
		width = canvas.width = window.innerWidth;
		height = canvas.height = window.innerHeight;
	}
	resize();
	window.addEventListener("resize", resize);

	document.addEventListener("mousemove", (e) => {
		mouseX = e.clientX;
		mouseY = e.clientY;
	});
	document.addEventListener("mouseleave", () => {
		mouseX = -9999;
		mouseY = -9999;
	});

	// Create particles
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		particles.push({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * 0.6,
			vy: (Math.random() - 0.5) * 0.6,
			r: Math.random() * 1.8 + 0.5,
		});
	}

	function draw() {
		ctx.clearRect(0, 0, width, height);

		// Update & draw particles
		for (const p of particles) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < 0) p.x = width;
			if (p.x > width) p.x = 0;
			if (p.y < 0) p.y = height;
			if (p.y > height) p.y = 0;

			// Glow near mouse
			const dm = Math.hypot(p.x - mouseX, p.y - mouseY);
			const alpha = dm < MOUSE_DIST ? 0.6 + 0.4 * (1 - dm / MOUSE_DIST) : 0.3;

			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
			ctx.fill();
		}

		// Draw connections
		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const dx = particles[i].x - particles[j].x;
				const dy = particles[i].y - particles[j].y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < CONNECT_DIST) {
					const opacity = (1 - dist / CONNECT_DIST) * 0.15;
					ctx.beginPath();
					ctx.moveTo(particles[i].x, particles[i].y);
					ctx.lineTo(particles[j].x, particles[j].y);
					ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
					ctx.lineWidth = 0.6;
					ctx.stroke();
				}
			}
		}

		// Draw mouse connections
		for (const p of particles) {
			const dm = Math.hypot(p.x - mouseX, p.y - mouseY);
			if (dm < MOUSE_DIST) {
				const opacity = (1 - dm / MOUSE_DIST) * 0.25;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(mouseX, mouseY);
				ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
				ctx.lineWidth = 0.8;
				ctx.stroke();
			}
		}

		requestAnimationFrame(draw);
	}
	draw();
})();

// ======================
// PROXY LOGIC
// ======================

async function launchProxy(url) {
	errorContainer.classList.add("hidden");

	try {
		await registerSW();
	} catch (err) {
		showError("Failed to register service worker.", err);
		throw err;
	}

	// Wisp server URL — override via window.WISP_URL if using an external server.
	// Default: same-origin (works for self-hosted / local dev).
	const wispUrl = window.WISP_URL ||
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" + location.host + "/wisp/";

	try {
		if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
			await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
		}
	} catch (err) {
		showError("Failed to set transport.", err);
		throw err;
	}

	const encodedUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

	// Show proxy UI
	frame.src = encodedUrl;
	frame.style.display = "block";
	landing.classList.add("hidden");
	uvNav.classList.remove("hidden");

	// Update nav URL display
	try {
		const parsed = new URL(url);
		uvNavUrl.textContent = parsed.hostname;
	} catch {
		uvNavUrl.textContent = url;
	}
}

function showError(message, err) {
	errorContainer.classList.remove("hidden");
	errorEl.textContent = message;
	errorCode.textContent = err ? err.toString() : "";
}

function closeProxy() {
	frame.src = "about:blank";
	frame.style.display = "none";
	landing.classList.remove("hidden");
	uvNav.classList.add("hidden");
	uvNavUrl.textContent = "";
	address.value = "";
	address.focus();
}

// --- Form Submit ---
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const url = search(address.value, searchEngine.value);
	await launchProxy(url);
});

// --- Quick Links ---
document.querySelectorAll(".quick-link").forEach((btn) => {
	btn.addEventListener("click", async () => {
		const url = btn.dataset.url;
		if (url) {
			address.value = url;
			await launchProxy(url);
		}
	});
});

// --- Nav Controls ---
document.getElementById("uv-nav-back")?.addEventListener("click", () => {
	try { frame.contentWindow?.history.back(); } catch {}
});

document.getElementById("uv-nav-forward")?.addEventListener("click", () => {
	try { frame.contentWindow?.history.forward(); } catch {}
});

document.getElementById("uv-nav-reload")?.addEventListener("click", () => {
	try { frame.contentWindow?.location.reload(); } catch {}
});

document.getElementById("uv-nav-close")?.addEventListener("click", closeProxy);

// --- Keyboard Shortcut: Escape to close proxy ---
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && frame.style.display === "block") {
		closeProxy();
	}
});

// --- Tab Cloaking (optional: press Ctrl+Shift+C to cloak as Google Docs) ---
let cloaked = false;
const originalTitle = document.title;
const originalFavicon = getFavicon();

document.addEventListener("keydown", (e) => {
	if (e.ctrlKey && e.shiftKey && e.key === "C") {
		e.preventDefault();
		if (!cloaked) {
			document.title = "Google Docs";
			setFavicon("https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico");
			cloaked = true;
		} else {
			document.title = originalTitle;
			setFavicon(originalFavicon);
			cloaked = false;
		}
	}
});

function getFavicon() {
	const link = document.querySelector("link[rel*='icon']");
	return link ? link.href : "";
}

function setFavicon(url) {
	let link = document.querySelector("link[rel*='icon']");
	if (!link) {
		link = document.createElement("link");
		link.rel = "icon";
		document.head.appendChild(link);
	}
	link.href = url;
}

// --- Focus input on load ---
window.addEventListener("load", () => {
	address.focus();
});

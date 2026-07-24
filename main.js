document.getElementById("year").textContent = new Date().getFullYear();

// ---------- PWA install ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.error("SW registration failed:", err));
  });
}

const installBtn = document.getElementById("install-btn");
let deferredInstallPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

if (!isStandalone()) {
  if (isIos) {
    // iOS Safari has no beforeinstallprompt — show the button with manual instructions instead.
    installBtn.style.display = "inline-flex";
    installBtn.addEventListener("click", () => {
      alert("To install: tap the Share icon, then \"Add to Home Screen\".");
    });
  } else {
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.style.display = "inline-flex";
    });

    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.style.display = "none";
    });

    window.addEventListener("appinstalled", () => {
      installBtn.style.display = "none";
    });
  }
}

// ---------- Footer contact links ----------
document.getElementById("footer-whatsapp").href = `https://wa.me/${BUSINESS.whatsapp}`;
document.getElementById("footer-email").href = `mailto:${BUSINESS.email}`;
document.getElementById("footer-facebook").href = BUSINESS.facebook;
document.getElementById("footer-instagram").href = BUSINESS.instagram;

const grid = document.getElementById("listings-grid");
const countEl = document.getElementById("listing-count");

let currentListing = null;

async function loadListings() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=listings`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error || "Failed to load listings");

    if (data.listings.length === 0) {
      grid.innerHTML = `<div class="empty-state">No land listed yet. Check back soon.</div>`;
      countEl.textContent = "";
      return;
    }

    countEl.textContent = `${data.listings.length} plot${data.listings.length === 1 ? "" : "s"} available`;
    grid.innerHTML = data.listings.map(cardHtml).join("");

    // wire up thumbnail switching + enquire buttons
    data.listings.forEach(listing => {
      const cardImg = document.querySelector(`[data-image-for="${listing.id}"] img`);
      document.querySelectorAll(`[data-thumb-for="${listing.id}"]`).forEach((btn, i) => {
        btn.addEventListener("click", () => {
          cardImg.src = listing.images[i];
          document.querySelectorAll(`[data-thumb-for="${listing.id}"]`).forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });

      const enquireBtn = document.querySelector(`[data-enquire-for="${listing.id}"]`);
      if (enquireBtn) {
        enquireBtn.addEventListener("click", () => openEnquiryModal(listing));
      }
    });

  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load listings right now. Please refresh, or check back shortly.</div>`;
    console.error(err);
  }
}

function cardHtml(listing) {
  const images = listing.images.length ? listing.images : ["https://placehold.co/600x450?text=No+Image"];
  const thumbs = images.length > 1
    ? `<div class="thumbs">${images.map((_, i) => `<button data-thumb-for="${listing.id}" class="${i === 0 ? "active" : ""}"></button>`).join("")}</div>`
    : "";

  const whatsappLink = listing.whatsapp
    ? `https://wa.me/${String(listing.whatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${listing.title}"`)}`
    : null;

  return `
    <article class="card">
      <div class="card-image" data-image-for="${listing.id}">
        <img src="${images[0]}" alt="${escapeHtml(listing.title)}" loading="lazy">
        ${thumbs}
      </div>
      <div class="card-body">
        <div class="card-location">${escapeHtml(listing.location || "")}</div>
        <h3>${escapeHtml(listing.title || "")}</h3>
        ${listing.price ? `<div class="card-price mono">${escapeHtml(String(listing.price))}</div>` : ""}
        <p class="card-desc">${escapeHtml(listing.description || "")}</p>
        <div class="card-contacts">
          ${whatsappLink ? `<a class="icon-btn whatsapp" href="${whatsappLink}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <button class="icon-btn enquire" data-enquire-for="${listing.id}">Enquire</button>
          ${listing.facebook ? `<a class="icon-btn social" href="${listing.facebook}" target="_blank" rel="noopener">Facebook</a>` : ""}
          ${listing.instagram ? `<a class="icon-btn social" href="${listing.instagram}" target="_blank" rel="noopener">Instagram</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Enquiry modal ----------

const overlay = document.getElementById("enquiry-overlay");
const form = document.getElementById("enquiry-form");
const feedback = document.getElementById("enquiry-feedback");
const submitBtn = document.getElementById("enquiry-submit");

function openEnquiryModal(listing) {
  currentListing = listing;
  document.getElementById("enquiry-listing-name").textContent = listing.title;
  feedback.innerHTML = "";
  form.reset();
  form.style.display = "block";
  overlay.classList.add("open");
}

function closeEnquiryModal() {
  overlay.classList.remove("open");
}

document.getElementById("enquiry-close").addEventListener("click", closeEnquiryModal);
overlay.addEventListener("click", e => { if (e.target === overlay) closeEnquiryModal(); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({
        action: "submitEnquiry",
        listingId: currentListing.id,
        listingTitle: currentListing.title,
        name: document.getElementById("enquiry-name").value,
        email: document.getElementById("enquiry-email").value,
        message: document.getElementById("enquiry-message").value
      })
    });
    const data = await res.json();

    if (data.success) {
      feedback.innerHTML = `<div class="form-success">Sent! Check your email for confirmation — Peter will be in touch soon.</div>`;
      form.style.display = "none";
    } else {
      feedback.innerHTML = `<div class="form-error">${escapeHtml(data.error || "Something went wrong. Please try again.")}</div>`;
    }
  } catch (err) {
    feedback.innerHTML = `<div class="form-error">Couldn't send your enquiry. Please try WhatsApp instead, or try again shortly.</div>`;
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Enquiry";
  }
});

loadListings();

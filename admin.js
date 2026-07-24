const loginScreen = document.getElementById("login-screen");
const adminShell = document.getElementById("admin-shell");
const loginForm = document.getElementById("login-form");
const loginFeedback = document.getElementById("login-feedback");
const loginSubmit = document.getElementById("login-submit");

function getStoredPassword() {
  return sessionStorage.getItem("adminPassword");
}

function showAdmin() {
  loginScreen.style.display = "none";
  adminShell.style.display = "block";
  loadEnquiries();
}

// Auto-login if already verified this session
if (getStoredPassword()) {
  showAdmin();
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Checking…";
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", password })
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem("adminPassword", password);
      showAdmin();
    } else {
      loginFeedback.innerHTML = `<div class="form-error">Incorrect password. Try again.</div>`;
    }
  } catch (err) {
    loginFeedback.innerHTML = `<div class="form-error">Couldn't reach the server. Check your connection and the Apps Script URL in config.js.</div>`;
    console.error(err);
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Log In";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("adminPassword");
  location.reload();
});

// ---------- Tabs ----------

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Image selection ----------

const MAX_IMAGES = 10;
let selectedFiles = [];

const imageDrop = document.getElementById("image-drop");
const imageInput = document.getElementById("l-images");
const imagePreview = document.getElementById("image-preview");
const imageCount = document.getElementById("image-count");

imageDrop.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  addFiles(Array.from(imageInput.files));
  imageInput.value = "";
});

imageDrop.addEventListener("dragover", e => { e.preventDefault(); imageDrop.style.background = "var(--parchment-dim)"; });
imageDrop.addEventListener("dragleave", () => { imageDrop.style.background = ""; });
imageDrop.addEventListener("drop", e => {
  e.preventDefault();
  imageDrop.style.background = "";
  addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")));
});

function addFiles(files) {
  const room = MAX_IMAGES - selectedFiles.length;
  if (room <= 0) {
    alert("Maximum of 10 images allowed.");
    return;
  }
  selectedFiles = selectedFiles.concat(files.slice(0, room));
  renderImagePreviews();
}

function renderImagePreviews() {
  imagePreview.innerHTML = "";
  selectedFiles.forEach((file, i) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.title = "Click to remove";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => {
      selectedFiles.splice(i, 1);
      renderImagePreviews();
    });
    imagePreview.appendChild(img);
  });
  imageCount.textContent = `${selectedFiles.length} / ${MAX_IMAGES} selected`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Add listing submit ----------

const listingForm = document.getElementById("listing-form");
const listingFeedback = document.getElementById("listing-feedback");
const listingSubmit = document.getElementById("listing-submit");

listingForm.addEventListener("submit", async e => {
  e.preventDefault();
  listingSubmit.disabled = true;
  listingSubmit.textContent = "Uploading…";
  listingFeedback.innerHTML = "";

  try {
    const images = await Promise.all(selectedFiles.map(async file => ({
      name: file.name,
      mimeType: file.type,
      base64: await fileToBase64(file)
    })));

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addListing",
        password: getStoredPassword(),
        title: document.getElementById("l-title").value,
        location: document.getElementById("l-location").value,
        price: document.getElementById("l-price").value,
        description: document.getElementById("l-description").value,
        whatsapp: document.getElementById("l-whatsapp").value,
        email: document.getElementById("l-email").value,
        facebook: document.getElementById("l-facebook").value,
        instagram: document.getElementById("l-instagram").value,
        images
      })
    });
    const data = await res.json();

    if (data.success) {
      listingFeedback.innerHTML = `<div class="form-success">Listing added — it's now live on the homepage.</div>`;
      listingForm.reset();
      selectedFiles = [];
      renderImagePreviews();
    } else {
      listingFeedback.innerHTML = `<div class="form-error">${data.error || "Something went wrong."}</div>`;
    }
  } catch (err) {
    listingFeedback.innerHTML = `<div class="form-error">Upload failed. Check your connection and try again.</div>`;
    console.error(err);
  } finally {
    listingSubmit.disabled = false;
    listingSubmit.textContent = "Add Listing";
  }
});

// ---------- Enquiries ----------

async function loadEnquiries() {
  const content = document.getElementById("enquiries-content");
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=enquiries&password=${encodeURIComponent(getStoredPassword())}`);
    const data = await res.json();

    if (!data.success) {
      content.innerHTML = `<div class="form-error">${data.error || "Couldn't load enquiries."}</div>`;
      return;
    }

    if (data.enquiries.length === 0) {
      content.innerHTML = `<p style="color:var(--slate);">No enquiries yet.</p>`;
      document.getElementById("enquiry-badge").textContent = "";
      return;
    }

    const newCount = data.enquiries.filter(e => e.Status === "New").length;
    document.getElementById("enquiry-badge").textContent = newCount ? `(${newCount})` : "";

    content.innerHTML = `
      <table>
        <thead><tr><th>Date</th><th>Listing</th><th>From</th><th>Message</th><th>Status</th></tr></thead>
        <tbody>
          ${data.enquiries.map(en => `
            <tr>
              <td>${new Date(en.Date).toLocaleDateString()}</td>
              <td>${escapeHtml(en.ListingTitle || "")}</td>
              <td>${escapeHtml(en.Name || "")}<br><span style="color:var(--slate)">${escapeHtml(en.Email || "")}</span></td>
              <td>${escapeHtml(en.Message || "")}</td>
              <td class="${en.Status === "New" ? "status-new" : ""}">${escapeHtml(en.Status || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    content.innerHTML = `<div class="form-error">Couldn't load enquiries. Check your connection.</div>`;
    console.error(err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

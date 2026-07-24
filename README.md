# Peter Siraa Land — Website Setup Guide

This guide gets the whole site live: Google Sheet (database) → Google Apps
Script (backend/API) → Google Drive (image storage) → GitHub Pages (the
website itself).

Do the steps **in order** — later steps need values produced by earlier ones.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) (signed in as `siraapeter37@gmail.com`) and create a new blank spreadsheet.
2. Name it `Peter Siraa Land - Database`.
3. Leave it empty — you'll set it up with a script in the next step instead of doing it by hand.

## Step 2 — Add the scripts and run setup

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete the placeholder code in the default `Code.gs` file and paste in the contents of `Code.gs` (provided).
3. Add a second file: click the **+** next to "Files" → **Script** → name it `setup` → paste in the contents of `setup.gs` (provided).
4. In the toolbar, use the function dropdown (next to the "Debug" button) to select **setupProject**, then click **Run**.
5. The first time, Google will ask you to authorize the script — click through the "unsafe" warning since it's your own script (this is expected for scripts you haven't published).
6. A popup will confirm setup is done and show you a **Drive Folder ID** — copy it.
7. Back in `Code.gs`, paste that ID into `CONFIG.DRIVE_FOLDER_ID`.
8. You can now delete the `setup` file (or leave it — it won't run again on its own).

This creates the `Listings` and `Enquiries` tabs with the correct headers, and a `Peter Siraa Land - Images` folder in Drive for image uploads.

## Step 3 — Deploy the backend as a web app

1. Still in the Apps Script editor, finish filling in the `CONFIG` block at the top of `Code.gs`:
   - `ADMIN_PASSWORD` — replace `"peter"` with a stronger password before going live
   - `ADMIN_EMAIL` — already set to `siraapeter37@gmail.com`
   - `DRIVE_FOLDER_ID` — pasted in from Step 2
2. Click **Deploy → New deployment**.
3. Click the gear icon next to "Select type" and choose **Web app**.
4. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**. Since you already authorized the script in Step 2, this should go straight through.
6. Copy the **Web app URL** it gives you — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

Keep that URL — you'll need it in Step 5.

## Step 4 — Push the website to GitHub

1. Create a new **GitHub repository**, e.g. `peter-siraa-land`.
2. Upload **all the provided files directly into the root** of that repo — `index.html`, `admin.html`, `config.js`, `main.js`, `admin.js`, `manifest.json`, `sw.js`, and the icon `.png` files. Everything sits flat in one folder — no subfolders needed. (`Code.gs` and `setup.gs` go into Apps Script, not GitHub — see Step 2.)
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Save. GitHub will give you a live URL like:
   `https://yourusername.github.io/peter-siraa-land/`

## Step 5 — Connect the website to the backend

1. In your GitHub repo, open `config.js`.
2. Replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with the Web app URL from Step 3.
3. Update the `BUSINESS` details in the same file (WhatsApp number, socials).
4. Commit the change. GitHub Pages updates automatically within a minute or two.

## Step 6 — Test it

1. Visit your GitHub Pages URL — the homepage should load (it'll say "No land listed yet" until you add one).
2. Go to `/admin.html`, log in with your admin password.
3. Add a test listing with a couple of images.
4. Refresh the homepage — it should appear.
5. Click **Enquire** on it, submit a test message with your own email — you should get the auto-reply, and Peter's inbox should get the lead. It should also show up under the **Enquiries** tab in `/admin.html`.

---

### Notes & limits
- Max 10 images per listing is enforced both in the admin form and the backend.
- The admin password is checked on the backend (Apps Script), not just in the browser, so it can't be read from the page source.
- If anything shows a blank homepage or an error, the most common cause is the Apps Script URL in `config.js` not being set yet, or the Apps Script deployment being set to a different access level than "Anyone".
- Whenever you edit `Code.gs`, you need to click **Deploy → Manage deployments → Edit → New version** for changes to go live (saving alone isn't enough).

### Installable app (PWA)
The homepage now has an **Install App** button, so visitors on Android/desktop Chrome can add it to their home screen/app list like a real app (no app store needed). On iPhone, Safari doesn't support that prompt, so the button instead shows instructions ("tap Share → Add to Home Screen").

- `manifest.json` and `sw.js` (service worker) power this — both need to be uploaded to GitHub alongside everything else.
- A placeholder navy-and-brass "PS" logo I generated to match the site's design is included as `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, and `favicon.png`. Swap these out any time with your real logo:
  - Replace `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, and `favicon.png` — keep the same filenames and pixel sizes (the number in each name) and everything will just work.
  - The maskable icon should have extra padding around the logo (about 20% margin) since Android crops it into different shapes.
- **Important:** PWA installability requires the site to be served over **HTTPS** — GitHub Pages does this automatically, so no extra setup needed there.
- If you update any file listed in `sw.js`'s `APP_SHELL` array, bump `CACHE_NAME` (e.g. `siraa-land-v2`) so visitors who already installed the app actually get the update instead of a stale cached version.

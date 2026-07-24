/**
 * PETER SIRAA LAND SALES — BACKEND
 * ---------------------------------
 * This script runs inside a Google Sheet (Extensions > Apps Script) and
 * powers the whole website: it stores listings, stores enquiries, uploads
 * images to Drive, and sends emails.
 *
 * SETUP: fill in the four values below, then follow SETUP_GUIDE.md.
 */

const CONFIG = {
  ADMIN_PASSWORD: "peter",                 // change this before going live
  ADMIN_EMAIL: "siraapeter37@gmail.com",   // where new enquiries get sent
  DRIVE_FOLDER_ID: "PASTE_YOUR_DRIVE_FOLDER_ID_HERE",
  BUSINESS_NAME: "Peter Siraa Land"
};

const LISTINGS_SHEET_NAME = "Listings";
const ENQUIRIES_SHEET_NAME = "Enquiries";

const LISTINGS_HEADERS = [
  "ID", "Title", "Location", "Description", "Price",
  "WhatsApp", "Email", "Facebook", "Instagram", "ImageURLs", "DateAdded"
];

const ENQUIRIES_HEADERS = [
  "ID", "ListingID", "ListingTitle", "Name", "Email", "Message", "Date", "Status"
];

// ---------- Sheet helpers ----------

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ---------- Entry points ----------

function doGet(e) {
  const action = e.parameter.action;

  if (action === "listings") {
    const sheet = getSheet_(LISTINGS_SHEET_NAME, LISTINGS_HEADERS);
    const listings = sheetToObjects_(sheet).map(row => ({
      id: row.ID,
      title: row.Title,
      location: row.Location,
      description: row.Description,
      price: row.Price,
      whatsapp: row.WhatsApp,
      email: row.Email,
      facebook: row.Facebook,
      instagram: row.Instagram,
      images: row.ImageURLs ? String(row.ImageURLs).split(",").filter(Boolean) : [],
      dateAdded: row.DateAdded
    })).reverse(); // newest first
    return jsonOutput_({ success: true, listings });
  }

  if (action === "enquiries") {
    if (e.parameter.password !== CONFIG.ADMIN_PASSWORD) {
      return jsonOutput_({ success: false, error: "Unauthorized" });
    }
    const sheet = getSheet_(ENQUIRIES_SHEET_NAME, ENQUIRIES_HEADERS);
    const enquiries = sheetToObjects_(sheet).reverse();
    return jsonOutput_({ success: true, enquiries });
  }

  return jsonOutput_({ success: false, error: "Unknown action" });
}

function doPost(e) {
  // Apps Script + fetch() from a browser: read raw body ourselves so we
  // avoid CORS preflight issues (frontend sends as text/plain).
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ success: false, error: "Invalid request body" });
  }

  const action = body.action;

  if (action === "login") {
    const ok = body.password === CONFIG.ADMIN_PASSWORD;
    return jsonOutput_({ success: ok, error: ok ? null : "Wrong password" });
  }

  if (action === "addListing") {
    return handleAddListing_(body);
  }

  if (action === "submitEnquiry") {
    return handleSubmitEnquiry_(body);
  }

  return jsonOutput_({ success: false, error: "Unknown action" });
}

// ---------- Add listing (admin) ----------

function handleAddListing_(body) {
  if (body.password !== CONFIG.ADMIN_PASSWORD) {
    return jsonOutput_({ success: false, error: "Unauthorized" });
  }

  const images = body.images || []; // [{name, mimeType, base64}]
  if (images.length > 10) {
    return jsonOutput_({ success: false, error: "Maximum 10 images allowed" });
  }

  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const imageUrls = images.map(img => {
    const bytes = Utilities.base64Decode(img.base64);
    const blob = Utilities.newBlob(bytes, img.mimeType, img.name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  });

  const sheet = getSheet_(LISTINGS_SHEET_NAME, LISTINGS_HEADERS);
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    body.title || "",
    body.location || "",
    body.description || "",
    body.price || "",
    body.whatsapp || "",
    body.email || "",
    body.facebook || "",
    body.instagram || "",
    imageUrls.join(","),
    new Date()
  ]);

  return jsonOutput_({ success: true, id, images: imageUrls });
}

// ---------- Enquiry (public) ----------

function handleSubmitEnquiry_(body) {
  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const message = (body.message || "").trim();
  const listingTitle = body.listingTitle || "a listing";
  const listingId = body.listingId || "";

  if (!name || !email || !message) {
    return jsonOutput_({ success: false, error: "Name, email and message are required" });
  }

  const sheet = getSheet_(ENQUIRIES_SHEET_NAME, ENQUIRIES_HEADERS);
  const id = Utilities.getUuid();
  sheet.appendRow([id, listingId, listingTitle, name, email, message, new Date(), "New"]);

  // Notify Peter
  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    subject: "New enquiry: " + listingTitle,
    body:
      "You have a new enquiry on " + CONFIG.BUSINESS_NAME + ".\n\n" +
      "Listing: " + listingTitle + "\n" +
      "From: " + name + " (" + email + ")\n\n" +
      "Message:\n" + message + "\n\n" +
      "Reply directly to this email to respond, or check the admin dashboard."
  });

  // Auto-reply to the enquirer
  MailApp.sendEmail({
    to: email,
    subject: "We've received your enquiry — " + CONFIG.BUSINESS_NAME,
    body:
      "Hi " + name + ",\n\n" +
      "Thanks for your interest in \"" + listingTitle + "\". " +
      "We've received your message and Peter will get back to you shortly.\n\n" +
      "Your message:\n\"" + message + "\"\n\n" +
      "If it's urgent, you're welcome to reach out directly on WhatsApp as well.\n\n" +
      "— " + CONFIG.BUSINESS_NAME
  });

  return jsonOutput_({ success: true });
}

// ---------- Utility ----------

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

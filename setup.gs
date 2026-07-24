/**
 * PETER SIRAA LAND — ONE-TIME SETUP
 * -----------------------------------
 * Run this once to set up the spreadsheet: it creates the "Listings" and
 * "Enquiries" tabs with the right headers/formatting, creates the Drive
 * folder for images, and prints the folder ID you need to paste into
 * Code.gs (CONFIG.DRIVE_FOLDER_ID).
 *
 * HOW TO RUN:
 * 1. Paste this file into the same Apps Script project as Code.gs
 *    (Extensions > Apps Script > + next to Files > Script > name it setup.gs)
 * 2. In the toolbar dropdown that lists functions, choose "setupProject"
 * 3. Click Run. The first time, approve the permissions Google asks for.
 * 4. A popup will show your new Drive Folder ID — copy it into
 *    CONFIG.DRIVE_FOLDER_ID at the top of Code.gs.
 * 5. You can delete this file afterwards — it's only needed once.
 */

const SETUP_DRIVE_FOLDER_NAME = "Peter Siraa Land - Images";

function setupProject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupListingsSheet_(ss);
  setupEnquiriesSheet_(ss);
  removeBlankDefaultSheet_(ss);
  const folderId = setupDriveFolder_();

  const message =
    "Setup complete!\n\n" +
    "• 'Listings' and 'Enquiries' tabs are ready.\n" +
    "• Drive folder created: " + SETUP_DRIVE_FOLDER_NAME + "\n\n" +
    "Drive Folder ID (paste this into CONFIG.DRIVE_FOLDER_ID in Code.gs):\n" +
    folderId;

  Logger.log(message);
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    // getUi() only works when run from the Sheet's menu/editor with a UI
    // context; if run from the script editor directly, the log still has it.
  }
}

// ---------- Listings tab ----------

function setupListingsSheet_(ss) {
  const headers = [
    "ID", "Title", "Location", "Description", "Price",
    "WhatsApp", "Email", "Facebook", "Instagram", "ImageURLs", "DateAdded"
  ];

  let sheet = ss.getSheetByName("Listings");
  if (!sheet) sheet = ss.insertSheet("Listings");

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow_(sheet, headers.length);
  sheet.setColumnWidths(1, 1, 220);   // ID
  sheet.setColumnWidth(2, 200);       // Title
  sheet.setColumnWidth(3, 200);       // Location
  sheet.setColumnWidth(4, 280);       // Description
  sheet.setColumnWidth(10, 320);      // ImageURLs
  sheet.setFrozenRows(1);
}

// ---------- Enquiries tab ----------

function setupEnquiriesSheet_(ss) {
  const headers = [
    "ID", "ListingID", "ListingTitle", "Name", "Email", "Message", "Date", "Status"
  ];

  let sheet = ss.getSheetByName("Enquiries");
  if (!sheet) sheet = ss.insertSheet("Enquiries");

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow_(sheet, headers.length);
  sheet.setColumnWidth(3, 200); // ListingTitle
  sheet.setColumnWidth(6, 300); // Message
  sheet.setFrozenRows(1);
}

// ---------- Helpers ----------

function formatHeaderRow_(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight("bold");
  range.setBackground("#1B2A3D");
  range.setFontColor("#F5F3EE");
}

function removeBlankDefaultSheet_(ss) {
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    const isEmpty = defaultSheet.getDataRange().getA1Notation() === "A1"
      && defaultSheet.getRange("A1").getValue() === "";
    if (isEmpty) ss.deleteSheet(defaultSheet);
  }
}

function setupDriveFolder_() {
  const existing = DriveApp.getFoldersByName(SETUP_DRIVE_FOLDER_NAME);
  if (existing.hasNext()) {
    return existing.next().getId();
  }
  const folder = DriveApp.createFolder(SETUP_DRIVE_FOLDER_NAME);
  return folder.getId();
}

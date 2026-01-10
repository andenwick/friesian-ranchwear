# How to Manage Products on Your Website

This guide explains how to add, edit, and remove products from your Friesian Ranchwear website using Google Sheets.

---

## Overview

Your website products are managed through a Google Sheet. When you update the sheet, your website updates automatically (within 1 hour, or immediately if you contact your developer).

**No coding required.** Just edit the spreadsheet like you would any other Google Sheet.

---

## Understanding the Products Sheet

Open your Google Sheet and click on the "Products" tab at the bottom.

You'll see a spreadsheet with these columns:

| Column | What It Means | Example |
|--------|---------------|---------|
| **name** | The product name shown on your website | Western Heritage Tee |
| **price** | The price shown (include the $ sign) | $45 |
| **color** | A background color for when images load (use hex codes) | #8B4513 |
| **imageUrl** | Where the product image is located | /products/tee.jpg |
| **active** | Should this product show on the website? | TRUE or FALSE |

**Important:**
- Row 1 contains the column headers. Do not edit or delete row 1.
- Your products start on row 2.

---

## How to Add a New Product

1. Go to the Products tab in your Google Sheet
2. Find the first empty row (below your existing products)
3. Fill in each column:

| Column | What to Enter |
|--------|---------------|
| A (name) | Type the product name |
| B (price) | Type the price with $ sign (example: $45) |
| C (color) | Type a color code (ask developer if unsure) |
| D (imageUrl) | Leave blank and contact developer to upload image |
| E (active) | Type TRUE (must be uppercase) |

4. Changes save automatically in Google Sheets
5. Your website will show the new product within 1 hour

**Need it live immediately?** Contact your developer to refresh the website cache.

---

## How to Edit a Product

1. Go to the Products tab
2. Find the row with the product you want to change
3. Click on the cell you want to edit
4. Make your change
5. Changes save automatically

**What you can change:**
- **Name:** Change the product name anytime
- **Price:** Update prices as needed (remember the $ sign)
- **Color:** Change the background color
- **Active:** Change TRUE to FALSE to hide, or FALSE to TRUE to show

**What you need developer help for:**
- Changing or adding product images (imageUrl column)

---

## How to Hide a Product (Temporarily)

If you want to hide a product but keep its information for later:

1. Find the product row
2. Go to column E (active)
3. Change TRUE to FALSE

The product will disappear from your website but all the information stays in the sheet. Change it back to TRUE anytime to show it again.

---

## How to Remove a Product (Permanently)

If you want to completely delete a product:

1. Find the product row
2. Right-click on the row number on the left
3. Select "Delete row"

**Warning:** This permanently deletes the product information. If you might want it back later, just set active to FALSE instead.

---

## Example Product Row

Here is a complete example of what a product row looks like:

| name | price | color | imageUrl | active |
|------|-------|-------|----------|--------|
| Western Heritage Tee | $45 | #8B4513 | /products/western-tee.jpg | TRUE |

**Column breakdown:**
- **name:** "Western Heritage Tee" - This is what customers see
- **price:** "$45" - Include the dollar sign
- **color:** "#8B4513" - This is a brown color (used as background while image loads)
- **imageUrl:** "/products/western-tee.jpg" - Your developer will set this up
- **active:** "TRUE" - The product is visible on the website

---

## About Product Images

You have two easy options for product images:

### Option 1: Google Drive (Easiest)

You can upload images to Google Drive and paste the share link directly!

**How to do it:**
1. Upload your product photo to Google Drive
2. Right-click the image → "Share" → "Anyone with the link" → "Viewer"
3. Click "Copy link"
4. Paste that link directly into the **imageUrl** column

**Example link that works:**
```
https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
```

The website automatically converts it to work as an image. No extra steps needed!

### Option 2: Developer Uploads
Send your product photos to your developer. They will:
1. Optimize the images for fast loading
2. Upload them to the website
3. Update the imageUrl in the sheet for you

**Tips for product photos:**
- Square images work best
- High quality but not too large (under 2MB)
- Good lighting and clear background
- Name your files clearly (e.g., "western-tee-black.jpg")

---

## When Do Changes Appear?

After you make changes in Google Sheets:

- **Normal:** Changes appear within 1 hour
- **Immediate:** Contact your developer to refresh the cache

The 1-hour delay helps your website load faster by not checking the spreadsheet every single time someone visits.

---

## Common Questions

**Q: I made a change but don't see it on the website?**
A: Wait up to 1 hour, or contact your developer to refresh immediately.

**Q: I accidentally deleted a product. Can I get it back?**
A: Check Google Sheets version history (File > Version history > See version history). You may be able to restore it.

**Q: How many products can I have?**
A: There's no strict limit, but for best performance, keep it under 50 products.

**Q: The product shows but the image is broken?**
A: The imageUrl might be wrong. Contact your developer to check the image path.

**Q: What's a hex color code?**
A: It's a code like #8B4513 that represents a color. Ask your developer for help, or use a website like https://htmlcolorcodes.com to pick one.

---

## Need Help?

Contact your developer if you:
- Need to add or change product images
- Want changes to appear immediately (cache refresh)
- See any errors or broken images on your website
- Want to make changes to how products are displayed

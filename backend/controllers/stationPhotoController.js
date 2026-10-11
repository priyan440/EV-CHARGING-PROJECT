import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { query, transaction } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsBaseDir = path.join(__dirname, "../uploads/stations");

if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// Helper: Check owner access for a station
const checkStationOwnership = async (stationId, user) => {
  const isNum = /^\d+$/.test(String(stationId));
  const numId = isNum ? parseInt(stationId, 10) : 0;
  const rows = await query(
    `SELECT id, station_id, owner_id, station_name, image FROM stations WHERE id = ? OR station_id = ?`,
    [numId, String(stationId)]
  );
  if (!rows || rows.length === 0) return null;

  const station = rows[0];
  const role = (user?.role || "").toUpperCase();
  if (role !== "ADMIN" && station.owner_id !== user.id) {
    return { unauthorized: true, station };
  }
  return { authorized: true, station };
};

/**
 * 1. GET ALL PHOTOS FOR A STATION
 * GET /api/stations/:stationId/photos or /api/owner/stations/:stationId/photos
 */
export const getStationPhotos = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user || { role: "ANONYMOUS" });
    if (!access) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    const photos = await query(
      `SELECT * FROM station_photos WHERE station_id = ? ORDER BY is_primary DESC, id ASC`,
      [access.station.id]
    );

    res.json({
      success: true,
      stationId: access.station.station_id,
      stationName: access.station.station_name,
      count: photos.length,
      data: photos.map((p) => ({
        id: p.id,
        photoId: p.photo_id,
        photo_id: p.photo_id,
        stationId: p.station_id,
        imageUrl: p.image_url,
        image_url: p.image_url,
        caption: p.caption,
        category: p.category,
        isPrimary: Boolean(p.is_primary),
        is_primary: Boolean(p.is_primary),
        fileSize: p.file_size,
        mimeType: p.mime_type,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error("getStationPhotos error:", error);
    res.status(500).json({ success: false, message: "Error fetching station photos.", error: error.message });
  }
};

/**
 * 2. UPLOAD SINGLE OR MULTIPLE STATION PHOTOS
 * POST /api/owner/stations/:stationId/photos
 * Body: { photos: [ { image: "data:image/jpeg;base64,...", caption: "...", category: "EXTERIOR", isPrimary: true } ] }
 * or single: { image: "...", caption: "...", category: "EXTERIOR", isPrimary: true }
 */
export const uploadStationPhotos = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized. You do not own this station." });

    const rawList = Array.isArray(req.body.photos)
      ? req.body.photos
      : req.body.image || req.body.imageUrl
      ? [req.body]
      : [];

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, message: "No image data provided. Provide base64 data URL or imageUrl." });
    }

    const insertedPhotos = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const imgPayload = item.image || item.imageUrl || item.dataUrl;
      const caption = item.caption || `Station Photo ${Date.now().toString().slice(-4)}`;
      const category = ["EXTERIOR", "CHARGING_BAY", "EQUIPMENT", "FACILITY", "OTHER"].includes((item.category || "").toUpperCase())
        ? (item.category || "").toUpperCase()
        : "EXTERIOR";
      const isPrimary = Boolean(item.isPrimary || item.is_primary || i === 0 && !access.station.image);

      let savedUrl = "";
      let mimeType = "image/jpeg";
      let fileSize = 0;
      const photoCode = `PHT${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

      if (imgPayload && imgPayload.startsWith("data:image/")) {
        const matches = imgPayload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ success: false, message: "Invalid base64 image format." });
        }

        mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        fileSize = buffer.length;

        // Max 10MB per image
        if (fileSize > 10 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: `Image exceeds 10MB limit (${(fileSize / (1024 * 1024)).toFixed(2)}MB).` });
        }

        const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const filename = `stn_${access.station.id}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
        const filePath = path.join(uploadsBaseDir, filename);

        fs.writeFileSync(filePath, buffer);
        savedUrl = `/uploads/stations/${filename}`;
      } else if (imgPayload && (imgPayload.startsWith("http://") || imgPayload.startsWith("https://") || imgPayload.startsWith("/uploads/"))) {
        savedUrl = imgPayload;
        fileSize = item.fileSize || 102400;
        mimeType = item.mimeType || "image/jpeg";
      } else {
        return res.status(400).json({ success: false, message: "Image must be a base64 Data URL or public HTTP image URL." });
      }

      await transaction(async (connection) => {
        if (isPrimary) {
          await connection.execute(`UPDATE station_photos SET is_primary = FALSE WHERE station_id = ?`, [access.station.id]);
          await connection.execute(`UPDATE stations SET image = ? WHERE id = ?`, [savedUrl, access.station.id]);
        }

        const [insertRes] = await connection.execute(
          `INSERT INTO station_photos (photo_id, station_id, image_url, caption, category, is_primary, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [photoCode, access.station.id, savedUrl, caption, category, isPrimary, fileSize, mimeType]
        );

        insertedPhotos.push({
          id: insertRes.insertId,
          photoId: photoCode,
          stationId: access.station.id,
          imageUrl: savedUrl,
          caption,
          category,
          isPrimary,
          fileSize,
          mimeType,
        });
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${insertedPhotos.length} photo(s) and persisted in MySQL.`,
      data: insertedPhotos,
    });
  } catch (error) {
    console.error("uploadStationPhotos error:", error);
    res.status(500).json({ success: false, message: "Failed to upload photo(s).", error: error.message });
  }
};

/**
 * 3. SET PHOTO AS PRIMARY
 * PUT /api/owner/stations/:stationId/photos/:photoId/primary
 */
export const setPrimaryPhoto = async (req, res) => {
  try {
    const { stationId, photoId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const isNum = /^\d+$/.test(String(photoId));
    const photoRows = await query(
      `SELECT * FROM station_photos WHERE (id = ? OR photo_id = ?) AND station_id = ?`,
      [isNum ? parseInt(photoId, 10) : 0, String(photoId), access.station.id]
    );

    if (!photoRows || photoRows.length === 0) {
      return res.status(404).json({ success: false, message: "Photo not found." });
    }

    const targetPhoto = photoRows[0];

    await transaction(async (connection) => {
      await connection.execute(`UPDATE station_photos SET is_primary = FALSE WHERE station_id = ?`, [access.station.id]);
      await connection.execute(`UPDATE station_photos SET is_primary = TRUE WHERE id = ?`, [targetPhoto.id]);
      await connection.execute(`UPDATE stations SET image = ? WHERE id = ?`, [targetPhoto.image_url, access.station.id]);
    });

    res.json({
      success: true,
      message: "Primary station photo updated successfully in MySQL.",
      data: {
        photoId: targetPhoto.photo_id,
        imageUrl: targetPhoto.image_url,
        isPrimary: true,
      },
    });
  } catch (error) {
    console.error("setPrimaryPhoto error:", error);
    res.status(500).json({ success: false, message: "Failed to set primary photo.", error: error.message });
  }
};

/**
 * 4. DELETE STATION PHOTO
 * DELETE /api/owner/stations/:stationId/photos/:photoId
 */
export const deleteStationPhoto = async (req, res) => {
  try {
    const { stationId, photoId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const isNum = /^\d+$/.test(String(photoId));
    const photoRows = await query(
      `SELECT * FROM station_photos WHERE (id = ? OR photo_id = ?) AND station_id = ?`,
      [isNum ? parseInt(photoId, 10) : 0, String(photoId), access.station.id]
    );

    if (!photoRows || photoRows.length === 0) {
      return res.status(404).json({ success: false, message: "Photo not found." });
    }

    const photoToDelete = photoRows[0];

    // Safely cleanup physical file if stored locally
    if (photoToDelete.image_url && photoToDelete.image_url.startsWith("/uploads/stations/")) {
      const filename = path.basename(photoToDelete.image_url);
      const filePath = path.join(uploadsBaseDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.warn("File cleanup warning:", cleanupErr.message);
        }
      }
    }

    await transaction(async (connection) => {
      await connection.execute(`DELETE FROM station_photos WHERE id = ?`, [photoToDelete.id]);

      // If this was the primary photo, elect another existing photo as primary or clear station.image
      if (photoToDelete.is_primary) {
        const remaining = await connection.execute(
          `SELECT id, image_url FROM station_photos WHERE station_id = ? ORDER BY id ASC LIMIT 1`,
          [access.station.id]
        );
        if (remaining[0] && remaining[0].length > 0) {
          const nextPrimary = remaining[0][0];
          await connection.execute(`UPDATE station_photos SET is_primary = TRUE WHERE id = ?`, [nextPrimary.id]);
          await connection.execute(`UPDATE stations SET image = ? WHERE id = ?`, [nextPrimary.image_url, access.station.id]);
        } else {
          await connection.execute(`UPDATE stations SET image = NULL WHERE id = ?`, [access.station.id]);
        }
      }
    });

    res.json({ success: true, message: "Photo deleted and storage cleaned up successfully." });
  } catch (error) {
    console.error("deleteStationPhoto error:", error);
    res.status(500).json({ success: false, message: "Failed to delete photo.", error: error.message });
  }
};

export default {
  getStationPhotos,
  uploadStationPhotos,
  setPrimaryPhoto,
  deleteStationPhoto,
};

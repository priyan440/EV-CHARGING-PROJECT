import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Star,
  Check,
  X,
  Sparkles,
  Layers,
  Image as ImageIcon,
  AlertCircle,
  Tag,
  Maximize2,
} from "lucide-react";
import {
  getStationPhotos,
  uploadStationPhotos,
  setPrimaryStationPhoto,
  deleteStationPhoto,
} from "../../services/ownerService";

export default function StationPhotosModal({ station, isOpen, onClose, onPhotoUpdated }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("EXTERIOR");
  const [caption, setCaption] = useState("");
  const [previews, setPreviews] = useState([]);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const fileInputRef = useRef(null);

  const categories = [
    { key: "EXTERIOR", label: "Station Exterior" },
    { key: "CHARGING_BAY", label: "Charging Bays" },
    { key: "EQUIPMENT", label: "Chargers & Connectors" },
    { key: "FACILITY", label: "Facilities & Lounge" },
    { key: "OTHER", label: "General" },
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadPhotos = async () => {
    if (!station) return;
    setLoading(true);
    try {
      const data = await getStationPhotos(station.stationId || station.id);
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadPhotos error:", err);
      showToast("Error loading station photos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && station) {
      loadPhotos();
      setPreviews([]);
      setCaption("");
    }
  }, [isOpen, station]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = [];
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`Skipped ${file.name}: Only image files are allowed.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: File exceeds 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push({
          file,
          dataUrl: event.target.result,
          name: file.name,
          size: file.size,
          category: selectedCategory,
          caption: caption || file.name.replace(/\.[^/.]+$/, ""),
          isPrimary: photos.length === 0 && newPreviews.length === 1,
        });

        if (newPreviews.length === files.length) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePreview = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    try {
      const payload = {
        photos: previews.map((p) => ({
          image: p.dataUrl,
          caption: p.caption || "Station photograph",
          category: p.category || selectedCategory,
          isPrimary: Boolean(p.isPrimary),
          fileSize: p.size,
        })),
      };

      const res = await uploadStationPhotos(station.stationId || station.id, payload);
      showToast(`Uploaded ${res.data?.length || previews.length} photo(s) to MySQL!`);
      setPreviews([]);
      setCaption("");
      await loadPhotos();
      if (onPhotoUpdated) onPhotoUpdated();
    } catch (err) {
      console.error("Upload error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (photo) => {
    try {
      await setPrimaryStationPhoto(station.stationId || station.id, photo.photoId || photo.id);
      showToast("Primary station photo updated!");
      await loadPhotos();
      if (onPhotoUpdated) onPhotoUpdated();
    } catch (err) {
      showToast("Failed to set primary photo: " + err.message);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm("Are you sure you want to permanently delete this photo?")) return;
    try {
      await deleteStationPhoto(station.stationId || station.id, photo.photoId || photo.id);
      showToast("Photo deleted from database and storage.");
      await loadPhotos();
      if (onPhotoUpdated) onPhotoUpdated();
    } catch (err) {
      showToast("Failed to delete photo: " + err.message);
    }
  };

  if (!isOpen || !station) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Preview */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewModalImg}
            alt="Full size view"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-4xl w-full p-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-[var(--accent-primary)] border border-blue-500/20">
                PHOTOGRAPH STORAGE & MANAGEMENT
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {station.stationId || station.station_id || `STN000${station.id}`}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <Camera className="w-5 h-5 text-[var(--accent-primary)]" />
              {station.stationName || station.station_name || station.name} - Station Gallery
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--accent-primary)]" />
                Upload New Photographs
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Upload station exterior, charging bays, charger hardware, or waiting facilities (Max 10MB each).
              </p>
            </div>

            {/* Category selector */}
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-[var(--text-muted)]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Caption Input */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Photo caption (e.g. Dual-Gun 120kW CCS2 Bay 01)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              Choose Images...
            </button>
          </div>

          {/* Pending Previews Queue */}
          {previews.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Selected for Upload ({previews.length} photos):</span>
                <button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="px-4 py-1.5 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Saving to MySQL..." : "Confirm & Save Photos"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {previews.map((prev, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] aspect-video shadow-sm"
                  >
                    <img src={prev.dataUrl} alt={prev.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2 flex flex-col justify-between opacity-90">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-white bg-blue-600/80 px-1.5 py-0.5 rounded">
                          {prev.category}
                        </span>
                        <button
                          onClick={() => handleRemovePreview(idx)}
                          className="text-white hover:text-red-400 p-1 rounded-full bg-black/50 transition cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="text-[10px] text-white font-medium truncate">{prev.caption || prev.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Persisted Photos Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Persisted MySQL Photos ({photos.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)]">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-[var(--text-muted)] font-mono">Loading station gallery from MySQL...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)] space-y-2">
              <ImageIcon className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <div className="text-xs font-bold text-[var(--text-primary)]">No Photographs Uploaded</div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Upload photographs above to give EV drivers a clear preview of your station bays and facilities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.photoId || photo.id}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 bg-[var(--bg-surface-raised)] flex flex-col justify-between shadow-sm ${
                    photo.isPrimary || photo.is_primary
                      ? "border-[var(--accent-primary)] ring-2 ring-blue-500/20"
                      : "border-[var(--border-subtle)] hover:border-blue-500/40"
                  }`}
                >
                  {/* Image container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    <img
                      src={photo.imageUrl || photo.image_url}
                      alt={photo.caption || "Station photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Primary Badge */}
                    {(photo.isPrimary || photo.is_primary) && (
                      <span className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                        <Star size={10} className="fill-slate-950" /> PRIMARY PHOTO
                      </span>
                    )}

                    {/* Expand Zoom Button */}
                    <button
                      onClick={() => setPreviewModalImg(photo.imageUrl || photo.image_url)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="View Full Size"
                    >
                      <Maximize2 size={13} />
                    </button>

                    {/* Category Label */}
                    <span className="absolute bottom-2 left-2 text-[9px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {photo.category}
                    </span>
                  </div>

                  {/* Details & Actions Footer */}
                  <div className="p-3 space-y-2">
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate" title={photo.caption}>
                      {photo.caption || "Station Equipment"}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-xs">
                      {!(photo.isPrimary || photo.is_primary) ? (
                        <button
                          onClick={() => handleSetPrimary(photo)}
                          className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Star size={12} /> Set as Primary
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                          <Check size={12} /> Primary Display
                        </span>
                      )}

                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="text-rose-500 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

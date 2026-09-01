import { useState } from "react";
import { Star, MessageSquare, Plus, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";

export default function Reviews() {
  const { currentUser } = useAuth();
  const { stations, reviews, addReview } = useSystemState();

  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || "STA001");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    addReview({
      stationId: selectedStationId,
      counterId: currentUser?.counterId || "CUS0002",
      customerName: currentUser?.name || "Priyan",
      rating,
      comment: comment.trim(),
    });

    setSubmitted(true);
    setComment("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
          <Star size={28} className="text-amber-400 fill-amber-400" /> Station Reviews & Ratings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Share your charging experience, evaluate cleanliness, charging speed, and amenities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Write Review Form (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            Submit a Station Review
          </h3>

          {submitted && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Thank you! Your review has been posted.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Station
              </label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-3 rounded-xl"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                Rating (1 - 5 Stars)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-xl border transition ${
                      rating >= star
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-600"
                    }`}
                  >
                    <Star size={20} className={rating >= star ? "fill-amber-400" : ""} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Review
              </label>
              <textarea
                rows="4"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the charging speed, staff helpfulness, and lounge cleanliness?"
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold uppercase tracking-wider"
            >
              Post Review
            </button>
          </form>
        </div>

        {/* Reviews List (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            All Station Reviews ({reviews.length})
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {reviews.map((r) => (
              <div key={r.reviewId} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">{r.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Counter ID: {r.counterId}</span>
                  </div>

                  <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <Star size={12} className="fill-amber-400" /> {r.rating}.0
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{r.comment}</p>
                <div className="text-[10px] text-slate-500 text-right">
                  Station: {r.stationId} | {new Date(r.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

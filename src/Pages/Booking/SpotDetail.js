import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { getSpot } from "../../api/client";

function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeOptions(start, end) {
  const options = [];
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  while (h < endH || (h === endH && m <= endM)) {
    const label = new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    options.push({ value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, label });
    m += 30;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return options;
}

export default function SpotDetail() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { update } = useBooking();
  const [loading, setLoading] = useState(true);
  const [spot, setSpot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSpot(spotId).then(({ spot }) => {
      if (cancelled) return;
      setSpot(spot);
      setLoading(false);
      if (spot && spot.availability.length) {
        setSelectedDate(spot.availability[0].date);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spotId]);

  const availabilityForDate = spot?.availability.find((a) => a.date === selectedDate);
  const slot = availabilityForDate?.slots[0];
  const startOptions = slot ? timeOptions(slot.start, slot.end) : [];
  const endOptions = startTime && slot ? timeOptions(startTime, slot.end).slice(1) : [];

  const canContinue = selectedDate && startTime && endTime;

  const handleContinue = () => {
    update({
      addressId,
      spot,
      date: selectedDate,
      startTime,
      endTime,
    });
    navigate(`/r/${addressId}/${spotId}/auth`);
  };

  if (loading) {
    return (
      <BookingLayout title="Spot Details" step={2}>
        <p className="loading-text">Loading spot...</p>
      </BookingLayout>
    );
  }

  if (!spot) {
    return (
      <BookingLayout title="Spot Details" step={2} onBack={() => navigate(`/r/${addressId}`)}>
        <p className="loading-text">Spot not found.</p>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout title="Spot Details" step={2} onBack={() => navigate(`/r/${addressId}`)}>
      <div className="booking-photos">
        {spot.photos.map((photo, i) => (
          <img key={i} src={photo} alt={`${spot.title} ${i + 1}`} />
        ))}
      </div>
      <h2 className="spot-detail-title">{spot.title}</h2>
      <p className="spot-detail-price">${spot.pricePerHour}/hr</p>
      <p className="spot-detail-description">{spot.description}</p>

      <h3 className="booking-section-title">Choose a date</h3>
      <div className="date-pill-row">
        {spot.availability.map((a) => (
          <button
            key={a.date}
            type="button"
            className={`date-pill ${selectedDate === a.date ? "selected" : ""}`}
            onClick={() => {
              setSelectedDate(a.date);
              setStartTime("");
              setEndTime("");
            }}
          >
            {formatDateLabel(a.date)}
          </button>
        ))}
      </div>

      <h3 className="booking-section-title">Choose a time</h3>
      <div className="time-row">
        <div className="time-field">
          <label htmlFor="start-time">Start</label>
          <select
            id="start-time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setEndTime("");
            }}
          >
            <option value="">Select</option>
            {startOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="time-field">
          <label htmlFor="end-time">End</label>
          <select
            id="end-time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!startTime}
          >
            <option value="">Select</option>
            {endOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn-primary" disabled={!canContinue} onClick={handleContinue}>
        Continue
      </button>
    </BookingLayout>
  );
}

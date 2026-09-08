import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { getSpot, getBookedRanges } from "../../api/client";

// Statuses meaning "nothing left to book in this window at all", if the
// backend ever includes this field on an availability entry — it doesn't
// today (getParkingDetail's availability projection has no status field),
// so this is a no-op in practice right now and real bookability is
// determined below by directly checking booked ranges instead.
const UNBOOKABLE_STATUSES = ["Fully Booked", "Currently Unavailable", "Expired"];

// True if booked ranges, merged, leave no gap across [slotStartMin, slotEndMin].
function isFullyCovered(slotStartMin, slotEndMin, ranges) {
  if (!ranges.length) return false;
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  let coveredUntil = slotStartMin;
  for (const r of sorted) {
    if (r.startMin > coveredUntil) return false;
    coveredUntil = Math.max(coveredUntil, r.endMin);
    if (coveredUntil >= slotEndMin) return true;
  }
  return coveredUntil >= slotEndMin;
}

function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function todayStr() {
  return toDateStr(new Date());
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toHHMM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Round up to the nearest 5 minutes — nicer default than an odd time like 2:47.
function roundUpTo5(mins) {
  return Math.ceil(mins / 5) * 5;
}

// A date's slot is bookable at all only if its window hasn't fully ended yet.
function windowEndDate(dateStr, endTime) {
  return new Date(`${dateStr}T${endTime}:00`);
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
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [bookedRangesByAvailability, setBookedRangesByAvailability] = useState({});
  const timeSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getSpot(spotId)
      .then(async ({ spot }) => {
        if (cancelled) return;
        // Drop any date whose whole window has already ended, or whose
        // status already marks it unbookable (if the backend ever sends
        // that — see UNBOOKABLE_STATUSES' note).
        const now = new Date();
        const candidates = spot
          ? spot.availability.filter(
              (a) => windowEndDate(a.date, a.slots[0].end) > now && !UNBOOKABLE_STATUSES.includes(a.availabilityStatus)
            )
          : [];

        // Directly check real bookings against each remaining window —
        // this is the actual source of truth for what's taken, not any
        // status field. Also drop any window a booking has fully
        // consumed, so an already-fully-rented spot doesn't even show up
        // as choosable.
        const rangesByAvailability = {};
        await Promise.all(
          candidates.map(async (a) => {
            try {
              rangesByAvailability[a.availabilityId] = await getBookedRanges(a.availabilityId);
            } catch {
              rangesByAvailability[a.availabilityId] = [];
            }
          })
        );
        const upcoming = candidates.filter((a) => {
          const ranges = rangesByAvailability[a.availabilityId] || [];
          return !isFullyCovered(timeToMinutes(a.slots[0].start), timeToMinutes(a.slots[0].end), ranges);
        });

        if (cancelled) return;
        setBookedRangesByAvailability(rangesByAvailability);
        setSpot(spot ? { ...spot, availability: upcoming } : spot);
        setLoading(false);
        if (upcoming.length) {
          applyDefaultTimes(upcoming[0]);
          setBookedRanges(rangesByAvailability[upcoming[0].availabilityId] || []);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load this spot.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  // Defaults the picker to "now" (or the slot's own start, whichever is
  // later) rounded to a clean 5-minute mark, with the end time an hour
  // after that — matches the mobile app's behavior.
  const applyDefaultTimes = (availabilityEntry) => {
    const slot = availabilityEntry.slots[0];
    const slotStartMin = timeToMinutes(slot.start);
    const slotEndMin = timeToMinutes(slot.end);
    const isToday = availabilityEntry.date === todayStr();
    const nowMin = isToday ? roundUpTo5(new Date().getHours() * 60 + new Date().getMinutes()) : slotStartMin;
    const start = clamp(Math.max(nowMin, slotStartMin), slotStartMin, slotEndMin);
    const end = clamp(start + 60, slotStartMin, slotEndMin);
    setSelectedDate(availabilityEntry.date);
    setStartTime(minutesToTime(start));
    setEndTime(start === end ? "" : minutesToTime(end));
  };

  const handleSelectDate = (availabilityEntry) => {
    applyDefaultTimes(availabilityEntry);
    setValidationError("");
    setBookedRanges(bookedRangesByAvailability[availabilityEntry.availabilityId] || []);
    // Give the new fields a moment to render before scrolling to them.
    requestAnimationFrame(() => {
      timeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const availabilityForDate = spot?.availability.find((a) => a.date === selectedDate);
  const slot = availabilityForDate?.slots[0];

  const isToday = selectedDate === todayStr();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const startMin = slot ? (isToday ? Math.max(timeToMinutes(slot.start), nowMinutes) : timeToMinutes(slot.start)) : 0;
  const endMin = slot ? timeToMinutes(slot.end) : 0;

  const canContinue = selectedDate && startTime && endTime && !validationError;

  const handleStartChange = (value) => {
    setStartTime(value);
    setValidationError("");
    // Keep end time meaningful (at least the same as start) when start moves past it.
    if (endTime && timeToMinutes(value) >= timeToMinutes(endTime)) {
      setEndTime(minutesToTime(clamp(timeToMinutes(value) + 60, startMin, endMin)));
    }
  };

  const handleContinue = () => {
    setValidationError("");
    if (!selectedDate || !startTime || !endTime) return;

    const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
    const endDateTime = new Date(`${selectedDate}T${endTime}:00`);

    // A couple of minutes of grace — the default start time is rounded to
    // the current 5-minute mark with no buffer, so without this, simply
    // taking a few seconds to click Continue would reject a user's own
    // untouched default.
    const GRACE_MS = 2 * 60 * 1000;
    if (startDateTime.getTime() < Date.now() - GRACE_MS) {
      setValidationError("That start time has already passed — pick a later time.");
      return;
    }
    if (endDateTime <= startDateTime) {
      setValidationError("End time needs to be after the start time.");
      return;
    }

    const startMinPicked = timeToMinutes(startTime);
    const endMinPicked = timeToMinutes(endTime);
    const overlapsBooking = bookedRanges.some((r) => startMinPicked < r.endMin && endMinPicked > r.startMin);
    if (overlapsBooking) {
      setValidationError("That time overlaps a part of this spot that's already booked — try a different time.");
      return;
    }

    update({
      addressId,
      spot,
      date: selectedDate,
      startTime,
      endTime,
      availabilityId: availabilityForDate?.availabilityId,
      priceType: availabilityForDate?.priceType,
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
        <p className="error-text">{error || "Spot not found."}</p>
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
      <p className="spot-detail-price">{spot.pricePerHour > 0 ? `$${spot.pricePerHour}/hr` : "See pricing below"}</p>
      <p className="spot-detail-description">{spot.description}</p>

      <h3 className="booking-section-title">Choose a date</h3>
      <div className="date-pill-row">
        {spot.availability.map((a) => (
          <button
            key={a.date}
            type="button"
            className={`date-pill ${selectedDate === a.date ? "selected" : ""}`}
            onClick={() => handleSelectDate(a)}
          >
            {formatDateLabel(a.date)}
          </button>
        ))}
        {spot.availability.length === 0 && <p className="help-text">No upcoming availability for this spot.</p>}
      </div>

      <h3 className="booking-section-title" ref={timeSectionRef}>
        Choose a time
      </h3>
      <div className="time-row">
        <div className="time-field">
          <label htmlFor="start-time">Start</label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            min={minutesToTime(startMin)}
            max={minutesToTime(endMin)}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        <div className="time-field">
          <label htmlFor="end-time">End</label>
          <input
            id="end-time"
            type="time"
            value={endTime}
            min={startTime || minutesToTime(startMin)}
            max={minutesToTime(endMin)}
            onChange={(e) => {
              setEndTime(e.target.value);
              setValidationError("");
            }}
            disabled={!startTime}
          />
        </div>
      </div>

      {validationError && <p className="error-text">{validationError}</p>}

      <button className="btn-primary" disabled={!canContinue} onClick={handleContinue}>
        Continue
      </button>
    </BookingLayout>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../context/AuthContext";
import { getSpot, getBookedRanges } from "../../api/client";

// Statuses meaning "nothing left to book in this window at all", if the
// backend ever includes this field on an availability entry — it doesn't
// today (getParkingDetail's availability projection has no status field),
// so this is a no-op in practice right now and real bookability is
// determined below by directly checking booked ranges instead.
const UNBOOKABLE_STATUSES = ["Fully Booked", "Currently Unavailable", "Expired"];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatTimeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

// Builds a Sun-Sat grid of cells for the given month, padded with the
// trailing/leading days of the neighboring months (grayed out, not
// clickable) so every row has 7 cells — the same shape as a normal
// calendar app.
function buildMonthGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailing++, inMonth: false, dateStr: null });
  }
  return cells;
}

export default function SpotDetail() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { update } = useBooking();
  const { user: persistedUser, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spot, setSpot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [bookedRangesByAvailability, setBookedRangesByAvailability] = useState({});
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
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
          // Prefer the first date that actually has usable time left right
          // now — "today" can technically qualify above (its window hasn't
          // ended yet) while still having no real room before it closes.
          const firstUsable = upcoming.find((a) => computeDefaultMinutes(a)) || upcoming[0];
          applyDefaultTimes(firstUsable);
          setBookedRanges(rangesByAvailability[firstUsable.availabilityId] || []);
          const d = new Date(`${firstUsable.date}T00:00:00`);
          setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
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

  // The {start, end} minute default for this entry, or null if there's no
  // usable time left in it right now — e.g. "today" whose window hasn't
  // technically ended yet but "now" rounds up to (or past) its own close.
  const computeDefaultMinutes = (availabilityEntry) => {
    const slot = availabilityEntry.slots[0];
    const slotStartMin = timeToMinutes(slot.start);
    const slotEndMin = timeToMinutes(slot.end);
    const isToday = availabilityEntry.date === todayStr();
    const nowMin = isToday ? roundUpTo5(new Date().getHours() * 60 + new Date().getMinutes()) : slotStartMin;
    const start = clamp(Math.max(nowMin, slotStartMin), slotStartMin, slotEndMin);
    const end = clamp(start + 60, slotStartMin, slotEndMin);
    return start < end ? { start, end } : null;
  };

  // Defaults the picker to "now" (or the slot's own start, whichever is
  // later) rounded to a clean 5-minute mark, with the end time an hour
  // after that — matches the mobile app's behavior.
  const applyDefaultTimes = (availabilityEntry) => {
    const result = computeDefaultMinutes(availabilityEntry);
    setSelectedDate(availabilityEntry.date);
    setStartTime(result ? minutesToTime(result.start) : "");
    setEndTime(result ? minutesToTime(result.end) : "");
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

    const bookingPatch = {
      addressId,
      spot,
      date: selectedDate,
      startTime,
      endTime,
      availabilityId: availabilityForDate?.availabilityId,
      priceType: availabilityForDate?.priceType,
    };

    // Already signed in (persists across visits — see AuthContext) — no
    // need to ask again. Seed the checkout's own user record from it and
    // skip straight past sign-in/verification.
    if (isSignedIn) {
      update({
        ...bookingPatch,
        user: { ...persistedUser, verified: true },
      });
      navigate(`/r/${addressId}/${spotId}/profile`);
      return;
    }

    update(bookingPatch);
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

  const availabilityByDate = new Map(spot.availability.map((a) => [a.date, a]));
  const monthCells = buildMonthGrid(viewMonth.year, viewMonth.month);
  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const today = todayStr();

  const changeMonth = (delta) => {
    setViewMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <BookingLayout title="Spot Details" step={2} onBack={() => navigate(`/r/${addressId}`)}>
      <div className="spot-photo-carousel">
        <img className="spot-photo-main" src={spot.photos[photoIndex]} alt={spot.title} />
        {spot.photos.length > 1 && (
          <div className="spot-photo-dots">
            {spot.photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                className={`spot-photo-dot ${i === photoIndex ? "active" : ""}`}
                onClick={() => setPhotoIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      <h2 className="spot-detail-title">{spot.title}</h2>

      <h3 className="booking-section-title">Description</h3>
      <p className="spot-detail-description">{spot.description || "No description provided."}</p>

      <h3 className="booking-section-title">Choose a date</h3>
      <div className="calendar-card">
        <div className="calendar-header">
          <button type="button" className="calendar-nav" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className="calendar-month-label">{monthLabel}</span>
          <button type="button" className="calendar-nav" onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {monthCells.map((cell, i) => {
            if (!cell.inMonth) {
              return <span key={i} className="calendar-day calendar-day-empty" />;
            }
            const availabilityEntry = availabilityByDate.get(cell.dateStr);
            const isPast = cell.dateStr < today;
            const isSelected = cell.dateStr === selectedDate;
            const isBookable = !!availabilityEntry && !isPast;
            return (
              <button
                key={i}
                type="button"
                disabled={!isBookable}
                className={`calendar-day ${isSelected ? "selected" : isBookable ? "available" : "disabled"}`}
                onClick={() => isBookable && handleSelectDate(availabilityEntry)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        {spot.availability.length === 0 && <p className="help-text" style={{ marginTop: 10 }}>No upcoming availability for this spot.</p>}
      </div>

      {availabilityForDate && slot && (
        <div className="spot-summary-box">
          <div className="spot-summary-row">
            <span>Selected Date</span>
            <span>{formatDateLabel(selectedDate)}</span>
          </div>
          <div className="spot-summary-row">
            <span>Available Timings</span>
            <span>
              {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}
            </span>
          </div>
          <div className="spot-summary-row">
            <span>Price</span>
            <span>{spot.pricePerHour > 0 ? `$${spot.pricePerHour} / Hour` : "See pricing"}</span>
          </div>
        </div>
      )}

      <div className="checkinout-row" ref={timeSectionRef}>
        <div className="checkinout-field">
          <label htmlFor="start-time">Check In</label>
          <div className="checkinout-box">
            <input
              id="start-time"
              type="time"
              value={startTime}
              min={minutesToTime(startMin)}
              max={minutesToTime(endMin)}
              onChange={(e) => handleStartChange(e.target.value)}
            />
          </div>
        </div>
        <div className="checkinout-field">
          <label htmlFor="end-time">Check Out</label>
          <div className="checkinout-box">
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
      </div>

      {validationError && <p className="error-text">{validationError}</p>}

      <button className="btn-primary" disabled={!canContinue} onClick={handleContinue}>
        Save
      </button>
    </BookingLayout>
  );
}

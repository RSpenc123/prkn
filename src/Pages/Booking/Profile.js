import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";

export default function Profile() {
  const { addressId, spotId } = useParams();
  const navigate = useNavigate();
  const { user, update } = useBooking();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.method === "phone" ? user.contact : "");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [error, setError] = useState("");

  const base = `/r/${addressId}/${spotId}`;

  if (!user || !user.verified) {
    navigate(`${base}/auth`);
    return null;
  }

  // If they signed up by phone, we already have a number — no need to ask again.
  const needsPhone = user.method !== "phone";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !carMake.trim() || !carModel.trim()) {
      setError("Fill out all fields so the host knows who's parking.");
      return;
    }
    if (needsPhone && !phone.trim()) {
      setError("Enter a phone number so the host can reach you.");
      return;
    }
    update({ profile: { name, phone: phone.trim(), carMake, carModel, vehicleNumber: vehicleNumber.trim() } });
    navigate(`${base}/payment`);
  };

  return (
    <BookingLayout title="Your Info" step={5}>
      <p className="help-text">This gets shared with the host so they know whose car to expect.</p>
      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="booking-field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            className="booking-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {needsPhone && (
          <div className="booking-field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="booking-input"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}
        <div className="card-fields-row">
          <div className="booking-field" style={{ flex: 1 }}>
            <label htmlFor="car-make">Car make</label>
            <input
              id="car-make"
              className="booking-input"
              placeholder="Toyota"
              value={carMake}
              onChange={(e) => setCarMake(e.target.value)}
            />
          </div>
          <div className="booking-field" style={{ flex: 1 }}>
            <label htmlFor="car-model">Car model</label>
            <input
              id="car-model"
              className="booking-input"
              placeholder="Camry"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
            />
          </div>
        </div>
        <div className="booking-field">
          <label htmlFor="vehicle-number">License plate (optional)</label>
          <input
            id="vehicle-number"
            className="booking-input"
            placeholder="ABC1234"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit">
          Continue to Payment
        </button>
      </form>
    </BookingLayout>
  );
}

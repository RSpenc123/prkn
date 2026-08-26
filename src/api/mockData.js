// Mock data standing in for the real MongoDB-backed API.
// Shapes here are what the frontend expects `client.js` to return once
// real endpoints exist — see the header comment in client.js.

import driveway from "../images/driveway-parking-spot.jpg";
import hostParking from "../images/host-parking-pic.jpg";
import pier from "../images/pierphoto.jpg";
import beach from "../images/beachhomepage.jpg";

export const mockAddresses = {
  "addr_demo_1": {
    id: "addr_demo_1",
    line1: "412 Pier Ave",
    city: "Hermosa Beach",
    state: "CA",
    zip: "90254",
  },
};

export const mockSpots = [
  {
    id: "spot_1",
    addressId: "addr_demo_1",
    title: "Driveway spot, 1 block from the pier",
    description:
      "Private driveway with easy in-and-out access. Fits sedans and small SUVs. No overnight towing risk, well-lit street.",
    photos: [driveway, hostParking],
    pricePerHour: 6,
    status: "available",
    availability: [
      {
        date: nextDate(0),
        slots: [{ start: "09:00", end: "22:00" }],
      },
      {
        date: nextDate(1),
        slots: [{ start: "09:00", end: "22:00" }],
      },
    ],
  },
  {
    id: "spot_2",
    addressId: "addr_demo_1",
    title: "Covered garage spot",
    description:
      "Covered single-car garage space, gated entry. Great for larger vehicles and keeps your car out of the sun.",
    photos: [pier],
    pricePerHour: 8,
    status: "available",
    availability: [
      {
        date: nextDate(0),
        slots: [{ start: "08:00", end: "20:00" }],
      },
    ],
  },
  {
    id: "spot_3",
    addressId: "addr_demo_1",
    title: "Side-yard spot near the boardwalk",
    description: "Compact spot, best for smaller cars. Steps from the boardwalk and beach access.",
    photos: [beach],
    pricePerHour: 5,
    status: "booked",
    availability: [
      {
        date: nextDate(2),
        slots: [{ start: "10:00", end: "18:00" }],
      },
    ],
  },
];

function nextDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

import React from "react";
import logo from "../images/logo.png";
import AddressSearch from "../components/AddressSearch";
import Header from "../components/Header";
import "./Landing.css";

export function Landing() {
  return (
    <div className="landing-page-new">
      <Header />
      <section className="landing-hero-new">
        <img className="landing-hero-logo" src={logo} alt="" />
        <h1 className="landing-hero-title">PRK'n</h1>
        <div className="landing-hero-search">
          <AddressSearch placeholder="Enter an address or place name" />
        </div>
        <p className="landing-hero-tagline">
          Best Parking <span className="landing-hero-tagline-accent">in Town!</span>
        </p>
      </section>
    </div>
  );
}

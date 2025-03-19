import React from "react";
// Slider.js
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import beach from "../images/beachhomepage.jpg"
import ski from "../images/ski.jpg"
import foorball from "../images/football.jpg"
import "./Carousel.css"
import "./Landing.css"

function Carousel() {

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
    speed: 1500,
    autoplaySpeed: 10000,
      };

    return(
      <section className="slider-box">
        <div className="slider-container">
        <Slider {...settings}>
          <div className="image-box">
            <p className="beach-text">PRK'n For Beach'n</p>
            <img className="slider-image" src={beach} alt=""/>
            
          </div>
          <div className="image-box">
          <p className="beach-text">Prk'n for Ski'n</p>
          <img className="slider-image" src={ski} alt=""/>
          </div>
          <div className="image-box">
          <p className="beach-text">Gameday Prk'n</p>
          <img className="slider-image" src={foorball} alt=""/>
          </div>
          
        </Slider>
      </div>
      </section>
    )
}
export default Carousel
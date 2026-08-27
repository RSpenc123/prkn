import React, {useState} from "react";
import Slider from "react-slick";
import beach from "../images/beachhomepage.jpg"
import logo from "../images/logo.png"
import qr from "../images/qr-code.png"
import "./Landing.css"
import examples from "../images/prknexamples.png"
import host from "../images/hostpageimage.jpg"
import apple from "../images/apple.png"
import android from "../images/android.png"
import insta from "../images/insta.png"
import facebook from "../images/facebook.png"
import "react-responsive-carousel/lib/styles/carousel.min.css"; 
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ski from "../images/ski.jpg"
import foorball from "../images/football.jpg"
import "./Carousel.css"
import "./mobile.css"
import qrbox from "../images/qr-code-box.png"
import parking from "../images/host-parking-pic.jpg"
import guestimage from "../images/guest-driving-image.jpg"
import pier from "../images/pierphoto.jpg"
import signup from "../images/signup-slanted.png"
import spot from "../images/create-spot.png"
import stripe from "../images/stripe.png"
import Mobile from "./Mobile.js";
import AddressSearch from "../components/AddressSearch";
// import { Carousel } from "../components/Carousel"
{/* <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" /> */}








export function Landing() {

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
      const settings2 = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        variableWidth: true,
        adaptiveHeight: true
      };

      const newTab=url=>{
        window.open(url)}

        const [hostdropshow,hostdropsetShow] = useState(false);
        const [guestdropshow,guestdropsetShow] = useState(false);
        const [section1dropshow,section1dropsetShow] = useState(false);
        const [section2dropshow,section2dropsetShow] = useState(false);
        const [section3dropshow,section3dropsetShow] = useState(false);


    return <body className="landing-body">
        <header className="header">
            <img className="logo-h" src={logo} alt=""/>
            <p className="header-text">PRK'n</p></header>

            <section className="slider-box">
        <div className="slider-container">
        <Slider {...settings}>
          <div className="image-box">
            <p className="beach-text">PRK'n For BEACH'n</p>
            <img className="slider-image" src={beach} alt=""/>
            
          </div>
          <div className="image-box">
          <p className="ski-text">PRK'n for SKI'n</p>
          <img className="slider-image" src={ski} alt=""/>
          </div>
          <div className="image-box">
          <p className="football-text">Gameday Prk'n</p>
          <img className="slider-image" src={foorball} alt=""/>
          </div>
          
        </Slider>
      </div>
      </section>

      <section className="address-search-section">
        <h2 className="address-search-title">Find spots at an address</h2>
        <AddressSearch className="address-search-desktop" />
      </section>




{/* 
        <section className="beach">
        <h1 className="beach-text"> PRK'n for Beach'n</h1>
            <img src={beach} alt=""/>
           

        </section> */}

        <section className="homep2">
            <div className="homep3"> 
        <div className="prkn-example-text">
            <h1 className="prkn-text">PRK'n</h1>
    <h2 className="prkn-text2"  > Revolutionizing the way people park
                </h2>
            <h2 className="revprk-text">The all new Prk'n app is revolutionizing the way people park to get where they want to go</h2>
            <div className="qr-download">
                {/* <h3 className="qr-text">Download here</h3> */}
             
                <button className="button-landing">Download</button>
                
                <img className="qr" src={qrbox} alt=""/>
         
            </div>
            </div>
                <img className="examples" src={examples} alt=""/>

                </div>
        </section>
<section className="info-dropdowns">
    <h1 className="dropdown-header">How it Works</h1>
    <div className="host-section">
<div onClick={() => hostdropsetShow(!hostdropshow)} className="host-dropdown">
        <p className="dropdown-title-text">Host</p>
    </div>
    {hostdropshow &&   <div className="host-content">
    <div className="host-content-box">
        <p className="landing-host-dropdown-text" >Hosts are able to easily list
their spot on the PRK'n app. 
Allowing them to instantly rent 
out their spots. </p>
<button className="button-landing-host">Download</button>

</div>
<img className="landing-host-dropdown-image" src={parking} alt=""/>


    </div>}
    </div>








    <div className="host-section">
    <div onClick={() => guestdropsetShow(!guestdropshow)} className="guest-dropdown">
        <p className="dropdown-title-text">Guest</p>
        </div>
        {guestdropshow &&  <div className="host-content1">
        <img className="landing-guest-dropdown-image" src={guestimage} alt=""/>
        
        <div className="host-content-box">
            <p className="landing-guest-dropdown-text" >Guests are able to find nearby spots, or search for specific locations and
         instantly find a listing applicable to them. 
         {/* Removing the struggles of finding a parking spot in it's entiriy. Just show up          and enjoy rather than stressing about where to park.  */}
          </p>
          <button className="button-landing-guest">Download</button>
          </div>



    </div> }
    </div>
</section>



  

        <section className="host-info">

           


            <div className="earn-heading">
            <h1 className="earn">Monetize Your Parking Spot</h1>
            <h1 className="earn2">Three easy steps</h1>
            </div>
            <div className="steps">
                <div className="step-box">
            <div className="step1" onClick={() => section1dropsetShow(!section1dropshow)}>
                <h2 className="step-text"> Create Account</h2> 
                <div className="number-circle"
                ><h1 className="number">1</h1></div>
                
                 </div>
                 {section1dropshow &&    <div className="step-info">
                    <div className="step-info-text-box"> 
                        <h1>Header text</h1>
                <h2 className="step-info-text">Creating your account is simple! Just install the app and click become host. Then use either your phone number or email to sign up and your good to go!</h2>
                </div>
                <img className="step-image" src={signup} alt=""/>
            </div>}
            </div>
            <div className="step-box">
            <div className="step2" onClick={() => section2dropsetShow(!section2dropshow)}> 
            <h2 className="step-text2"> List your spot</h2> 
                <div className="number-circle2"
                ><h1 className="number">2</h1></div>
            </div>
            {section2dropshow &&    <div className="step-info">
                <div className="step-info-text-box"> 
                        <h1>Header text</h1>
                <h2 className="step-info-text">Once you sign up click the + at the bottom of the screen and it'll redirect you to a page where you can list your spot. Here you just need to enter some info about the spot, an image and the days/times you want it listed for and the price</h2>
                </div>
                <img className="step-image2" src={spot} alt=""/>
            </div>}
            </div>
            <div className="step-box">
            <div className="step3" onClick={() => section3dropsetShow(!section3dropshow)}> 
            <h2 className="step-text3"> Link Accounts</h2> 
                <div className="number-circle3"
                ><h1 className="number">3</h1></div>
            </div>
            {section3dropshow &&    <div className="step-info">
                <div className="step-info-text-box"> 
                <h1>Header text</h1>
                <h1 className="step-info-text">Lastly in order to get paid you need to create a stripe account and link it. To do this it's super easy you just go to user - my account then click the link accounts button
                    after that just follow the steps to create a stripe account or sign in, if you already have one. 
                </h1>
                </div>
                <img className="step-image2" src={stripe} alt=""/>
            </div>}
            </div>
            </div>
        {/* <div className="host-info2">
          <h1 className="video-info"> For more info</h1>
        
        <iframe
  src='https://www.youtube.com/embed/E7wJTI-1dvQ'
  frameborder='0'
  allow='autoplay; encrypted-media'
  allowfullscreen
  title='video'
  className="video"
/>

        
</div> */}
</section>



        <footer className="footer">
        <img className="logo-footer" src={logo} alt=""/>
<div className="icon-info">
    <p className="follow-text">Follow us on</p>
 
    <figure className="icon-box">
    <img className="icon" src={facebook} alt=""/>
    <img className="icon" src={insta} alt=""/>
    </figure>
</div>

<div className="footer-links">
    <h2 className="footer-link">About</h2>
    <h2 className="footer-link">FAQ</h2>
    <h2 className="footer-link">Contact</h2>
</div>
<div className="icon-info">
    <p className="download-text">Download on</p>
 
    <div>
    <img className="icon-r" src="https://res.cloudinary.com/spothero/f_auto,c_limit,w_256,q_auto/logos/app-store-badge" alt=""/>
    <img className="icon-r" src="https://res.cloudinary.com/spothero/f_auto,c_limit,w_256,q_auto/logos/google-play-badge" alt=""/>
    </div>
</div>

<img className="qr2" src={qr} alt=""/>



        </footer>
       
<div>
 
</div>

<Mobile/>

    </body>

    
}
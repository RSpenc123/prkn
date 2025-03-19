import React, {useState} from "react";

import logo from "../images/logo.png"
import facebook from "../images/facebook.png"
import pier from "../images/pierphoto.jpg"
import "./mobile.css"
import examples from "../images/prknexamples.jpg"
import { Link } from "react-router-dom";
import driveway from "../images/driveway-parking-spot.jpg"
import parking from "../images/host-parking-pic.jpg"
import guestimage from "../images/guest-driving-image.jpg"
import graphic from "../images/host-steps.png"
import burger from "../images/burger.png"
import insta from "../images/insta.png"
import android from "../images/android.png"
import apple from "../images/apple.png"


<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet"></link>








export function Mobile() {

    const newTab=url=>{
    window.open(url)}

        const [show,setShow] = useState(false);

        const [guestshow,setguestShow] = useState(false);
        const [section1dropshow,section1dropsetShow] = useState(false);
        const [section2dropshow,section2dropsetShow] = useState(false);
        const [section3dropshow,section3dropsetShow] = useState(false);

    return(
    <body className="mobile-body1">
      

{/* <header className="mobile-header">
            <img className="logo-header-mobile" src={logo} alt=""/>
            <p className="mobile-header-text">PRK'n</p></header> */}


     


            <section className="mobile-pier-section">
  
                <h1 className="pier"> PRK'n</h1>
                <div className="pier-button">  <button className="btn-mobile" onClick={()=> newTab('https://onelink.to/c2adab')   }>
              <p className="download-text-mobile">Download here</p>  
             </button></div>
           
                
            <img className="mobile-pier" src={pier} alt=""/>
            
            </section>

            <section className="host-guest-section">
                <div className="rev-mobile">
                    <p className="rev-mobile-text-top">Revolutionizing the way people park</p></div>
                    <img className="driveway-mobile" src={driveway} alt=""/>
                
                
                    <section className="host-dropdown-section">
         
           
         <div onClick={() => setShow(!show)}>
         <div className="host-mobile-section" >
                 <p className="host-mobile-section-text">Host</p>
             </div>
         </div>
         {show &&                 <div className="mobile-host-dropdown">
                 <div className="mobile-host-dropdown-text-box">
             <p className="hidden-text" >Hosts are able to easily list
their spot on the PRK'n app. 
Allowing them to instantly rent 
out their spots. </p>
</div>
             <div className="mobile-image-box">
             <img className="driveway-mobile" src={parking} alt=""/>
             </div>
             </div> }
     </section>
                


     <section>

         
            <div type="button" onClick={() => setguestShow(!guestshow)}>
                <div className="guest-mobile-section"  >
                        <p className="guest-mobile-section-text">Guest</p>
                    </div></div>
            {guestshow && <div className="mobile-guest-dropdown">
                 <div className="mobile-host-dropdown-text-box">
             <p className="hidden-text" >Hosts are able to easily list
their spot on the PRK'n app. 
Allowing them to instantly rent 
out their spots. </p>
</div>
             
<img className="driveway-mobile" src={guestimage} alt=""/>
             </div> }
        </section>
                
            </section>

            {/* <section className="host-box-mobile">
                <h1 className="host-text1">Become a host!</h1>
                <p className="host-text2"> It's super easy! You can do it in 3 simple steps! </p>
        
             
                <img className="graphic" src={graphic} alt=""/>



            </section> */}


            <section className="host-info">

           


<div className="earn-heading">
<h1 className="earn-mobile">Earn with your spot</h1>
<h1 className="earn2-mobile">In three easy steps</h1>
</div>
<div className="steps">
    <div className="step-box">
<div className="step1-mobile" onClick={() => section1dropsetShow(!section1dropshow)}>
    <h2 className="step-text-mobile"> Create Account</h2> 
    <div className="number-circle-mobile"
    ><h1 className="number-mobile">1</h1></div>
    
     </div>
     {section1dropshow &&    <div className="step-info">
        <div className="step-info-text-box-mobile"> 
            {/* <h1>Header text</h1> */}
    <h2 className="step-info-text-mobile">Creating your account is simple! Just install the app and click become host. Then use either your phone number or email to sign up and your good to go!</h2>
    </div>
  
</div>}
</div>
<div className="step-box">
<div className="step2-mobile" onClick={() => section2dropsetShow(!section2dropshow)}> 
<h2 className="step-text2-mobile"> List your spot</h2> 
    <div className="number-circle2-mobile"
    ><h1 className="number-mobile">2</h1></div>
</div>
{section2dropshow &&    <div className="step-info">
    <div className="step-info-text-box-mobile"> 
            {/* <h1>Header text</h1> */}
    <h2 className="step-info-text-mobile">Once you sign up click the + at the bottom of the screen and it'll redirect you to a page where you can list your spot. Here you just need to enter some info about the spot, an image and the days/times you want it listed for and the price</h2>
    </div>
   
</div>}
</div>
<div className="step-box">
<div className="step3-mobile" onClick={() => section3dropsetShow(!section3dropshow)}> 
<h2 className="step-text3-mobile"> Link Accounts</h2> 
    <div className="number-circle3-mobile"
    ><h1 className="number-mobile">3</h1></div>
</div>
{section3dropshow &&    <div className="step-info">
    <div className="step-info-text-box-mobile"> 
    {/* <h1>Header text</h1> */}
    <h1 className="step-info-text-mobile">Lastly in order to get paid you need to create a stripe account and link it. To do this it's super easy you just go to user - my account then click the link accounts button
        after that just follow the steps to create a stripe account or sign in, if you already have one. 
    </h1>
    </div>

</div>}
</div>
</div>

</section>
          {/* <section className="mobile-video-box">
          <h1 className="host-text1"> For More Info</h1>
             <iframe
  src='https://www.youtube.com/embed/E7wJTI-1dvQ'
  frameborder='0'
  allow='autoplay; encrypted-media'
  allowfullscreen
  title='video'
  className="video-mobile"
/>
          </section> */}
            <footer className="mobile-footer">
                <div className="mobile-footer-top">
            <p className="mobile-footer-text">PRK'n</p>
             <button className="btn-footer-mobile" onClick={()=> newTab('https://onelink.to/c2adab')   }>
              <p className="download-footer-text-mobile">Download here</p>  
             </button>
             <img className="burger-footer" src={burger} alt=""/>
             </div>
           

            <div className="footer-bottom">
            <img className="mobile-facebook" src={facebook} alt=""/>
            <img className="mobile-insta" src={insta} alt=""/>
            <img className="mobile-insta" src={android} alt=""/>
            <img className="mobile-apple" src={apple} alt=""/>
            </div>
            </footer>
  
    </body>

    )
} export default Mobile
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import InquiryForm from "../components/InquiryForm";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/client");
      }
    }
  }, [status, session, router]);

  return (
    <main className="main-content">
      <div id="home" className="page active">
        {/* Hero Section */}
        <div className="hero">
          <img
            src="/blue_liberty_logo_blue.png"
            alt="Blue Liberty Analytics Logo"
            className="cover-logo"
          />
          <h1>Welcome to Winning</h1>
          <p>
            Advanced analytics consulting for political campaigns. 
            Get the inside edge you need to win your race.
          </p>
        </div>

        {/* Testimonial Section */}
        <section className="testimonial-section">
          <h3 className="testimonial-heading">Trusted by Winning Campaigns</h3>
          <blockquote>
            <p>
              &quot;Blue Liberty Analytics provided valuable campaign 
              support with their advanced analytics services, helping us 
              identify strong candidates for fundraising, 
              leveraging historical data to provide insights for 
              growth opportunities, and building models to project 
              election outcomes and turnout down the home stretch.&quot;
            </p>

            <cite>— Clarence Blalock, Campaign Manager, Peter Hubbard for Georgia PSC</cite>
          </blockquote>
        </section>

        {/* Contact Form */}
        <section id="contact" className="contact-section">
          <h2 className="contact-heading">Get in Touch</h2>
          <InquiryForm />
        </section>
      </div>
    </main>
  );
}
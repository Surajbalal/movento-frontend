import React, { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import logo from "../assets/movento-logo.png";

function DriverLanding() {
  const { requireAuth, isCaptainAuthenticated, pendingAction, authSuccessCounter, clearPendingAction, setShowAuthModal, setAuthModalRole, setAuthModalTab } = useContext(AuthContext);
  const navigate = useNavigate();

  // Handle pending action and auto-redirect after successful captain authentication
  useEffect(() => {
    if (isCaptainAuthenticated()) {
      if (pendingAction?.action === "navigateCaptainHome") {
        clearPendingAction();
      }
      navigate("/captain-home");
    }
  }, [authSuccessCounter, isCaptainAuthenticated, navigate]);

  const handleBecomeCaptain = () => {
    if (isCaptainAuthenticated()) {
      navigate("/captain-home");
      return;
    }
    const isAuth = requireAuth("captain", {
      action: "navigateCaptainHome",
    });
    if (isAuth) {
      navigate("/captain-home");
    }
  };

  const handleCaptainLogin = () => {
    if (isCaptainAuthenticated()) {
      navigate("/captain-home");
      return;
    }
    const isAuth = requireAuth("captain", {
      action: "navigateCaptainHome",
    });
    if (isAuth) {
      navigate("/captain-home");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/">
                <img className="w-24" src={logo} alt="Movento" />
              </Link>
              <nav className="hidden md:flex gap-1">
                <Link
                  to="/"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 px-4 rounded-full transition-all duration-200"
                >
                  Ride
                </Link>
                <span className="text-sm font-medium text-gray-900 bg-gray-100 py-2 px-4 rounded-full">
                  Drive
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isCaptainAuthenticated()) {
                    navigate("/captain-home");
                    return;
                  }
                  setAuthModalRole("captain");
                  setAuthModalTab("login");
                  setShowAuthModal(true);
                }}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 py-2 px-4 rounded-full transition-all duration-200"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  if (isCaptainAuthenticated()) {
                    navigate("/captain-home");
                    return;
                  }
                  setAuthModalRole("captain");
                  setAuthModalTab("signup");
                  setShowAuthModal(true);
                }}
                className="text-sm font-medium bg-black text-white py-2 px-5 rounded-full hover:bg-gray-800 transition-all duration-200"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-green-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold text-green-400 tracking-wide uppercase">
                  Now accepting captains
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Drive with
                <br />
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  Movento
                </span>
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-md leading-relaxed">
                Set your own schedule. Earn great money. Be your own boss.
                Join thousands of captains on the road.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBecomeCaptain}
                  className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-95 text-base"
                >
                  Become a Captain
                </button>
                <button
                  onClick={handleCaptainLogin}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 active:scale-95 text-base"
                >
                  Login as Captain
                </button>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="hidden md:block">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="text-3xl font-bold text-green-400 mb-1">₹25K+</div>
                    <p className="text-sm text-gray-400">Average weekly earnings</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="text-3xl font-bold text-green-400 mb-1">5K+</div>
                    <p className="text-sm text-gray-400">Active captains</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="text-3xl font-bold text-green-400 mb-1">50+</div>
                    <p className="text-sm text-gray-400">Cities covered</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="text-3xl font-bold text-green-400 mb-1">24/7</div>
                    <p className="text-sm text-gray-400">Captain support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Getting started as a Movento captain is simple
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "ri-user-add-line",
                title: "Sign up online",
                desc: "Create your captain account with your details and vehicle information. It takes less than 5 minutes.",
              },
              {
                step: "02",
                icon: "ri-shield-check-line",
                title: "Get verified",
                desc: "Upload your documents and vehicle details. Our team will verify your profile quickly.",
              },
              {
                step: "03",
                icon: "ri-steering-2-line",
                title: "Start earning",
                desc: "Go online whenever you want and start accepting ride requests. You're in full control.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:shadow-gray-100/50 border border-transparent hover:border-gray-100 transition-all duration-300"
              >
                <div className="text-xs font-bold text-gray-300 mb-4 tracking-widest">
                  STEP {item.step}
                </div>
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <i className={`${item.icon} text-white text-2xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why captains love Movento
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: "ri-time-line",
                    title: "Flexible schedule",
                    desc: "Drive when you want. No shifts, no bosses. Your time is yours.",
                  },
                  {
                    icon: "ri-money-rupee-circle-line",
                    title: "Competitive earnings",
                    desc: "Earn more with surge pricing, bonuses, and incentive programs.",
                  },
                  {
                    icon: "ri-shield-star-line",
                    title: "Insurance coverage",
                    desc: "Drive with peace of mind knowing you're covered while on trips.",
                  },
                  {
                    icon: "ri-customer-service-2-line",
                    title: "24/7 support",
                    desc: "Our dedicated support team is always ready to help you.",
                  },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                      <i
                        className={`${benefit.icon} text-xl text-gray-900`}
                      ></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {benefit.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg shadow-gray-100/50">
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                  Earnings Estimate
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Daily (8 hrs)</span>
                    <span className="font-semibold text-gray-900">
                      ₹1,500 – ₹3,000
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Weekly</span>
                    <span className="font-semibold text-gray-900">
                      ₹10,000 – ₹25,000
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Monthly</span>
                    <span className="font-semibold text-gray-900">
                      ₹40,000 – ₹1,00,000
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">Bonus & incentives</span>
                    <span className="font-semibold text-green-600">Extra</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  *Earnings depend on location, hours, and demand. Results may
                  vary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Requirements
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              What you need to start driving with Movento
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "ri-id-card-line",
                title: "Valid License",
                desc: "A valid commercial or personal driving license",
              },
              {
                icon: "ri-car-line",
                title: "Registered Vehicle",
                desc: "A vehicle registered in your name with valid documents",
              },
              {
                icon: "ri-file-text-line",
                title: "Insurance",
                desc: "Active vehicle insurance policy",
              },
              {
                icon: "ri-smartphone-line",
                title: "Smartphone",
                desc: "A smartphone with an active internet connection",
              },
            ].map((req) => (
              <div
                key={req.title}
                className="text-center p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-50 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className={`${req.icon} text-3xl text-gray-900`}></i>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{req.title}</h3>
                <p className="text-sm text-gray-500">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Hear from our captains
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh Kumar",
                city: "Delhi",
                quote:
                  "Movento has given me the freedom to work on my own schedule. I earn well and spend quality time with my family.",
                earnings: "₹22,000/week",
              },
              {
                name: "Amit Sharma",
                city: "Mumbai",
                quote:
                  "The incentive programs are great. I've been driving for 6 months and the support team is always helpful.",
                earnings: "₹18,000/week",
              },
              {
                name: "Priya Singh",
                city: "Bangalore",
                quote:
                  "As a woman captain, I feel safe and supported. The platform makes it easy to manage rides and earnings.",
                earnings: "₹20,000/week",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className="ri-star-fill text-yellow-400 text-sm"
                    ></i>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-400">{testimonial.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {testimonial.earnings}
                    </p>
                    <p className="text-xs text-gray-400">avg. earnings</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start earning?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join the Movento captain community today and take control of your
            earnings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBecomeCaptain}
              className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-95"
            >
              Become a Captain
            </button>
            <button
              onClick={handleCaptainLogin}
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 active:scale-95"
            >
              Login as Captain
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-950 text-gray-400 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img className="w-10 brightness-0 invert" src={logo} alt="Movento" />
            <span className="text-sm">© {new Date().getFullYear()} Movento</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/" className="hover:text-white transition-colors">
              Ride
            </Link>
            <Link to="/drive" className="hover:text-white transition-colors">
              Drive
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DriverLanding;

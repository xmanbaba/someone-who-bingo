import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 font-inter">
      {/* Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="gHeart"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#FFA500" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#gHeart)"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Networking Bingo
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => scrollToSection("about")}
                className="text-gray-700 hover:text-purple-600 transition-colors"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="text-gray-700 hover:text-purple-600 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-gray-700 hover:text-purple-600 transition-colors"
              >
                How It Works
              </button>
              <button
                className="text-gray-700 hover:text-purple-600 transition-colors"
              >
                <a href="https://youtu.be/_xydMRbdMp8?si=6JVRw7iniWD3jPsZ" target="_blank">Demo</a>
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-left px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="text-left px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => navigate("/auth")}
                  className="mx-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg text-center"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full mb-6">
              <span className="text-purple-700 text-sm font-semibold">
                🎯 The Ultimate Networking Game
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Break the Ice,
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Build Connections
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Transform awkward networking events into engaging experiences with
              our interactive bingo game. Perfect for conferences, team
              building, and corporate events.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={() => navigate("/auth")}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 text-lg w-full sm:w-auto"
              >
                🚀 Start Playing Now
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="px-8 py-4 bg-white border-2 border-purple-500 text-purple-600 font-bold rounded-xl shadow-md hover:bg-purple-50 transition-all transform hover:scale-105 text-lg w-full sm:w-auto"
              >
                📖 Learn How It Works
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">
                  5min
                </div>
                <div className="text-sm text-gray-600">Setup Time</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  100+
                </div>
                <div className="text-sm text-gray-600">Players Support</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-green-600">
                  15+
                </div>
                <div className="text-sm text-gray-600">Topics</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-orange-600">
                  ∞
                </div>
                <div className="text-sm text-gray-600">Fun Guaranteed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-300 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-pink-300 rounded-full opacity-20 animate-pulse delay-500"></div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                What is Networking Bingo?
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A modern twist on the classic game that turns networking into an
              adventure
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎮</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Gamified Networking
                    </h3>
                    <p className="text-gray-600">
                      Transform boring introductions into an exciting game where
                      everyone wins by making meaningful connections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Customizable Content
                    </h3>
                    <p className="text-gray-600">
                      Choose from pre-made topic templates or create custom
                      questions tailored to your event's unique needs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Real-time Tracking
                    </h3>
                    <p className="text-gray-600">
                      Watch as connections form in real-time with live
                      leaderboards and instant score updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8">
                <div className="bg-white rounded-xl shadow-xl p-6">
                  {/* Sample Bingo Card */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs p-2 text-center font-medium ${
                          i === 4
                            ? "bg-green-100 border-2 border-green-400"
                            : i % 2 === 0
                            ? "bg-purple-50 border border-purple-200"
                            : "bg-blue-50 border border-blue-200"
                        }`}
                      >
                        {i === 0 && "Speaks 3+ languages"}
                        {i === 1 && "Has a pet"}
                        {i === 2 && "Travels for work"}
                        {i === 3 && "Morning person"}
                        {i === 4 && "✓ Loves coffee"}
                        {i === 5 && "Plays sports"}
                        {i === 6 && "Has a side project"}
                        {i === 7 && "Reads daily"}
                        {i === 8 && "Podcast fan"}
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    Sample Bingo Card
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need to run successful networking events
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Setup</h3>
              <p className="text-gray-600">
                Create a game in under 5 minutes with our intuitive setup wizard
                and pre-made templates.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Unlimited Players</h3>
              <p className="text-gray-600">
                Support for small team meetings to large conferences with
                hundreds of participants.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Custom Themes</h3>
              <p className="text-gray-600">
                Choose from 15+ topic templates or create your own custom
                questions for any occasion.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
              <p className="text-gray-600">
                Works seamlessly on all devices - phones, tablets, and desktops
                with no app download required.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Leaderboard</h3>
              <p className="text-gray-600">
                Real-time scoring with automatic winner detection and
                celebration animations.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Sharing</h3>
              <p className="text-gray-600">
                Share games instantly with QR codes, links, or room codes -
                players join in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Get your networking event started in just 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <div className="mt-4">
                  <div className="text-3xl mb-3">👑</div>
                  <h3 className="text-lg font-semibold mb-2">Admin Creates</h3>
                  <p className="text-gray-600 text-sm">
                    Event organizer sets up a game, chooses topic theme, and
                    customizes questions
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <div className="mt-4">
                  <div className="text-3xl mb-3">📲</div>
                  <h3 className="text-lg font-semibold mb-2">Players Join</h3>
                  <p className="text-gray-600 text-sm">
                    Participants scan QR code or enter room code to instantly
                    join the game
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
                <div className="mt-4">
                  <div className="text-3xl mb-3">🤝</div>
                  <h3 className="text-lg font-semibold mb-2">Network & Play</h3>
                  <p className="text-gray-600 text-sm">
                    Meet people, find matches for bingo squares, and mark them
                    off your card
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
                <div className="mt-4">
                  <div className="text-3xl mb-3">🏆</div>
                  <h3 className="text-lg font-semibold mb-2">Win & Share</h3>
                  <p className="text-gray-600 text-sm">
                    Complete your card first to win! View live scores and share
                    results
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Perfect For Every Event
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              From corporate conferences to casual meetups, we've got you
              covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-6 text-white">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-xl font-semibold mb-2">Corporate Events</h3>
              <p className="text-purple-100">
                Perfect for conferences, seminars, and company mixers. Break
                down silos and foster cross-department connections.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-green-500 rounded-xl p-6 text-white">
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="text-xl font-semibold mb-2">
                Educational Settings
              </h3>
              <p className="text-blue-100">
                Ideal for orientations, alumni events, and academic conferences.
                Help students and faculty connect meaningfully.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-yellow-500 rounded-xl p-6 text-white">
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="text-xl font-semibold mb-2">Social Gatherings</h3>
              <p className="text-green-100">
                Great for meetups, parties, and community events. Turn strangers
                into friends with engaging activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                What People Are Saying
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Join thousands of event organizers who've transformed their
              networking events
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "This completely transformed our company mixer! People were
                actually excited to meet each other instead of standing
                awkwardly by the snacks."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">
                  SK
                </div>
                <div className="ml-3">
                  <div className="font-semibold">Sarah Kim</div>
                  <div className="text-sm text-gray-500">HR Director</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "We used this at our tech conference with 200+ attendees. The
                setup was incredibly easy and everyone loved it!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center font-bold text-blue-700">
                  MR
                </div>
                <div className="ml-3">
                  <div className="font-semibold">Michael Rodriguez</div>
                  <div className="text-sm text-gray-500">Event Organizer</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                "The AI-generated questions were spot-on for our topic. Saved
                us hours of preparation time!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center font-bold text-green-700">
                  AL
                </div>
                <div className="ml-3">
                  <div className="font-semibold">Amanda Liu</div>
                  <div className="text-sm text-gray-500">Conference Chair</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Next Event?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of event organizers who've made networking fun again.
            Start your first game in minutes!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/auth")}
              className="px-8 py-4 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105 text-lg"
            >
              🚀 Get Started Free
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all transform hover:scale-105 text-lg"
            >
              📋 View All Features
            </button>
          </div>
          <p className="text-purple-200 mt-6 text-sm">
            No credit card required • Setup in 5 minutes • Unlimited players
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                How many players can join a game?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                Our platform supports unlimited players! 
              </p>
            </details>

            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                Do players need to download an app?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                No app download required! Networking Bingo is completely
                web-based. Players simply scan a QR code or enter a room code in
                their browser to join instantly.
              </p>
            </details>

            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                Can I customize the bingo questions?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                Absolutely! You can use our AI-powered question generator,
                choose from 15+ topic templates, manually enter your own
                questions, or upload a file with custom prompts. The choice is
                yours!
              </p>
            </details>

            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                How long does a typical game last?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                Game duration is completely customizable! Most organizers set
                timers between 15-30 minutes, but you can adjust based on your
                event needs. The admin can also end the game manually at any
                time.
              </p>
            </details>

            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                Is there a cost to use the platform?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                Networking Bingo is free to use! Create unlimited games, invite
                unlimited players, and access all features without any hidden
                costs or subscriptions.
              </p>
            </details>

            <details className="bg-white rounded-xl p-6 shadow-lg group">
              <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                Can I see a demo before signing up?
                <span className="text-purple-600 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-gray-600">
                Definitely! Check out our <a target="blank" className="text-blue-600 underline" href="https://youtu.be/_xydMRbdMp8?si=6JVRw7iniWD3jPsZ">demo video</a> to see the platform in action and learn how easy it is to set up and run a game.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      id="gHeartFooter"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="100%" stopColor="#FFA500" />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#gHeartFooter)"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
                <span className="text-xl font-bold">Networking Bingo</span>
              </div>
              <p className="text-gray-400 mb-4">
                Making networking fun, one connection at a time. Transform your
                events into memorable experiences.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => scrollToSection("about")}
                    className="hover:text-white transition-colors"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works")}
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                 <li>
                  <button
                    className="hover:text-white transition-colors text-decoration-none"
                  >
                   <a target="blank" href="https://youtu.be/_xydMRbdMp8?si=6JVRw7iniWD3jPsZ">Demo</a> 
                  </button>
                </li>
              </ul>
            </div>

            {/* Get Started */}
            <div>
              <h4 className="font-semibold mb-4">Get Started</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => navigate("/auth")}
                    className="hover:text-white transition-colors"
                  >
                    Sign Up
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/auth")}
                    className="hover:text-white transition-colors"
                  >
                    Log In
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/admin/setup")}
                    className="hover:text-white transition-colors"
                  >
                    Create Game
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p className="mb-2">
              © {new Date().getFullYear()} Suleiman Shaibu - Networking Bingo.
              All rights reserved.
            </p>
            <p className="text-sm">
              Built with 💜 for better networking experiences
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Book, Pen, Backpack, GraduationCap, Library, Notebook, Pencil, School, Scissors, Ruler, Brain, Globe, Code, Laptop, Calculator, Microscope, FlaskConical, Palette, Music, Headphones, Gamepad, Watch, Tablet, BookOpen, Highlighter, FileText, Clipboard, Award, Star, Lightbulb } from 'lucide-react';

const FloatingIcon = ({ icon: Icon, delay, duration, startX, startY, endX, endY, size = 24, opacity = 0.65 }) => {
  return (
    <div 
      className="absolute text-sky-500/40"
      style={{
        animation: `float-${delay} ${duration}s ease-in-out infinite`,
        left: `${startX}%`,
        top: `${startY}%`,
        transform: 'translateZ(0)',
        opacity: opacity,
        zIndex: 1,
      }}
    >
      <Icon size={size} className="drop-shadow-lg brightness-125" />
      <style jsx>{`
        @keyframes float-${delay} {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.6);
            opacity: ${opacity * 0.4};
          }
          25% {
            opacity: ${opacity * 0.9};
            transform: translate3d(${(endX - startX) * 0.3}vw, ${(endY - startY) * 0.3}vh, 10px) rotate(90deg) scale(1.1);
          }
          50% {
            opacity: ${opacity};
            transform: translate3d(${endX - startX}vw, ${endY - startY}vh, 20px) rotate(180deg) scale(1.3);
          }
          75% {
            opacity: ${opacity * 0.8};
            transform: translate3d(${(endX - startX) * 1.3}vw, ${(endY - startY) * 1.3}vh, 10px) rotate(270deg) scale(1.1);
          }
          100% {
            transform: translate3d(${(endX - startX) * 1.6}vw, ${(endY - startY) * 1.6}vh, 0) rotate(360deg) scale(0.6);
            opacity: ${opacity * 0.4};
          }
        }
      `}</style>
    </div>
  );
};

const ParticleEffect = ({ count = 80 }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 5 + 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: Math.random() * 15 + 15,
    delay: Math.random() * 8,
  }));

  return (
    <>
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-sky-400/20"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animation: `particle-float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            zIndex: 1,
          }}
        />
      ))}
    </>
  );
};

const CircuitLine = ({ id, points, duration = 20, delay = 0 }) => {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        animation: `circuit-glow-${id} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        zIndex: 1,
      }}
    >
      <path
        d={points}
        fill="none"
        stroke="url(#circuitGradient)"
        strokeWidth="0.8"
        strokeDasharray="4 4"
        className="opacity-40"
      />
      <defs>
        <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <style jsx>{`
        @keyframes circuit-glow-${id} {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </svg>
  );
};

const AnimatedGrid = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute border border-sky-400/20"
          style={{
            left: `${(i * 4)}%`,
            top: 0,
            bottom: 0,
            width: '1px',
            animation: `grid-pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute border border-sky-400/20"
          style={{
            top: `${(i * 4)}%`,
            left: 0,
            right: 0,
            height: '1px',
            animation: `grid-pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

const ShieldCheck = ({ size = 16, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function StudentLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const floatingIcons = [
    { icon: Book, delay: 1, duration: 25, startX: 5, startY: 15, endX: 85, endY: 75, size: 36, opacity: 0.6 },
    { icon: Pen, delay: 2, duration: 30, startX: 95, startY: 8, endX: 15, endY: 85, size: 32, opacity: 0.55 },
    { icon: Backpack, delay: 3, duration: 22, startX: 2, startY: 85, endX: 90, endY: 10, size: 34, opacity: 0.65 },
    { icon: GraduationCap, delay: 4, duration: 35, startX: 98, startY: 65, endX: 8, endY: 25, size: 30, opacity: 0.5 },
    { icon: Library, delay: 5, duration: 28, startX: 45, startY: 2, endX: 65, endY: 95, size: 33, opacity: 0.6 },
    { icon: Notebook, delay: 6, duration: 24, startX: 25, startY: 95, endX: 75, endY: 15, size: 35, opacity: 0.65 },
    { icon: Pencil, delay: 7, duration: 32, startX: 85, startY: 90, endX: 35, endY: 20, size: 31, opacity: 0.55 },
    { icon: School, delay: 8, duration: 26, startX: 15, startY: 45, endX: 95, endY: 55, size: 38, opacity: 0.6 },
    { icon: Scissors, delay: 9, duration: 33, startX: 70, startY: 5, endX: 30, endY: 90, size: 34, opacity: 0.65 },
    { icon: Ruler, delay: 10, duration: 25, startX: 10, startY: 70, endX: 80, endY: 35, size: 32, opacity: 0.55 },
    { icon: Brain, delay: 11, duration: 29, startX: 90, startY: 30, endX: 20, endY: 80, size: 33, opacity: 0.6 },
    { icon: Globe, delay: 12, duration: 36, startX: 55, startY: 85, endX: 45, endY: 12, size: 35, opacity: 0.65 },
    { icon: Code, delay: 13, duration: 23, startX: 35, startY: 25, endX: 78, endY: 70, size: 31, opacity: 0.55 },
    { icon: Laptop, delay: 14, duration: 31, startX: 88, startY: 50, endX: 12, endY: 45, size: 36, opacity: 0.6 },
    { icon: Calculator, delay: 15, duration: 27, startX: 60, startY: 95, endX: 40, endY: 5, size: 32, opacity: 0.65 },
    { icon: Microscope, delay: 16, duration: 34, startX: 20, startY: 10, endX: 80, endY: 90, size: 34, opacity: 0.55 },
    { icon: FlaskConical, delay: 17, duration: 26, startX: 90, startY: 70, endX: 10, endY: 30, size: 30, opacity: 0.6 },
    { icon: Palette, delay: 18, duration: 32, startX: 5, startY: 50, endX: 95, endY: 50, size: 33, opacity: 0.65 },
    { icon: Music, delay: 19, duration: 28, startX: 75, startY: 15, endX: 25, endY: 85, size: 35, opacity: 0.55 },
    { icon: Headphones, delay: 20, duration: 35, startX: 40, startY: 80, endX: 60, endY: 20, size: 31, opacity: 0.6 },
    { icon: Gamepad, delay: 21, duration: 24, startX: 15, startY: 20, endX: 85, endY: 80, size: 34, opacity: 0.65 },
    { icon: Watch, delay: 22, duration: 33, startX: 85, startY: 40, endX: 15, endY: 60, size: 36, opacity: 0.55 },
    { icon: Tablet, delay: 23, duration: 29, startX: 30, startY: 60, endX: 70, endY: 40, size: 32, opacity: 0.6 },
    { icon: BookOpen, delay: 24, duration: 26, startX: 65, startY: 25, endX: 35, endY: 75, size: 33, opacity: 0.65 },
    { icon: Highlighter, delay: 25, duration: 37, startX: 10, startY: 35, endX: 90, endY: 65, size: 37, opacity: 0.55 },
    { icon: FileText, delay: 26, duration: 25, startX: 50, startY: 5, endX: 50, endY: 95, size: 34, opacity: 0.6 },
    { icon: Clipboard, delay: 27, duration: 31, startX: 25, startY: 75, endX: 75, endY: 25, size: 31, opacity: 0.65 },
    { icon: Award, delay: 28, duration: 28, startX: 80, startY: 85, endX: 20, endY: 15, size: 35, opacity: 0.55 },
    { icon: Star, delay: 29, duration: 34, startX: 45, startY: 45, endX: 55, endY: 55, size: 33, opacity: 0.6 },
    { icon: Lightbulb, delay: 30, duration: 23, startX: 70, startY: 55, endX: 30, endY: 45, size: 30, opacity: 0.65 },
  ];

  const circuitLines = [
    { id: 1, points: "M0,20 Q100,0 200,50 T400,30 T600,70 T800,10 T1000,40", duration: 25 },
    { id: 2, points: "M0,80 Q150,100 300,60 T600,90 T800,40 T1000,70", duration: 30 },
    { id: 3, points: "M0,60 Q200,30 400,80 T600,20 T800,60 T1000,30", duration: 35 },
  ];

  return (
    <div className="relative bg-white overflow-hidden h-[80vh] w-[95vw] mx-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedGrid />
        {circuitLines.map(line => (
          <CircuitLine key={line.id} {...line} />
        ))}
        <ParticleEffect count={100} />
        {floatingIcons.map((iconProps, index) => (
          <FloatingIcon key={`icon-${index}`} {...iconProps} />
        ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1396px] mx-auto">
        {/* Main Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[65vh]">
          
          {/* Left Panel - Image Section (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center justify-center p-4 lg:p-8 border border-sky-400 rounded-2xl lg:rounded-r-none lg:border-r-0">
            <div className="relative w-full max-w-2xl flex items-center justify-center h-full">
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-transparent">
                <img 
                  src="/images/loginimg.webp" 
                  alt="Student Login" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sky-600/20 via-transparent to-sky-400/10"></div>
              </div>
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-sky-400/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-sky-300/15 rounded-full blur-xl animate-pulse-slow"></div>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 border border-sky-400 rounded-2xl lg:rounded-l-none lg:border-l-0">
            <div className="relative w-full max-w-lg h-full flex items-center justify-center">
              <div className="relative bg-transparent rounded-lg p-6 sm:p-8 xl:p-12 w-full">
                {/* Header Section */}
                <div className="relative text-center mb-6 sm:mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-white/30 to-white/20 rounded-2xl mb-4 border border-white/40">
                    <Book size={28} className="text-sky-600 drop-shadow-lg" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-sky-800 mb-2 sm:mb-3 drop-shadow-lg">
                    Student Portal
                  </h1>
                  <p className="text-sky-600/90 text-sm sm:text-base font-medium">Access your learning platform</p>
                  <div className="flex items-center justify-center space-x-4 sm:space-x-6 mt-3 sm:mt-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-sky-600/80 text-xs sm:text-sm font-medium">System Online</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-sky-400 rounded-full shadow-lg"></div>
                      <span className="text-sky-600/80 text-xs sm:text-sm font-medium">Secure</span>
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="relative space-y-4 sm:space-y-6">
                  <div className="group">
                    <label className="block text-xs sm:text-sm font-semibold text-sky-700/90 mb-2 uppercase tracking-wide">
                      Student Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-sky-500 group-focus-within:text-sky-600 transition-colors duration-300" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white/40 border border-sky-200/50 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300 transition-all duration-300 backdrop-blur-sm hover:bg-white/50 text-sky-800 placeholder-sky-600/70 font-medium text-sm sm:text-base"
                        placeholder="Enter your student email"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-xs sm:text-sm font-semibold text-sky-700/90 mb-2 uppercase tracking-wide">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-sky-500 group-focus-within:text-sky-600 transition-colors duration-300" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 bg-white/40 border border-sky-200/50 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300 transition-all duration-300 backdrop-blur-sm hover:bg-white/50 text-sky-800 placeholder-sky-600/70 font-medium text-sm sm:text-base"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-sky-500 hover:text-sky-600 transition-colors duration-300"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <label className="flex items-center space-x-2">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg border-2 border-sky-400 text-sky-600 focus:ring-2 focus:ring-sky-300/50 transition-all duration-300 bg-white/40" 
                        />
                      </div>
                      <span className="text-sky-700/90 font-medium">Remember this device</span>
                    </label>
                    <a href="#" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors duration-300 hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => console.log('Student login clicked')}
                    className="w-full group relative bg-gradient-to-r from-sky-500 to-sky-600 text-white py-3 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-bold transform transition-all duration-500 hover:scale-105 hover:-translate-y-1 focus:ring-2 focus:ring-sky-300/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="relative flex items-center justify-center text-sm sm:text-base">
                      Sign In
                      <svg className="ml-2 w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
              <div className="absolute -z-10 -top-4 -left-4 w-16 h-16 bg-sky-300/20 rounded-full blur-lg"></div>
              <div className="absolute -z-10 -bottom-4 -right-4 w-20 h-20 bg-sky-400/15 rounded-full blur-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.7; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-pulse-slower {
          animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }

        /* Mobile-specific optimizations */
        @media (max-width: 1024px) {
          .h-[80vh] {
            height: 100vh;
          }
          .w-[95vw] {
            width: 100vw;
          }
          .min-h-[65vh] {
            min-height: 100vh;
          }
          input, button, a {
            font-size: 16px; /* Prevents zoom on iOS */
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
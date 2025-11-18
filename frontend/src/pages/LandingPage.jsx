import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Users, ArrowRight, Zap, Video, MessageCircle, Target, Calendar, Shield, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleLoginClick = () => {
    navigate('/student');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-200/40 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-sky-200/40 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Navbar - Full Width with Background */}
      <nav className={`z-40 bg-indigo-800 sticky top-0 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="w-full">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white shadow-sm backdrop-blur-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">PeerPrep</h1>
                <p className="text-xs text-indigo-200 -mt-1">Interview Practice Platform</p>
              </div>
            </div>

            <button 
              onClick={handleLoginClick} 
              className="px-6 py-2.5 bg-white text-indigo-800 rounded-lg font-semibold shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 hover:bg-indigo-50"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <section className={`relative z-10 py-20 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-indigo-200 shadow-sm">
                <Zap className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold text-indigo-700">AI-Powered Peer Practice</span>
              </div>

              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                  Master Interview Skills
                  <span className="block text-indigo-800">
                    Through Peer Practice
                  </span>
                </h1>

                <p className="text-lg text-slate-700 leading-relaxed">
                  Connect with students worldwide, practice real interviews, and get constructive feedback. 
                  Build confidence and excel in your career with our collaborative learning platform.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleLoginClick}
                  className="group px-8 py-3.5 bg-sky-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 hover:bg-sky-600"
                >
                  Start Practicing Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                
              </div>
            </div>

            {/* Right - Video Call Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-600 to-sky-500 rounded-2xl p-1 shadow-2xl">
                <div className="bg-white rounded-xl p-6">
                  {/* Video Call Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-medium text-slate-600">Live Interview Session</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Video Call Content */}
                  <div className="space-y-4">
                    {/* Main Video Area */}
                    <div className="bg-gradient-to-br from-slate-100 to-blue-100 rounded-xl p-6 border border-slate-200">
                      <div className="flex justify-center items-center gap-8">
                        {/* Left Person */}
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg mb-3">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">I</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-800">Mentor</p>
                            <p className="text-xs text-slate-600">Sarah Chen</p>
                          </div>
                        </div>

                        {/* VS Separator */}
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-slate-600">VS</span>
                          </div>
                        </div>

                        {/* Right Person */}
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg mb-3">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">S</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-800">Student</p>
                            <p className="text-xs text-slate-600">Alex Kumar</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Call Status */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-600 font-medium">Live - 12:45</span>
                    </div>

                    {/* Call Controls */}
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer">
                        <div className="w-4 h-4 bg-slate-600 rounded"></div>
                      </div>
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer">
                        <div className="w-4 h-4 bg-slate-600 rounded"></div>
                      </div>
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded"></div>
                      </div>
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer">
                        <div className="w-4 h-4 bg-slate-600 rounded"></div>
                      </div>
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer">
                        <div className="w-4 h-4 bg-slate-600 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Smaller Boxes */}
      <section className="relative z-10 py-20 bg-gradient-to-br from-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to 
              <span className="text-indigo-800"> Succeed</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Comprehensive tools and features designed for effective interview preparation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Smart Matching',
                description: 'AI-powered algorithm connects you with ideal practice partners',
                bgColor: 'bg-indigo-50',
                borderColor: 'border-indigo-200',
                iconColor: 'bg-indigo-600'
              },
              {
                icon: Video,
                title: 'Live Practice',
                description: 'Real-time video interviews with professional tools',
                bgColor: 'bg-sky-50',
                borderColor: 'border-sky-200',
                iconColor: 'bg-sky-500'
              },
              {
                icon: MessageCircle,
                title: 'Detailed Feedback',
                description: 'Constructive feedback with actionable insights',
                bgColor: 'bg-teal-50',
                borderColor: 'border-teal-200',
                iconColor: 'bg-teal-500'
              },
              {
                icon: Target,
                title: 'Progress Tracking',
                description: 'Monitor your improvement across key metrics',
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                iconColor: 'bg-blue-500'
              },
              {
                icon: Calendar,
                title: 'Flexible Scheduling',
                description: 'Practice anytime that works for you',
                bgColor: 'bg-purple-50',
                borderColor: 'border-purple-200',
                iconColor: 'bg-purple-500'
              },
              {
                icon: Shield,
                title: 'Secure Platform',
                description: 'Safe environment with verified students',
                bgColor: 'bg-emerald-50',
                borderColor: 'border-emerald-200',
                iconColor: 'bg-emerald-500'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`group p-6 ${feature.bgColor} rounded-xl border-2 ${feature.borderColor} transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:border-indigo-300`}
              >
                <div className={`w-12 h-12 ${feature.iconColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="bg-gradient-to-r from-indigo-700 to-sky-600 rounded-2xl p-12 shadow-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Interview Skills?
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of students worldwide who are mastering interviews through collaborative practice.
            </p>
            <button 
              onClick={handleLoginClick}
              className="group px-10 py-4 bg-white text-indigo-800 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center gap-3 mx-auto hover:bg-indigo-50"
            >
              Start Practicing Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
import React from 'react';
import { Footer } from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-sky-600 hover:text-sky-700 mb-6 transition-colors duration-200"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to PeerPrep Mock Interview System. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mock interview platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">2.1 Personal Information</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We collect the following personal information when you register and use our platform:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 mt-2 ml-4 space-y-1">
                    <li>Full name and student ID</li>
                    <li>Email address</li>
                    <li>Login credentials (encrypted passwords)</li>
                    <li>Profile information (role, specialization)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">2.2 Usage Information</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We automatically collect certain information about your device and usage patterns:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 mt-2 ml-4 space-y-1">
                    <li>Interview session details and schedules</li>
                    <li>Feedback submissions and ratings</li>
                    <li>Time slot proposals and acceptances</li>
                    <li>System interaction logs and activity timestamps</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4 space-y-2">
                <li><strong>Platform Operations:</strong> To facilitate mock interview sessions, schedule management, and pairing between interviewers and interviewees</li>
                <li><strong>Communication:</strong> To send notifications about scheduled interviews, slot proposals, confirmations, and feedback requests</li>
                <li><strong>User Authentication:</strong> To verify your identity and maintain secure access to your account</li>
                <li><strong>Performance Improvement:</strong> To analyze usage patterns and improve our platform features and user experience</li>
                <li><strong>Feedback Management:</strong> To collect, store, and display feedback from interview sessions for educational purposes</li>
                <li><strong>Administrative Tasks:</strong> To manage events, users, and system configurations by authorized administrators</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We do not sell or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4 space-y-2">
                <li><strong>Within the Platform:</strong> Your name and basic information may be visible to your interview partners during scheduled sessions</li>
                <li><strong>Feedback Sharing:</strong> Feedback you provide may be shared with the interviewee for educational purposes</li>
                <li><strong>Administrative Access:</strong> Platform administrators have access to user data for system management and support purposes</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect the rights, property, or safety of our users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mt-2 ml-4 space-y-1">
                <li>Encrypted password storage using bcrypt hashing</li>
                <li>Secure JWT-based authentication tokens</li>
                <li>HTTPS encryption for data transmission</li>
                <li>Regular security updates and monitoring</li>
                <li>Access controls and role-based permissions</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide services. Interview records, feedback, and session history may be retained for educational and administrative purposes. You may request deletion of your data by contacting us at peerprep62@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed">
                We use browser local storage to maintain your login session and remember your preferences. We do not use third-party tracking cookies for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                <li>Access and review your personal data</li>
                <li>Request corrections to inaccurate information</li>
                <li>Change your password at any time</li>
                <li>Request account deletion and data removal</li>
                <li>Opt-out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our platform is intended for educational institutions and their students. We do not knowingly collect information from children under 13 without parental consent. If you believe we have collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-gray-800 font-medium">Email: <a href="mailto:peerprep62@gmail.com" className="text-sky-600 hover:text-sky-700">peerprep62@gmail.com</a></p>
                <p className="text-gray-800 font-medium mt-1">Support Contact: <a href="mailto:gehuashishharg@gmail.com" className="text-sky-600 hover:text-sky-700">gehuashishharg@gmail.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

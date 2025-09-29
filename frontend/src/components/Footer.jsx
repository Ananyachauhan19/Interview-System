import React from 'react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 py-6 text-center w-full shadow-sm border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm font-medium mb-2 md:mb-0">
            &copy; {new Date().getFullYear()} Interview Management System. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="/privacy" className="hover:text-blue-600 transition-colors duration-200">Privacy Policy</a>
            <a href="/terms" className="hover:text-blue-600 transition-colors duration-200">Terms of Service</a>
            <a href="/contact" className="hover:text-blue-600 transition-colors duration-200">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
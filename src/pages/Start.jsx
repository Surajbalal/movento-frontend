import React from 'react'
import logo from "../assets/logo.png";
import traffic from '../assets/traffic8.jpg'
import { Link } from 'react-router-dom';
function Start() {
  return (
    <div className="min-h-screen flex flex-col justify-between w-full">
      <div 
        className="flex-1 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${traffic})` }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-black/20 to-black/40"></div>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <img className="w-12 sm:w-16" src={logo} alt="Uber Logo" />
        </div>
      </div>
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 text-gray-900 text-center">
            Get Started with Uber
          </h2>
          <Link 
            to="/login" 
            className="flex items-center justify-center w-full bg-black text-white py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300 transform hover:scale-105"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Start;
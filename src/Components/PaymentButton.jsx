import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance";

const PaymentButton = ({ rideId, userId, amount, paymentStatus }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Razorpay SDK
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (paymentStatus === "paid" || isProcessing) return;

    setIsProcessing(true);
    console.log("KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID);
    const isLoaded = await loadRazorpay();
    console.log(userId, rideId, amount);
    if (!isLoaded) {
      alert("Razorpay SDK failed to load");
      setIsProcessing(false);
      return;
    }

    try {
      // API call for creating an order
      const { data } = await axiosInstance.post("/api/payment/create-order", {
        amount,
        rideId,
        userId,
      });

      // Configure Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        name: "Movento",
        description: "Ride Payment",
        order_id: data.order.id,

        handler: function (response) {
          console.log("Payment Success:", response);
        },

        prefill: {
          name: "User",
          email: "user@email.com",
          contact: "9999999999",
        },
        method: {
          upi: true,
        },
        theme: {
          color: "#18181b",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      // Create Razorpay instance
      const rzp = new window.Razorpay(options);

      // Handle failure event
      rzp.on("payment.failed", function (response) {
        console.log("Payment Failed:", response.error);
        alert("Payment failed");
        setIsProcessing(false);
      });

      // Open payment popup
      rzp.open();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong");
      setIsProcessing(false);
    }
  };

  const isPaid = paymentStatus === "paid";
  const isFailed = paymentStatus === "failed";

  return (
    <button
      disabled={isPaid}
      onClick={handlePayment}
      className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-[15px] transition-all duration-300 focus:outline-none ${
        isPaid
          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200 cursor-default"
          : isFailed
          ? "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 active:scale-[0.98]"
          : isProcessing
          ? "bg-gray-200 text-gray-500 cursor-wait"
          : "bg-gray-900 text-white shadow-lg shadow-gray-300 hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-400 active:scale-[0.98]"
      }`}
    >
      {isPaid ? (
        <>
          <i className="ri-checkbox-circle-fill text-lg"></i>
          <span>Payment Complete</span>
        </>
      ) : isFailed ? (
        <>
          <i className="ri-error-warning-line text-lg"></i>
          <span>Retry Payment • ₹{amount}</span>
        </>
      ) : isProcessing ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <i className="ri-bank-card-line text-lg"></i>
          <span>Pay ₹{amount}</span>
        </>
      )}
    </button>
  );
};

export default PaymentButton;
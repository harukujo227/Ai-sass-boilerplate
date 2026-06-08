"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FaCheck, FaInfoCircle, FaArrowLeft, FaDollarSign } from "react-icons/fa";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const PLANS = [
  { id: "basic", name: "Basic Pack", price: "$5", credits: 100, description: "Perfect for testing custom prompts and exploring styles." },
  { id: "standard", name: "Standard Pack", price: "$10", credits: 250, description: "Ideal for regular creators wanting high resolution outputs." },
  { id: "pro", name: "Professional Pack", price: "$20", credits: 600, description: "Designed for power users demanding batch exports and high speed.", popular: true },
  { id: "business", name: "Business Pack", price: "$50", credits: 2000, description: "Maximum value pack for agency workflows and large volume generations." }
];

export default function AppInstancePricing({ params }) {
  const resolvedParams = use(params);
  const appId = resolvedParams.appId;

  const { data: session, status } = useSession();
  const [appInstance, setAppInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(null);

  useEffect(() => {
    const fetchAppDetails = async () => {
      try {
        const { data: app } = await axios.get(`/api/app-instances?id=${appId}`);
        setAppInstance(app);
      } catch (err) {
        console.error("Error loading app details:", err);
        toast.error("Failed to load application pricing context.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppDetails();
  }, [appId]);

  const handleCheckout = async (planId) => {
    if (status !== "authenticated") {
      toast.error("You must sign in with Google to purchase credit packages.");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data } = await axios.post("/api/checkout", { planId });
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirection URL returned");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to trigger Stripe checkout session.");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col bg-bg-page select-none text-primary-text">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!appInstance) {
    return (
      <div className="min-h-dvh flex flex-col bg-bg-page select-none text-primary-text">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <FaInfoCircle className="text-3xl opacity-20 mb-2" />
          <h2 className="text-sm font-extrabold uppercase">App Not Found</h2>
          <p className="text-xs text-secondary-text">The requested application pricing page does not exist or access is denied.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page select-none text-primary-text overflow-hidden">
      <Toaster position="top-right" />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col gap-10 overflow-y-auto scrollbar-subtle items-center">
        
        {/* Workspace Title & Back Button */}
        <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-divider/40 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-1">
              <FaInfoCircle className="text-primary text-xs" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{appInstance.name} Top-Up</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Buy Credit Pack</h1>
          </div>
          <Link
            href={`/app/${appId}`}
            className="flex items-center gap-2 bg-bg-card hover:bg-bg-page border border-divider px-4 py-2 rounded-full text-xs font-bold transition-all shadow active:scale-95 text-secondary-text hover:text-primary-text cursor-pointer"
          >
            <FaArrowLeft size={10} /> Back to Workspace
          </Link>
        </div>

        {/* Credit Indicator panel */}
        {session?.user && (
          <div className="bg-bg-card border border-divider/50 p-4 rounded-lg flex items-center justify-between gap-4 max-w-md w-full shadow-md">
            <div>
              <span className="text-[10px] font-black uppercase text-secondary-text tracking-widest block">Available Balance</span>
              <span className="text-xs text-secondary-text font-semibold">Ready for custom generations</span>
            </div>
            <div className="text-xl font-black text-white flex items-center gap-1">
              <FaDollarSign className="text-emerald-500 text-sm" />
              <span>{session.user.credits || 0} Credits</span>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-bg-card border rounded-lg p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                plan.popular ? "border-primary shadow-xl shadow-primary/5 scale-105" : "border-divider/50 shadow-md"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary-text">{plan.name}</h3>
                  <p className="text-2xl font-black tracking-tight text-white">{plan.price}</p>
                </div>
                
                <div className="text-xs bg-bg-page/50 border border-divider/30 p-3 rounded text-center font-extrabold text-primary">
                  {plan.credits} Art Credits
                </div>

                <p className="text-xs text-secondary-text leading-relaxed font-medium min-h-[3rem]">{plan.description}</p>
                
                <ul className="space-y-2 border-t border-divider/30 pt-4 text-xs font-semibold text-secondary-text">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>Dynamic aspect ratios</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>HD image downloads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>No subscription required</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer select-none active:scale-[0.98] ${
                  plan.popular ? "bg-primary text-white hover:bg-primary-hover shadow-primary/15" : "bg-bg-page hover:bg-bg-card text-primary-text border border-divider"
                }`}
              >
                {loadingPlan === plan.id ? "Loading checkout..." : "Purchase Credits"}
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

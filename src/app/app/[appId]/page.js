"use client";

import { use, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getTemplate } from "@/lib/registry";
import { FaImage } from "react-icons/fa";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function AppInstanceWorkspace({ params }) {
  const resolvedParams = use(params);
  const appId = resolvedParams.appId;

  const [appInstance, setAppInstance] = useState(null);
  const [activeCreation, setActiveCreation] = useState(null);
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppData = async () => {
    try {
      const { data: app } = await axios.get(`/api/app-instances?id=${appId}`);
      setAppInstance(app);

      const { data: userCreations } = await axios.get(`/api/creations?appId=${appId}`);
      setCreations(userCreations || []);

      if (userCreations && userCreations.length > 0) {
        // Find latest active creation or default to first
        const processing = userCreations.find(c => c.status === "processing");
        setActiveCreation(processing || userCreations[0]);
      }
    } catch (err) {
      console.error("Error loading app instance:", err);
      toast.error("Failed to load application workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, [appId]);

  useEffect(() => {
    if (appInstance) {
      const parsed = appInstance.config ? JSON.parse(appInstance.config) : {};
      const theme = parsed.theme || "slate-indigo";
      document.documentElement.setAttribute("data-theme", theme);
      return () => {
        document.documentElement.removeAttribute("data-theme");
      };
    }
  }, [appInstance]);

  // Polling loop: update creations if any are "processing"
  useEffect(() => {
    const hasProcessing = creations.some((c) => c.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchAppData();
    }, 4000);

    return () => clearInterval(interval);
  }, [creations]);

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
          <FaImage className="text-3xl opacity-20 mb-2" />
          <h2 className="text-sm font-extrabold uppercase">App Not Found</h2>
          <p className="text-xs text-secondary-text">The requested application workspace does not exist or access is denied.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const template = getTemplate(appInstance.templateId);
  const TemplateComponent = template ? template.component : null;

  return (
    <div className="min-h-dvh flex flex-col bg-bg-page select-none text-primary-text overflow-hidden">
      <Toaster position="top-right" />
      <Navbar />

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 gap-6 overflow-y-auto scrollbar-subtle">
        
        {/* Workspace Title & Badge */}
        <div className="flex items-center justify-between border-b border-divider/40 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase tracking-tight text-white">{appInstance.name}</h1>
            <p className="text-xs text-secondary-text">Configure prompts and test generations live in this custom instance.</p>
          </div>
          <span className="text-[10px] uppercase font-black px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary tracking-widest shrink-0">
            {template ? template.name : "Custom App"}
          </span>
        </div>

        {/* Dynamic Template Component injection */}
        <div className="flex-1 flex items-center justify-center p-2">
          {TemplateComponent ? (
            <TemplateComponent
              appInstance={appInstance}
              activeCreation={activeCreation}
              onCreationCompleted={fetchAppData}
            />
          ) : (
            <div className="text-xs text-red-500 font-bold">
              Invalid template component registered.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

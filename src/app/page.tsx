"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FaRocket, FaCompass, FaRegFolderOpen, FaPlus, FaTrash, FaExternalLinkAlt, FaImage, FaMagic, FaArrowRight, FaDownload } from "react-icons/fa";
import { getAllTemplates } from "@/lib/registry";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

function CustomSelect({ value, onChange, options, placeholder = "Select option", className = "" }: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value };
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text flex items-center justify-between cursor-pointer select-none active:scale-[0.99] min-h-[38px]"
      >
        <span>{selectedOption.label}</span>
        <span className={`text-[8px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-bg-card border border-divider rounded shadow-2xl z-[150] py-1 max-h-48 overflow-y-auto scrollbar-subtle animate-scale-up">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer ${
                  value === opt.value ? "text-primary font-bold bg-primary/5" : "text-primary-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PlatformDashboard() {
  const { data: session, status } = useSession();
  const [appInstances, setAppInstances] = useState<any[]>([]);
  const [creationsCount, setCreationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // New App Form State
  const [showModal, setShowModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("ai-image");
  const [customPrompt, setCustomPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditCost, setCreditCost] = useState(1);
  const [modelEngine, setModelEngine] = useState("nano-banana-2");
  const [endpointOverride, setEndpointOverride] = useState("");
  const [editModelEngine, setEditModelEngine] = useState("");
  const [editEndpointOverride, setEditEndpointOverride] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("slate-indigo");

  // Parameter Designer State
  const [userParams, setUserParams] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [showParamsSection, setShowParamsSection] = useState(false);

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const detectedParams = Object.entries(parsed).map(([key, val]) => {
        let type = "text";
        let options: any[] = [];
        let defaultValue = val;
        let maxInputs = 1;

        const kLower = key.toLowerCase();
        const isListKey = kLower.includes("list") || Array.isArray(val);

        const isImgUrl = (s: any) => typeof s === "string" && s.startsWith("http") && /\.(jpg|jpeg|png|webp|gif)/i.test(s);
        const isVidUrl = (s: any) => typeof s === "string" && s.startsWith("http") && /\.(mp4|webm|mov|mkv)/i.test(s);
        const isAudUrl = (s: any) => typeof s === "string" && s.startsWith("http") && /\.(mp3|wav|m4a|ogg)/i.test(s);

        const valArray = Array.isArray(val) ? val : [val];
        const hasImgVal = valArray.some(isImgUrl);
        const hasVidVal = valArray.some(isVidUrl);
        const hasAudVal = valArray.some(isAudUrl);

        if (kLower.includes("image") || kLower.includes("img") || hasImgVal) {
          type = "image_list";
          maxInputs = isListKey ? 5 : 1;
          defaultValue = Array.isArray(val) ? val : (val ? [val] : []);
        } else if (kLower.includes("video") || hasVidVal) {
          type = "video_list";
          maxInputs = isListKey ? 5 : 1;
          defaultValue = Array.isArray(val) ? val : (val ? [val] : []);
        } else if (kLower.includes("audio") || hasAudVal) {
          type = "audio_list";
          maxInputs = isListKey ? 5 : 1;
          defaultValue = Array.isArray(val) ? val : (val ? [val] : []);
        } else if (typeof val === "boolean") {
          type = "boolean";
        } else if (typeof val === "number") {
          type = "number";
        } else if (typeof val === "string") {
          if (val.includes("\n")) {
            type = "textarea";
          } else if (["Auto", "1k", "2k", "4k", "jpg", "png", "webp"].includes(val) || val.includes(",")) {
            type = "enum";
            options = [val];
          } else {
            type = "text";
          }
        }

        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());

        return {
          key,
          label,
          type,
          defaultValue,
          options,
          optionsText: options.join(", "),
          min: 0,
          max: 100,
          step: 1,
          maxInputs
        };
      });
      
      setUserParams(detectedParams);
      toast.success(`Successfully parsed ${detectedParams.length} parameters!`);
      setShowJsonImport(false);
    } catch (err) {
      toast.error("Invalid JSON format. Please check your syntax.");
    }
  };

  const templates = getAllTemplates();

  const fetchDashboardData = async () => {
    if (status !== "authenticated") return;
    try {
      const { data: instances } = await axios.get("/api/app-instances");
      setAppInstances(instances || []);

      const { data: creations } = await axios.get("/api/creations");
      setCreationsCount(creations.length || 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const handleLaunchApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) {
      toast.error("Please enter a name for your application.");
      return;
    }

    setSubmitting(true);
    try {
      const matchingTemplate = templates.find(t => t.id === selectedTemplateId);
      const defaultSystemPrompt = matchingTemplate?.defaultConfig?.systemPrompt || "Standard instruction";

      const configObject = {
        systemPrompt: customPrompt || defaultSystemPrompt,
        aspectRatio: "1:1",
        model: modelEngine || (selectedTemplateId === "ai-image" ? "nano-banana-2" : selectedTemplateId === "ai-chat" ? "gpt-4o" : "openai-whisper"),
        creditCost: Number(creditCost) || 1,
        modelEndpoint: endpointOverride || (selectedTemplateId === "ai-chat" ? "chat/completions" : "predictions"),
        theme: selectedTheme || "slate-indigo",
        userParams: userParams,
        editModel: editModelEngine || "",
        editModelEndpoint: editEndpointOverride || ""
      };

      await axios.post("/api/app-instances", {
        name: newAppName,
        templateId: selectedTemplateId,
        config: configObject
      });

      toast.success("New template app launched successfully!");
      setNewAppName("");
      setCustomPrompt("");
      setCreditCost(1);
      setModelEngine("nano-banana-2");
      setEndpointOverride("");
      setEditModelEngine("");
      setEditEndpointOverride("");
      setSelectedTheme("slate-indigo");
      setUserParams([]);
      setJsonInput("");
      setShowParamsSection(false);
      setShowAdvanced(false);
      setShowModal(false);
      fetchDashboardData();
    } catch (err) {
      toast.error("Failed to launch application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template application instance? All data will be deleted.")) return;

    try {
      await axios.delete(`/api/app-instances?id=${id}`);
      toast.success("Application deleted.");
      fetchDashboardData();
    } catch (err) {
      toast.error("Deletion failed.");
    }
  };

  const handleExportApp = async (id: string, name: string) => {
    const toastId = toast.loading(`Exporting ${name}...`);
    try {
      const { data } = await axios.post("/api/app-instances/export", { appId: id });
      if (data.repoUrl) {
        toast.success(
          <div className="space-y-1">
            <p className="font-bold text-xs">
              {data.deployedUrl ? "Deployed to cloud! 🚀" : "Pushed to GitHub! 📦"}
            </p>
            <a href={data.repoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 underline block truncate">{data.repoUrl}</a>
            {data.deployedUrl && (
              <a href={data.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 underline block truncate">{data.deployedUrl}</a>
            )}
          </div>,
          { id: toastId, duration: 12000 }
        );
      } else {
        toast.success(`Exported locally to: apps/${data.slug}`, { id: toastId, duration: 6000 });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Export failed.", { id: toastId });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page select-none text-primary-text overflow-hidden">
      <Toaster position="top-right" />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-10 sm:px-6 lg:px-8 flex flex-col gap-10 overflow-y-auto scrollbar-subtle">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-divider/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight uppercase">App Builder Console</h1>
            <p className="text-xs text-secondary-text">Deploy custom template-driven AI SaaS apps dynamically.</p>
          </div>
          {status === "authenticated" && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <FaPlus /> Launch New App
            </button>
          )}
        </div>

        {status === "unauthenticated" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-bg-card/20 border border-divider/30 rounded-lg">
            <FaRocket className="text-5xl text-primary/40 animate-pulse mb-4" />
            <h2 className="text-xl font-black uppercase tracking-tight">Create Custom AI SaaS Apps</h2>
            <p className="text-xs text-secondary-text max-w-sm mt-2 leading-relaxed">
              Log in to access your builder dashboard. Launch AI Image generators, custom chatbots, and audio transcribers configured specifically with your branding.
            </p>
            <Link
              href="/login"
              className="mt-6 bg-primary text-white px-8 py-3 rounded-full text-xs font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
            >
              Get Started Free
            </Link>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* Metric Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "Deployed Apps", value: appInstances.length, desc: "Custom active workspaces" },
                { label: "Total Generations", value: creationsCount, desc: "Completed AI predictions" },
                { label: "Active Balance", value: `$ ${session?.user?.credits || "0"}`, desc: "Available platform credits" }
              ].map((m, idx) => (
                <div key={idx} className="bg-bg-card border border-divider/50 rounded-lg p-5 flex flex-col justify-between h-28 shadow-sm">
                  <span className="text-[10px] font-black text-secondary-text uppercase tracking-widest">{m.label}</span>
                  <span className="text-2xl font-black text-white">{m.value}</span>
                  <span className="text-[10px] text-secondary-text font-semibold">{m.desc}</span>
                </div>
              ))}
            </div>

            {/* Custom App Instances Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FaRegFolderOpen className="text-primary text-sm" />
                <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text">My Deployed App Workspaces</h3>
              </div>

              {appInstances.length === 0 ? (
                <div className="py-12 border border-divider/30 bg-bg-card/10 rounded-lg text-center flex flex-col items-center justify-center gap-2">
                  <FaRegFolderOpen className="text-3xl opacity-20 mb-2" />
                  <span className="text-xs font-bold text-secondary-text uppercase tracking-wider">No active app instances</span>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Click here to deploy your first workspace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appInstances.map((app) => {
                    const temp: any = templates.find(t => t.id === app.templateId) || {};
                    return (
                      <div
                        key={app.id}
                        className="bg-bg-card border border-divider/50 rounded-lg p-5 flex flex-col justify-between gap-6 shadow-md hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {temp.name || app.templateId}
                            </span>
                            <button
                              onClick={() => handleDeleteApp(app.id)}
                              className="text-secondary-text hover:text-red-500 transition-colors p-1"
                              title="Delete App"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                          <h4 className="text-sm font-extrabold text-primary-text">{app.name}</h4>
                          <p className="text-[11px] text-secondary-text leading-relaxed font-semibold">
                            Instance URL: <Link href={`/app/${app.id}`} className="text-primary hover:underline">/app/{app.id}</Link>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-divider/40 pt-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/app/${app.id}`}
                              className="flex-1 py-2 bg-primary-text dark:bg-white text-bg-page dark:text-neutral-900 rounded text-center text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-divider shadow"
                            >
                              <FaExternalLinkAlt size={10} />
                              <span>Workspace</span>
                            </Link>
                            <Link
                              href={`/app/${app.id}/gallery`}
                              className="flex-1 py-2 bg-bg-page text-primary rounded text-center text-xs font-bold hover:bg-bg-card transition-all flex items-center justify-center gap-1.5 border border-divider shadow active:scale-95"
                            >
                              <FaCompass size={11} />
                              <span>Gallery</span>
                            </Link>
                          </div>
                          <button
                            onClick={() => handleExportApp(app.id, app.name)}
                            className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-primary/20 shadow active:scale-95 cursor-pointer"
                          >
                            <FaRocket size={10} />
                            <span>Deploy Standalone App</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Platform Base Templates Showcase */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <FaCompass className="text-primary text-sm" />
                <h3 className="text-xs font-black uppercase tracking-wider text-secondary-text">Available Base Templates</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((temp) => (
                  <div key={temp.id} className="bg-bg-card/40 border border-divider/40 p-5 rounded-lg flex flex-col justify-between gap-4 h-48 shadow-sm">
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">{temp.name}</h4>
                      <p className="text-xs text-secondary-text leading-relaxed font-semibold line-clamp-3">{temp.description}</p>
                    </div>
                    {status === "authenticated" && (
                      <button
                        onClick={() => {
                          setSelectedTemplateId(temp.id);
                          setCustomPrompt(temp.defaultConfig.systemPrompt as string);
                          setShowModal(true);
                        }}
                        className="text-xs font-extrabold text-primary-text flex items-center gap-1.5 hover:text-primary transition-colors hover:underline text-left"
                      >
                        Launch with template <FaArrowRight className="text-[10px]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>      
      
      {/* Launch New App modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-bg-card border border-divider w-full max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl rounded-xl p-8 space-y-6 animate-scale-up shadow-2xl max-h-[92vh] overflow-y-auto scrollbar-subtle">
            <div className="space-y-1 border-b border-divider/40 pb-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-primary-text">Launch Custom App</h2>
              <p className="text-xs text-secondary-text">Configure branding, backend models, and custom user input parameters.</p>
            </div>

            <form onSubmit={handleLaunchApp} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                
                {/* Left Column: Basic Details & Advanced settings */}
                <div className="space-y-5 lg:col-span-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Application Name</label>
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. Cyberpunk Avatar Maker"
                      className="w-full bg-bg-page border border-divider/60 rounded py-2.5 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Base Template Type</label>
                    <CustomSelect
                      value={selectedTemplateId}
                      onChange={(val) => {
                        setSelectedTemplateId(val);
                        const matching = templates.find(t => t.id === val);
                        if (matching) setCustomPrompt(matching.defaultConfig.systemPrompt as string);
                      }}
                      options={templates.map(t => ({ label: t.name, value: t.id }))}
                    />
                  </div>

                  {/* Collapsible Advanced Settings */}
                  <div className="border border-divider/40 rounded-lg p-4 bg-bg-page/20">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between w-full text-[10px] font-bold text-secondary-text uppercase tracking-wider outline-none cursor-pointer"
                    >
                      <span>Advanced settings</span>
                      <span>{showAdvanced ? "▼" : "▶"}</span>
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 grid grid-cols-1 gap-4 pt-4 border-t border-divider/20 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Credit Cost</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={creditCost}
                            onChange={(e) => setCreditCost(Number(e.target.value))}
                            className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Model Engine</label>
                          <input
                            type="text"
                            value={modelEngine}
                            onChange={(e) => setModelEngine(e.target.value)}
                            placeholder="e.g. nano-banana-2"
                            className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">API Endpoint</label>
                          <input
                            type="text"
                            value={endpointOverride}
                            onChange={(e) => setEndpointOverride(e.target.value)}
                            placeholder="e.g. https://api.muapi.ai/api/v1/nano-banana-2"
                            className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Edit Model Engine (Optional)</label>
                          <input
                            type="text"
                            value={editModelEngine}
                            onChange={(e) => setEditModelEngine(e.target.value)}
                            placeholder="e.g. nano-banana-2-edit (when image uploaded)"
                            className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Edit API Endpoint (Optional)</label>
                          <input
                            type="text"
                            value={editEndpointOverride}
                            onChange={(e) => setEditEndpointOverride(e.target.value)}
                            placeholder="e.g. https://api.muapi.ai/api/v1/nano-banana-2-edit"
                            className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary-text uppercase tracking-wider block">Visual Theme</label>
                          <CustomSelect
                            value={selectedTheme}
                            onChange={(val) => setSelectedTheme(val)}
                            options={[
                              { label: "Slate / Indigo (Default)", value: "slate-indigo" },
                              { label: "Neon Cyberpunk", value: "cyberpunk" },
                              { label: "Emerald Forest", value: "emerald" },
                              { label: "Sunset Orange", value: "sunset" },
                              { label: "Midnight Dark", value: "midnight" }
                            ]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Custom Input Parameters Designer */}
                <div className="border border-divider/40 rounded-xl p-5 bg-bg-page/10 space-y-5 lg:col-span-7">
                  <div className="flex justify-between items-center pb-2 border-b border-divider/20">
                    <span className="text-[11px] font-black text-primary uppercase tracking-widest">Input Parameters Designer</span>
                    <button
                      type="button"
                      onClick={() => setShowJsonImport(!showJsonImport)}
                      className="text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      {showJsonImport ? "Cancel Import" : "Import from JSON"}
                    </button>
                  </div>

                  {showJsonImport && (
                    <div className="space-y-3 p-4 bg-bg-page border border-divider rounded-lg animate-scale-up">
                      <label className="text-[9px] font-bold text-secondary-text uppercase block">Paste Sample JSON Payload</label>
                      <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='{ "resolution": "1k", "google_search": false }'
                        className="w-full bg-bg-card border border-divider/60 rounded p-3 text-xs font-mono outline-none focus:border-primary/60 h-24 text-primary-text leading-relaxed placeholder-secondary-text/50"
                      />
                      <button
                        type="button"
                        onClick={handleParseJson}
                        className="w-full py-2 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary-hover transition-colors cursor-pointer"
                      >
                        Parse & Generate Parameters
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-subtle">
                    {userParams.length === 0 ? (
                      <div className="text-center py-12 text-secondary-text text-xs font-semibold">
                        No custom parameters added yet. Add manually or import from JSON.
                      </div>
                    ) : (
                      userParams.map((param, index) => (
                        <div key={index} className="p-4 bg-bg-page/40 border border-divider/40 rounded-lg space-y-4 relative group hover:border-divider/70 transition-all">
                          <div className="flex justify-between items-center pb-2 border-b border-divider/20">
                            <span className="text-[10px] font-black text-primary uppercase tracking-wider">Parameter #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setUserParams(userParams.filter((_, i) => i !== index));
                              }}
                              className="text-secondary-text hover:text-red-500 transition-colors p-1 cursor-pointer"
                              title="Remove Parameter"
                            >
                              <FaTrash size={10} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Field Key</label>
                              <input
                                type="text"
                                value={param.key}
                                onChange={(e) => {
                                  const updated = [...userParams];
                                  updated[index].key = e.target.value;
                                  setUserParams(updated);
                                }}
                                placeholder="e.g. resolution"
                                className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Display Label</label>
                              <input
                                type="text"
                                value={param.label}
                                onChange={(e) => {
                                  const updated = [...userParams];
                                  updated[index].label = e.target.value;
                                  setUserParams(updated);
                                }}
                                placeholder="e.g. Resolution Output"
                                className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Field Type</label>
                              <CustomSelect
                                value={param.type}
                                onChange={(val) => {
                                  const updated = [...userParams];
                                  updated[index].type = val;
                                  if (val === "boolean") updated[index].defaultValue = false;
                                  else if (val === "number" || val === "slider") updated[index].defaultValue = 0;
                                  else if (["image_list", "video_list", "audio_list"].includes(val)) {
                                    updated[index].defaultValue = [];
                                    updated[index].maxInputs = updated[index].maxInputs || (updated[index].key.toLowerCase().includes("list") ? 5 : 1);
                                  }
                                  else updated[index].defaultValue = "";

                                  if (val === "enum") {
                                    updated[index].options = [];
                                    updated[index].optionsText = "";
                                  }
                                  setUserParams(updated);
                                }}
                                options={[
                                  { label: "Text Input", value: "text" },
                                  { label: "Text Area", value: "textarea" },
                                  { label: "Number Input", value: "number" },
                                  { label: "Toggle Switch", value: "boolean" },
                                  { label: "Dropdown List", value: "enum" },
                                  { label: "Range Slider", value: "slider" },
                                  { label: "Image Upload", value: "image_list" },
                                  { label: "Video Upload", value: "video_list" },
                                  { label: "Audio Upload", value: "audio_list" }
                                ]}
                                className="w-full font-semibold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Default Value</label>
                              {param.type === "boolean" ? (
                                <CustomSelect
                                  value={param.defaultValue ? "true" : "false"}
                                  onChange={(val) => {
                                    const updated = [...userParams];
                                    updated[index].defaultValue = val === "true";
                                    setUserParams(updated);
                                  }}
                                  options={[
                                    { label: "False", value: "false" },
                                    { label: "True", value: "true" }
                                  ]}
                                  className="w-full font-semibold"
                                />
                              ) : (
                                <input
                                  type={param.type === "number" || param.type === "slider" ? "number" : "text"}
                                  value={param.defaultValue}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].defaultValue = param.type === "number" || param.type === "slider" ? Number(e.target.value) : e.target.value;
                                    setUserParams(updated);
                                  }}
                                  placeholder="Default val"
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              )}
                            </div>
                          </div>

                          {["image_list", "video_list", "audio_list"].includes(param.type) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Max Uploads Limit (Inputs Count)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={param.maxInputs !== undefined ? param.maxInputs : 1}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].maxInputs = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                                    setUserParams(updated);
                                  }}
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                            </div>
                          )}

                          {param.type === "enum" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Dropdown Options (comma separated)</label>
                                <input
                                  type="text"
                                  value={param.optionsText !== undefined ? param.optionsText : (param.options ? param.options.join(", ") : "")}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].optionsText = e.target.value;
                                    updated[index].options = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                    setUserParams(updated);
                                  }}
                                  placeholder="e.g. Auto, 1k, 2k"
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase tracking-wider block">Option Extra Cost (comma separated)</label>
                                <input
                                  type="text"
                                  value={param.costModifiersText !== undefined ? param.costModifiersText : (param.costModifiers ? param.costModifiers.join(", ") : "")}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].costModifiersText = e.target.value;
                                    updated[index].costModifiers = e.target.value.split(",").map(s => Number(s.trim()) || 0);
                                    setUserParams(updated);
                                  }}
                                  placeholder="e.g. 0, 2, 5 (matches options)"
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                            </div>
                          )}

                          {(param.type === "slider" || param.type === "number") && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase block">Min</label>
                                <input
                                  type="number"
                                  value={param.min !== undefined ? param.min : 0}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].min = Number(e.target.value);
                                    setUserParams(updated);
                                  }}
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase block">Max</label>
                                <input
                                  type="number"
                                  value={param.max !== undefined ? param.max : 100}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].max = Number(e.target.value);
                                    setUserParams(updated);
                                  }}
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase block">Step</label>
                                <input
                                  type="number"
                                  value={param.step !== undefined ? param.step : 1}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].step = Number(e.target.value);
                                    setUserParams(updated);
                                  }}
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-secondary-text uppercase block">Cost Per Unit</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={param.costPerUnit !== undefined ? param.costPerUnit : 0}
                                  onChange={(e) => {
                                    const updated = [...userParams];
                                    updated[index].costPerUnit = Number(e.target.value);
                                    setUserParams(updated);
                                  }}
                                  placeholder="e.g. 0.1"
                                  className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                                />
                              </div>
                            </div>
                          )}

                          {param.type === "boolean" && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="text-[9px] font-bold text-secondary-text uppercase block">Extra Credit Cost when Enabled (True)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={param.costIfTrue !== undefined ? param.costIfTrue : 0}
                                onChange={(e) => {
                                  const updated = [...userParams];
                                  updated[index].costIfTrue = Number(e.target.value);
                                  setUserParams(updated);
                                }}
                                placeholder="e.g. 1"
                                className="w-full bg-bg-page border border-divider/60 rounded py-2 px-3 text-xs outline-none focus:border-primary/60 transition-all font-semibold text-primary-text min-h-[38px]"
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserParams([
                        ...userParams,
                        { key: `param_${Date.now().toString().slice(-4)}`, label: "New Parameter", type: "text", defaultValue: "" }
                      ]);
                    }}
                    className="w-full py-2.5 border border-dashed border-divider hover:border-primary/50 text-[10px] font-bold text-secondary-text hover:text-white rounded transition-colors cursor-pointer"
                  >
                    + Add Custom Parameter
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-divider/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-bg-page border border-divider text-secondary-text rounded text-xs font-bold hover:bg-bg-card transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  {submitting ? "Launching..." : "Deploy App"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

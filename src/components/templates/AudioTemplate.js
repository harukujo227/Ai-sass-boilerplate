"use client";

import { useState } from "react";
import { FaMicrophone, FaDownload, FaFileAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";
import config from "@/lib/config";

export default function AudioTemplate({ appInstance, userCredits, activeCreation, onCreationCompleted }) {
  const parsedConfig = appInstance.config ? JSON.parse(appInstance.config) : {};
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post("/api/upload", formData);
      setAudioUrl(data.url);
      toast.success("Audio file loaded!");
    } catch (err) {
      toast.error("Failed to upload audio.");
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async (e) => {
    e.preventDefault();
    if (!audioUrl) {
      toast.error("Please upload an audio file first.");
      return;
    }

    setGenerating(true);
    const toastId = toast.loading("Processing audio transcription...");

    try {
      const { data } = await axios.post("/api/generation", {
        prompt: parsedConfig.systemPrompt || "Transcribe accurately.",
        inputImage: audioUrl, // Pass audio link in reference parameter
        appId: appInstance.id,
        modelEndpoint: "predictions", // whisper endpoint
      });

      if (data.status === "failed") {
        toast.error("Transcription failed. Credits refunded.", { id: toastId });
      } else {
        toast.success("Transcription complete!", { id: toastId });
      }
      onCreationCompleted();
    } catch (err) {
      toast.error(err.response?.data?.error || "Transcription failed.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadTxt = (text) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `transcript_${appInstance.id}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl items-stretch">
      {/* File Upload Box */}
      <div className="w-full lg:w-[400px] shrink-0 border border-divider/40 bg-bg-card/30 p-6 rounded-lg flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary">Upload Audio</h2>
          <p className="text-[11px] text-secondary-text">Select a speech recording or podcast file.</p>
        </div>

        <form onSubmit={handleTranscribe} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-secondary-text uppercase tracking-wider">Audio file (.mp3, .wav, .m4a)</label>
            <div className="relative border-2 border-dashed border-divider hover:border-primary/50 transition-colors rounded-lg h-36 flex flex-col items-center justify-center bg-bg-page/40 p-4">
              {audioUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 relative group p-2 text-center">
                  <FaMicrophone className="text-3xl text-primary animate-pulse" />
                  <span className="text-[10px] text-secondary-text truncate w-full">File Uploaded</span>
                  <button
                    type="button"
                    onClick={() => setAudioUrl(null)}
                    className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-bold transition-opacity rounded"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-xs font-semibold text-secondary-text">
                  <FaMicrophone className="text-2xl" />
                  <span>{uploading ? "Loading File..." : "Select File"}</span>
                  <input type="file" onChange={handleAudioUpload} className="hidden" accept="audio/*" disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={generating || uploading || !audioUrl}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-full text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            {generating ? (
              <>
                <FiRefreshCw className="animate-spin text-sm" />
                <span>Transcribing speech...</span>
              </>
            ) : (
              <>
                <FaFileAlt className="text-xs" />
                <span>Transcribe Audio (Cost: {config.ai.generationCost} credit)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Transcript Text Result Box */}
      <div className="flex-1 border border-divider/30 bg-bg-card/10 rounded-lg p-6 flex flex-col justify-between min-h-[400px]">
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="border-b border-divider/40 pb-2">
            <h3 className="text-xs font-bold text-secondary-text uppercase tracking-wider">Transcript Output</h3>
          </div>

          <div className="flex-1 bg-bg-page border border-divider/40 rounded p-4 text-xs leading-relaxed overflow-y-auto scrollbar-subtle min-h-[250px] max-h-[350px] overscroll-contain">
            {activeCreation ? (
              activeCreation.status === "processing" ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-secondary-text font-bold uppercase tracking-wider">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="animate-pulse">Whisper processing transcription...</span>
                </div>
              ) : activeCreation.status === "completed" ? (
                <p className="font-medium whitespace-pre-wrap">{activeCreation.resultImage || "Done."}</p>
              ) : (
                <span className="text-red-500 font-bold">Transcription failed: {activeCreation.error || "MuAPI error."}</span>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-secondary-text font-bold uppercase tracking-wider">
                <FaFileAlt className="text-2xl opacity-20 mb-2" />
                <span>Empty Transcript</span>
                <span className="text-[10px] text-secondary-text font-normal capitalize">Load an audio file and initiate the transcription engine.</span>
              </div>
            )}
          </div>
        </div>

        {activeCreation && activeCreation.status === "completed" && (
          <div className="border-t border-divider/40 pt-4 flex justify-end">
            <button
              onClick={() => handleDownloadTxt(activeCreation.resultImage)}
              className="bg-bg-page hover:bg-bg-card border border-divider px-4 py-2 text-xs text-primary font-bold rounded-full transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-md"
            >
              <FaDownload size={10} />
              <span>Download Transcript (.txt)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

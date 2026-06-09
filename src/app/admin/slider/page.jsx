"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function AdminSliderPage() {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(null);

  useEffect(() => {
    async function secureSliderDashboard() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.replace("/"); return; }

        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
        if (!profile?.is_admin && session.user.app_metadata?.role !== "admin") { router.replace("/"); return; }

        const { data, error } = await supabase.from("slider_banners").select("id, image_url, redirect_url, display_order").order("display_order", { ascending: true });
        if (!error && data) setBanners(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    secureSliderDashboard();
  }, [router]);

  const handleInputChange = (index, field, value) => {
    setBanners((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleAddNewBlock = () => {
    setBanners((prev) => [...prev, { image_url: "", redirect_url: "", display_order: prev.length + 1 }]);
  };

  const handleRemoveBlock = (index) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
    if (activePreviewIndex === index) {
      setActivePreviewIndex(null);
    } else if (activePreviewIndex > index) {
      setActivePreviewIndex((prev) => prev - 1);
    }
  };

  const handleTogglePreview = (index) => {
    setActivePreviewIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  const handleDragStart = (index) => { setDraggedIndex(index); };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const itemToMove = banners[draggedIndex];
    const remainingItems = banners.filter((_, i) => i !== draggedIndex);
    const updatedList = [
      ...remainingItems.slice(0, index),
      itemToMove,
      ...remainingItems.slice(index)
    ];

    if (activePreviewIndex === draggedIndex) {
      setActivePreviewIndex(index);
    } else if (activePreviewIndex === index) {
      setActivePreviewIndex(draggedIndex);
    }

    setDraggedIndex(index);
    setBanners(updatedList);
  };

  const handleSaveSliderConfiguration = async () => {
    try {
      setSaving(true);
      await supabase.from("slider_banners").delete().neq("id", 0);

      const finalizedPayload = banners.map((item, idx) => ({
        image_url: item.image_url,
        redirect_url: item.redirect_url,
        display_order: idx + 1
      }));

      if (finalizedPayload.length > 0) {
        const { error } = await supabase.from("slider_banners").insert(finalizedPayload);
        if (error) throw error;
      }

      toast.success("Slider order configuration synchronized!");
      router.push("/");
    } catch (err) {
      toast.error(`Sync aborted: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-sm font-semibold text-gray-400 animate-pulse">Loading slider configuration matrix...</div></div>;
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Dynamic Carousel CMS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Drag blocks vertically to adjust ordering parameters seamlessly.</p>
        </div>
        <button onClick={handleAddNewBlock} className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">+ Add Slide Block</button>
      </div>

      <div className="space-y-6 mb-8">
        {banners.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            
            {/* 🚀 LOCAL TOP ACCORDION CONTAINER: Renders right above its own box row */}
            {activePreviewIndex === idx && (
              <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Live Banner Render (Block #{idx + 1})</span>
                  <button type="button" onClick={() => setActivePreviewIndex(null)} className="text-gray-400 hover:text-gray-600 text-[10px] font-bold cursor-pointer">Hide ✕</button>
                </div>
                
                {item.image_url ? (
                  <div className="w-full h-32 sm:h-44 rounded-xl overflow-hidden bg-white border border-gray-200 relative flex items-center justify-center shadow-inner">
                    <img 
                      src={item.image_url} 
                      alt="" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full py-6 text-center text-xs text-gray-400 font-semibold border border-dashed border-gray-200 rounded-xl bg-white select-none">
                    ⚠️ Provide a text image source string link to inspect render boundaries.
                  </div>
                )}
              </div>
            )}

            {/* Input Config Card Row block container panel */}
            <div
              draggable={true}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`bg-white border p-4 shadow-sm flex items-center gap-4 cursor-move rounded-2xl transition-all active:scale-[0.99] ${
                activePreviewIndex === idx ? "border-pink-300 ring-2 ring-pink-50" : "border-gray-100 hover:border-pink-200"
              }`}
            >
              <div className="text-gray-300 font-bold select-none text-base px-1">☰</div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Image Asset Source URL</label>
                  <input type="text" value={item.image_url} onChange={(e) => handleInputChange(idx, "image_url", e.target.value)} placeholder="https://domain.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Destination Redirect Link</label>
                  <input type="text" value={item.redirect_url} onChange={(e) => handleInputChange(idx, "redirect_url", e.target.value)} placeholder="/category/1 or https://google.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => handleTogglePreview(idx)} 
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border cursor-pointer ${
                    activePreviewIndex === idx 
                      ? "bg-pink-600 border-pink-600 text-white shadow-sm" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {activePreviewIndex === idx ? "Viewing" : "Preview"}
                </button>
                <button onClick={() => handleRemoveBlock(idx)} className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1.5 transition cursor-pointer">Delete</button>
              </div>
            </div>

          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-end border-t border-gray-50 pt-4">
        <button onClick={() => router.push("/admin/orders")} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition cursor-pointer">Cancel</button>
        <button onClick={handleSaveSliderConfiguration} disabled={saving} className="px-5 py-2.5 bg-[#7bc143] hover:bg-green-600 text-white font-bold text-xs rounded-xl transition shadow shadow-green-100 disabled:opacity-50 cursor-pointer">{saving ? "Syncing Configuration..." : "Save Order Parameters"}</button>
      </div>
    </div>
  );
}

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
  };

  // NATIVE HTML5 DRAG & DROP SORTING MATRIX
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

    setDraggedIndex(index);
    setBanners(updatedList);
  };
  const handleSaveSliderConfiguration = async () => {
    try {
      setSaving(true);
      
      // 1. Wipe out old references to prevent duplicate constraints failures
      await supabase.from("slider_banners").delete().neq("id", 0);

      // 2. Re-map display_order strictly from top to down based on the updated drag positions
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
        <button onClick={handleAddNewBlock} className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-sm">+ Add Slide Block</button>
      </div>

      <div className="space-y-4 mb-8">
        {banners.map((item, idx) => (
          <div
            key={idx}
            draggable={true}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={() => setDraggedIndex(null)}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-move hover:border-pink-200 transition-all active:scale-[0.99]"
          >
            {/* Grab Handle Icon visual cue */}
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

            <button onClick={() => handleRemoveBlock(idx)} className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1 transition">Delete</button>
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-end border-t border-gray-50 pt-4">
        <button onClick={() => router.push("/admin/orders")} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition">Cancel</button>
        <button onClick={handleSaveSliderConfiguration} disabled={saving} className="px-5 py-2.5 bg-[#7bc143] hover:bg-green-600 text-white font-bold text-xs rounded-xl transition shadow shadow-green-100 disabled:opacity-50">{saving ? "Syncing Configuration..." : "Save Order Parameters"}</button>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function AdminCategoryEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function secureCategoryRoute() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.replace("/"); return; }

        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
        if (!profile?.is_admin && session.user.app_metadata?.role !== "admin") { router.replace("/"); return; }

        const { data, error } = await supabase
          .from("categories")
          .select("title, image")
          .eq("id", id)
          .maybeSingle();

        if (!error && data) {
          setTitle(data.title || "");
          setImage(data.image || "");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    secureCategoryRoute();
  }, [id, router]);

  const handleUpdateCategoryData = async (e) => {
    e.preventDefault();
    if (!title || !image) {
      toast.error("Please fill out all category parameters.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("categories")
        .update({ title: title, image: image })
        .eq("id", id);

      if (error) throw error;
      toast.success("Category updated successfully!");
      router.push(`/category/${id}`);
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-sm font-semibold text-gray-400 animate-pulse">Syncing category metadata...</div></div>;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-16">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Modify Category</h1>
          <p className="text-xs text-gray-400 mt-1">Update global layout string parameters and vector thumbnail references in real time.</p>
        </div>

        <form onSubmit={handleUpdateCategoryData} className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Category Label Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Vector Icon Image URL *</label>
            <input type="text" value={image} onChange={(e) => setImage(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
          </div>

          {image && (
            <div className="w-20 h-20 rounded-full border border-gray-100 p-2 flex items-center justify-center mx-auto bg-gray-50/50">
              <img src={image} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-50">
            <button type="button" onClick={() => router.push(`/category/${id}`)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-50">{saving ? "Saving..." : "Save Parameters"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function AdminAddCategoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function secureAddCategoryRoute() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          toast.error("Access denied. Please log in first.");
          router.replace("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile?.is_admin && session.user.app_metadata?.role !== "admin") {
          toast.error("Unauthorized access. Admin privileges required.");
          router.replace("/");
          return;
        }
      } catch (err) {
        console.error(err);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    secureAddCategoryRoute();
  }, [router]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!title || !image) {
      toast.error("Please fill out all category parameters.");
      return;
    }

    try {
      setSubmitting(true);

      // Inserts the new category record into your Supabase table schema
      const { error } = await supabase
        .from("categories")
        .insert([{ title: title, image: image }]);

      if (error) throw error;

      toast.success("New category added successfully!");
      router.push("/"); // Redirect back to homepage to see the new category circle
    } catch (err) {
      toast.error(`Creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-400 animate-pulse">
          Verifying security clearance log...
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-16">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Add New Category</h1>
          <p className="text-xs text-gray-400 mt-1">Create a new storefront layout bucket with custom string labels and thumbnail vector parameters.</p>
        </div>

        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Category Label Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Mother & Baby Care"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" 
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Vector Icon Image URL *</label>
            <input 
              type="text" 
              value={image} 
              onChange={(e) => setImage(e.target.value)} 
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" 
            />
          </div>

          {/* REAL-TIME PHOTO PREVIEW BOX */}
          {image && (
            <div className="w-20 h-20 rounded-full border border-gray-100 p-2 flex items-center justify-center mx-auto bg-gray-50/50 shadow-xs">
              <img src={image} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.src = "https://placehold.co"; }} />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-50">
            <button 
              type="button" 
              onClick={() => router.push("/")} 
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Creating Item..." : "Publish Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

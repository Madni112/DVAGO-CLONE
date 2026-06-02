"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function AdminProductFormPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [stock, setStock] = useState("");
  
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]); 
  const [categoriesList, setCategoriesList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function secureProductPanelAndFetchData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile?.is_admin && session.user.app_metadata?.role !== "admin") {
          toast.error("Admin credentials required.");
          router.replace("/");
          return;
        }

        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("id, title")
          .order("title", { ascending: true });

        if (!catError && catData) {
          setCategoriesList(catData);
        }

        if (id) {
          const { data: product, error: prodError } = await supabase
            .from("products")
            .select("title, price, image, stock")
            .eq("id", id)
            .maybeSingle();

          if (!prodError && product) {
            setTitle(product.title || "");
            setPrice(product.price ? String(product.price) : "");
            setImage(product.image || "");
            setStock(product.stock ? String(product.stock) : "");

            const { data: currentRelations } = await supabase
              .from("product_categories")
              .select("category_id")
              .eq("product_id", id);

            if (currentRelations) {
              const mappedIds = currentRelations.map(item => parseInt(item.category_id, 10));
              setSelectedCategoryIds(mappedIds);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    secureProductPanelAndFetchData();
  }, [id, router]);
  const handleCheckboxChange = (catId) => {
    const integerId = parseInt(catId, 10);
    setSelectedCategoryIds((prevIds) =>
      prevIds.includes(integerId)
        ? prevIds.filter((id) => id !== integerId)
        : [...prevIds, integerId]
    );
  };

  const handleSaveProductForm = async (e) => {
    e.preventDefault();
    if (!title || !price || !image || !stock || selectedCategoryIds.length === 0) {
      toast.error("Please populate all parameters and check at least one category mapping block.");
      return;
    }

    try {
      setSaving(true);
      const productPayload = {
        title: title,
        price: parseFloat(price),
        image: image,
        stock: parseInt(stock, 10),
        updated_at: new Date().toISOString()
      };

      let activeProductId = id ? parseInt(id, 10) : null;

      if (id) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", activeProductId);

        if (updateError) throw updateError;

        await supabase
          .from("product_categories")
          .delete()
          .eq("product_id", activeProductId);
      } else {
        const { data: newProd, error: insertError } = await supabase
          .from("products")
          .insert([{ ...productPayload, created_at: new Date().toISOString() }])
          .select("id")
          .maybeSingle();

        if (insertError) throw insertError;
        activeProductId = newProd.id;
      }

      const junctionPayloadRows = selectedCategoryIds.map((catId) => ({
        product_id: activeProductId,
        category_id: catId
      }));

      const { error: junctionError } = await supabase
        .from("product_categories")
        .insert(junctionPayloadRows);

      if (junctionError) throw junctionError;

      toast.success("Product configurations saved!");
      router.push("/");
    } catch (err) {
      toast.error(`Operation failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-400 animate-pulse">
          Syncing catalog management layers...
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">
            {id ? "Modify Product Details" : "Publish New Product"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure unit items pricing logs, warehouse stock values, and link to multiple structural storefront categories.
          </p>
        </div>

        <form onSubmit={handleSaveProductForm} className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Product Heading Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Panadol 500mg Tablets" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Price (Rs.) *</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Available Stock *</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Product Image URL *</label>
            <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://domain.com" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" />
          </div>

          {image && (
            <div className="mt-4 w-28 h-28 bg-white border border-gray-100 rounded-xl p-2 flex items-center justify-center mx-auto shadow-xs transition duration-300 relative">
              <img 
                src={image} 
                alt="Product preview" 
                className="max-w-full max-h-full object-contain mix-blend-multiply" 
                onError={(e) => { e.target.src = "https://placehold.co"; }} 
              />
            </div>
          )}
          <div className="pt-2">
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-2 tracking-wider">Assigned Store Categories * (Select all that apply)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-4 border border-gray-200 rounded-xl max-h-[160px] overflow-y-auto custom-form-scrollbar">
              {categoriesList.map((cat) => {
                const integerCatId = parseInt(cat.id, 10);
                const isChecked = selectedCategoryIds.includes(integerCatId);
                return (
                  <label 
                    key={cat.id} 
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none ${
                      isChecked 
                        ? "bg-pink-50/50 border-pink-200 text-pink-600" 
                        : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxChange(cat.id)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 accent-pink-600 cursor-pointer"
                    />
                    <span className="truncate">{cat.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-50">
            <button type="button" onClick={() => router.push("/")} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-50 cursor-pointer">
              {saving ? "Saving Changes..." : "Publish Product parameters"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

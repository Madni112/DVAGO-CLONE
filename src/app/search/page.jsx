"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/Config/supabase";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function executeCatalogSearch() {
      if (!query.trim()) { setResults([]); setLoading(false); return; }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, title, price, image")
          .ilike("title", `%${query}%`);

        if (!error && data) setResults(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    executeCatalogSearch();
  }, [query]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-black text-gray-950">Search Results</h1>
        <p className="text-xs font-semibold text-gray-400 mt-1">Showing matches for keyword: <span className="text-pink-600 font-extrabold">"{query}"</span> ({results.length} items found)</p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-white shadow-xs">
          <p className="text-gray-400 text-sm font-semibold">No medical products match your query parameters.</p>
          <Link href="/" className="mt-3 inline-block text-xs font-bold text-pink-600 hover:underline">← Go Back Home</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((product) => (
            <Link key={product.id} href={`/product/${product.id}`} className="group relative flex flex-col justify-between p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition duration-300 min-h-[300px] cursor-pointer">
              <div className="w-full h-36 flex items-center justify-center mb-3 p-2 bg-white">
                <img src={product.image} alt="" className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300" />
              </div>
              <div>
                <h4 className="text-xs text-gray-800 font-bold line-clamp-2 mb-2 min-h-[32px] leading-tight group-hover:text-pink-600 transition">{product.title}</h4>
                <p className="text-sm font-black text-green-600">Rs. {Number(product.price).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-gray-400 font-bold animate-pulse">Loading Search Layout Engine...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, useContext, useRef } from "react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";
import { supabase } from "@/Config/supabase";
import { CartContext } from "@/Context/CartContext";
import { WishlistContext } from "@/Context/WishlistContext";
import { OffCanvasContext } from "@/Context/canvas";

export default function Navbar() {
  const router = useRouter();
  const { state: cartState } = useContext(CartContext);
  const { wishlistItems } = useContext(WishlistContext);
  
  const { setOpenCanvas, setIsWishlistOpen, setLoginPopupOpen } = useContext(OffCanvasContext);

  const [activeUser, setActiveUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeNavbarSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setActiveUser(session.user);
          const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
          if (profile?.is_admin || session.user.app_metadata?.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (err) { console.error(err); }
    }
    initializeNavbarSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        setActiveUser(session.user);
        setIsAdmin(session.user.app_metadata?.role === "admin");
      } else if (event === "SIGNED_OUT") {
        setActiveUser(null);
        setIsAdmin(false);
        router.push("/");
      }
    });

    const handleOutsideClickClose = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleOutsideClickClose);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleOutsideClickClose);
    };
  }, [router]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounceQuery = setTimeout(async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, image")
        .ilike("title", `%${searchQuery}%`)
        .limit(6);

      if (!error && data) setSuggestions(data);
    }, 250);

    return () => clearTimeout(delayDebounceQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const cartCount = cartState ? cartState.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0;
  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-40 select-none">
      <div className="w-full max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-6">
        <Link href="/" className="text-2xl font-black tracking-tight text-gray-950 flex items-center gap-1 flex-shrink-0">
          <span className="text-[#7bc143]">DVAGO</span>
          <span className="text-pink-600 text-xs font-bold uppercase border-l border-gray-200 pl-1.5 tracking-widest">Clone</span>
        </Link>

        <div className="flex-1 max-w-xl relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines, generic formulas, baby products..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition shadow-inner"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition font-black text-sm cursor-pointer">🔍</button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 p-2">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSuggestions(false);
                    router.push(`/product/${item.id}`);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-pink-600 rounded-xl transition flex justify-between items-center cursor-pointer"
                >
                  <img src={item.image} className="w-12 h-12" alt="Search Dropdown Item Image" />
                  <span className="truncate pr-4">{item.title}</span>
                  <span className="text-green-600 flex-shrink-0">Rs. {Number(item.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 text-xs font-bold text-gray-700">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link href="/admin/add-category" className="px-3 py-2 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-xl transition text-[10px] uppercase font-black tracking-wide border border-pink-100">+ Add Category</Link>
              <Link href="/admin/product" className="px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition text-[10px] uppercase font-black tracking-wide border border-green-100">+ Add Product</Link>
              <Link href="/admin/orders" className="px-3.5 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition shadow-sm uppercase tracking-wide text-[10px]">Control Center</Link>
            </div>
          )}

          <div className="relative flex items-center" ref={dropdownRef}>
            {activeUser ? (
              <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-pink-600 transition cursor-pointer shadow-sm">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              </button>
            ) : (
              <button type="button" onClick={() => setLoginPopupOpen(true)} className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-pink-600 transition cursor-pointer"><svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg></button>
            )}

            {isDropdownOpen && activeUser && (
              <div className="absolute right-0 top-10 w-32 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-50">
                <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="w-full text-left block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-pink-600 font-bold transition">Profile</Link>
                <button type="button" onClick={async () => { setIsDropdownOpen(false); await supabase.auth.signOut(); }} className="w-full text-left block px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-bold transition border-t border-gray-50 cursor-pointer">Logout</button>
              </div>
            )}
          </div>

          {!isAdmin && (
            <>
              <button type="button" onClick={() => setIsWishlistOpen(true)} className="hover:text-pink-600 transition relative cursor-pointer flex items-center gap-1.5">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                Wishlist
                {wishlistItems.length > 0 && <span className="absolute -top-2.5 -right-2.5 min-w-[16px] h-4 bg-pink-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">{wishlistItems.length}</span>}
              </button>

              <button type="button" onClick={() => setOpenCanvas(true)} className="hover:text-pink-600 transition relative cursor-pointer flex items-center gap-1.5">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                Cart
                {cartCount > 0 && <span className="absolute -top-2.5 -right-2.5 min-w-[16px] h-4 bg-[#7bc143] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">{cartCount}</span>}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

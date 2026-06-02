"use client";

import React, { createContext, useState, useEffect } from "react";
import { supabase } from "@/Config/supabase";
import toast from "react-hot-toast";

export const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function syncAndLoadWishlist() {
      // 1. Instantly pull cached items from the browser for offline/guest browsing
      const localData = localStorage.getItem("dvago_wishlist");
      let localItems = [];
      if (localData) {
        try { localItems = JSON.parse(localData); } catch(e) {}
      }
      setWishlistItems(localItems);

      // 2. Safely grab active session token parameters
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await mergeWishlistsOnLogin(session.user.id, localItems);
      }
    }

    syncAndLoadWishlist();

    // 3. Listen to auth changes natively to catch instant Google OAuth popups
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        const localData = localStorage.getItem("dvago_wishlist");
        let localItems = [];
        if (localData) { try { localItems = JSON.parse(localData); } catch(e) {} }
        await mergeWishlistsOnLogin(session.user.id, localItems);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setWishlistItems([]);
        localStorage.removeItem("dvago_wishlist");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function mergeWishlistsOnLogin(authenticatedId, localItems) {
    try {
      // Fetch permanent cloud saved rows for this account
      const { data: cloudWishlist } = await supabase
        .from("user_wishlists")
        .select("products(id, title, price, image, stock)")
        .eq("user_id", authenticatedId);

      const dbItems = cloudWishlist?.map(item => item.products).filter(Boolean) || [];

      // 🧠 SMART DUPLICATION MERGE: Merges database items with anonymous guest items uniquely
      const mergedMap = new Map();
      dbItems.forEach(item => mergedMap.set(item.id, item));
      localItems.forEach(item => mergedMap.set(item.id, item)); // Overwrites or appends new ones smoothly
      
      const completeList = Array.from(mergedMap.values());
      setWishlistItems(completeList);
      localStorage.setItem("dvago_wishlist", JSON.stringify(completeList));

      // Asynchronously batch-upload guest additions straight to the cloud tables mapping ledger
      if (localItems.length > 0) {
        const insertRows = localItems.map(item => ({
          user_id: authenticatedId,
          product_id: item.id
        }));
        await supabase.from("user_wishlists").upsert(insertRows, { onConflict: "user_id,product_id" });
      }
    } catch (err) {
      console.error("Wishlist sync engine exception handled:", err.message);
    }
  }
  const toggleWishlist = async (product) => {
    const isAlreadySaved = wishlistItems.some((item) => item.id === product.id);
    let updatedList;

    if (isAlreadySaved) {
      updatedList = wishlistItems.filter((item) => item.id !== product.id);
      setWishlistItems(updatedList);
      localStorage.setItem("dvago_wishlist", JSON.stringify(updatedList));

      if (userId) {
        await supabase.from("user_wishlists").delete().eq("user_id", userId).eq("product_id", product.id);
      }
      toast.success("Removed from wishlist");
    } else {
      updatedList = [...wishlistItems, product];
      setWishlistItems(updatedList);
      localStorage.setItem("dvago_wishlist", JSON.stringify(updatedList));

      if (userId) {
        await supabase.from("user_wishlists").upsert({ user_id: userId, product_id: product.id }, { onConflict: "user_id,product_id" });
      }
      toast.success("Added to wishlist");
    }
  };

  const removeFormWishlist = async (id) => {
    const updatedList = wishlistItems.filter((item) => item.id !== id);
    setWishlistItems(updatedList);
    localStorage.setItem("dvago_wishlist", JSON.stringify(updatedList));

    if (userId) {
      await supabase.from("user_wishlists").delete().eq("user_id", userId).eq("product_id", id);
    }
    toast.success("Removed from wishlist");
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, toggleWishlist, removeFormWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

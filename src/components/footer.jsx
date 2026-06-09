"use client";

import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/Config/supabase";
import { OffCanvasContext } from "@/Context/canvas";

export default function Footer() {
  const router = useRouter();
  const { setLoginPopupOpen } = useContext(OffCanvasContext);
  
  const [categories, setCategories] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Handle local toast timeout warnings
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchFooterData() {
      try {
        // Fetching the 5 latest categories matching your exact schema columns
        const { data, error } = await supabase
          .from("categories")
          .select("id, title")
          .order("id", { ascending: false }) // Latest entries appear first
          .limit(5);

        if (!error && data && isMounted) {
          setCategories(data);
        }

        // Initialize active profile session checks
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setActiveUser(session.user);
        }
      } catch (err) {
        console.error("Footer database initialization error:", err);
      }
    }

    fetchFooterData();

    // Listen to background authorization events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setActiveUser(session.user);
      } else {
        setActiveUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleProfileClick = (e) => {
    if (!activeUser) {
      e.preventDefault(); // Stop route transition to /profile
      showToast("Please log in to view your profile panel.");
      setLoginPopupOpen(true); // Open login modal side canvas
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Logout runtime error:", err);
    }
  };

  return (
    <footer style={{ width: "100%", backgroundColor: "#0f172a", color: "#e2e8f0", padding: "40px 20px 24px 20px", marginTop: "auto", fontFamily: "sans-serif", position: "relative" }}>
      
      {/* Toast Notice Overlay */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff",
          color: "#374151",
          padding: "12px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: "600",
          zIndex: 9999
        }}>
          <span style={{ color: "#ef4444", fontWeight: "bold" }}>✕</span>
          {toastMessage}
        </div>
      )}

      {/* Main Grid Layout Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "32px", paddingBottom: "32px", borderBottom: "1px solid #334155" }}>
        
        {/* Column 1: Match Navbar Logo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "24px", fontWeight: "900", letterSpacing: "-0.05em" }}>
            <span style={{ color: "#7bc143" }}>DVAGO</span>
            <span style={{ color: "#db2777", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", borderLeft: "1px solid #475569", paddingLeft: "6px", letterSpacing: "0.1em" }}>Clone</span>
          </Link>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6", margin: 0 }}>
            Pakistan’s most trusted pharmacy chain delivering nationwide
          </p>
        </div>

        {/* Column 2: Sorted Dynamic Categories (5 Rows) */}
        <div>
          <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: "700", margin: "0 0 16px 0" }}>Categories</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
            {categories.length > 0 ? (
              categories.map((category) => (
                <li key={category.id}>
                  {/* Styled navigation paths matching your slider routing model */}
                  <Link href={`/category/${category.id}`} style={{ color: "#94a3b8", textDecoration: "none" }}>
                    {category.title}
                  </Link>
                </li>
              ))
            ) : (
              <>
                <li><span style={{ color: "#475569" }}>Medicines</span></li>
                <li><span style={{ color: "#475569" }}>Wellness</span></li>
                <li><span style={{ color: "#475569" }}>Baby Products</span></li>
                <li><span style={{ color: "#475569" }}>Personal Care</span></li>
                <li><span style={{ color: "#475569" }}>Nutrition</span></li>
              </>
            )}
          </ul>
        </div>

        {/* Column 3: Contacts */}
        <div>
          <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: "700", margin: "0 0 16px 0" }}>Contact Us</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#94a3b8" }}>
            <a href="mailto:madnimemon022@gmail.com" style={{ color: "#94a3b8", textDecoration: "none", wordBreak: "break-all" }}>
              madnimemon022@gmail.com
            </a>
            <a href="tel:+923128039911" style={{ color: "#94a3b8", textDecoration: "none" }}>
              +92-312-8039911
            </a>
          </div>
        </div>

        {/* Column 4: Profiles / Actions */}
        <div>
          <h3 style={{ fontSize: "16px", color: "#ffffff", fontWeight: "700", margin: "0 0 16px 0" }}>Account</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
            
            <Link 
              href="/profile" 
              onClick={handleProfileClick}
              style={{ color: "#94a3b8", textDecoration: "none" }}
            >
              Profile
            </Link>
            
            {activeUser ? (
              <button 
                onClick={handleLogout} 
                style={{ background: "none", border: "none", color: "#ef4444", textAlign: "left", padding: 0, cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setLoginPopupOpen(true)}
                style={{ background: "none", border: "none", color: "#14b8a6", textAlign: "left", padding: 0, cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
              >
                Login
              </button>
            )}

          </div>
        </div>

      </div>

      {/* Bottom Area: Assignment Disclaimer Notice */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "12px", color: "#64748b" }}>
        <p style={{ lineHeight: "1.6", backgroundColor: "#020617", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b", margin: 0 }}>
          <strong style={{ color: "#94a3b8", display: "block", marginBottom: "4px" }}>Disclaimer:</strong>
          This project is the clone of dvago pharmacy and wellness experts official website and i made this for the assignment of SMIT (Course: Web and App Development) although this is not copy pasted clone but i got inspired by the{" "}
          <a href="https://dvago.pk" target="_blank" rel="noopener noreferrer" style={{ color: "#14b8a6", textDecoration: "none", fontWeight: "600" }}>
            Dvago.pk
          </a>{" "}
          website.
        </p>
        
        <div style={{ textAlign: "center", color: "#94a3b8", paddingTop: "16px", borderTop: "1px solid #1e293b", fontWeight: "500" }}>
          © 2026 Dvago-Clone - Abdul Sattar
        </div>
      </div>
    </footer>
  );
}

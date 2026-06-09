"use client";

import React, { useState, useContext } from "react";
import { supabase } from "@/Config/supabase";
import toast from "react-hot-toast";
import { OffCanvasContext } from "@/Context/canvas";

export default function LoginPopup() {
  const { isLoginPopupOpen, setLoginPopupOpen } = useContext(OffCanvasContext);
  
  const [roleTab, setRoleTab] = useState("customer"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState("");

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegisterMode && !fullName)) {
      toast.error("Please populate all required form fields.");
      return;
    }

    try {
      setSubmitting(true);

      if (isRegisterMode) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          await supabase.from("profiles").insert([{
            id: signUpData.user.id,
            full_name: fullName,
            is_admin: false
          }]);
        }

        toast.success("Account registered successfully! You can log in now.");
        setIsRegisterMode(false);
        setPassword("");
      } else {
        // 1. Log credentials in with Supabase Auth
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        const user = signInData?.user;
        if (!user) throw new Error("No user profile session returned.");

        // 2. Fetch the user's role flag from your profiles metadata table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          await supabase.auth.signOut();
          throw profileError;
        }

        // Determine if they are an admin based on profile flag or metadata role
        const userIsAdmin = profile?.is_admin === true || user.app_metadata?.role === "admin";

        // 3. 🎯 ENFORCE STRICT CROSS-PORTAL ROLE CHECK RULES
        if (roleTab === "customer" && userIsAdmin) {
          await supabase.auth.signOut(); // Force terminate unauthorized customer token
          toast.error("Access Denied: Administrative accounts must log in using the Administrator tab.");
          return;
        }

        if (roleTab === "administrator" && !userIsAdmin) {
          await supabase.auth.signOut(); // Force terminate unauthorized admin token
          toast.error("Access Denied: Customer accounts are restricted from accessing the Administrator panel.");
          return;
        }

        // 4. Success path configuration
        toast.success(userIsAdmin ? "Welcome Admin! Loading system control center..." : "Welcome back! Loading secure layout...");
        setLoginPopupOpen(false);

        // 🚀 ONE-TIME MANUAL REFRESH HYDRATES PROFILE SAFELY WITHOUT COLLISION CRASHES
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      toast.error(`Google Sign-In failed: ${err.message}`);
    }
  };

  if (!isLoginPopupOpen) return null;

  // 🎯 CONDITIONAL FLAGS MATCHING YOUR DESIGN RULES
  const isAdminTabActive = roleTab === "administrator";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="absolute inset-0" onClick={() => setLoginPopupOpen(false)}></div>
      
      <div className="bg-white w-full max-w-md rounded-3xl border border-gray-100 shadow-xl overflow-hidden relative z-10 p-8 animate-in fade-in zoom-in-95 duration-200">
        
        <button 
          type="button" 
          onClick={() => setLoginPopupOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition text-sm cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-wide">Pharmacy Portal</h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Sign in to track orders or catalog systems</p>
        </div>

        {/* TAB CONTROLLERS SELECTOR SWITCH */}
        {!isRegisterMode && (
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 select-none text-xs font-bold text-gray-500">
            <button
              type="button"
              onClick={() => { setRoleTab("customer"); setIsRegisterMode(false); }}
              className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                roleTab === "customer" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab("administrator"); setIsRegisterMode(false); }}
              className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                roleTab === "administrator" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Administrator
            </button>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegisterMode && !isAdminTabActive && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" className="w-full px-4 py-3 bg-blue-50/40 border border-gray-100 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition shadow-inner" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full px-4 py-3 bg-blue-50/40 border border-gray-100 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition shadow-inner" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Account Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-blue-50/40 border border-gray-100 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition shadow-inner" />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Processing Access..." : isRegisterMode ? "Register Account" : "Login Securely"}
          </button>
        </form>

        {/* 🚀 CONDITIONAL GOOGLE SIGN IN BAR: Hides if Administrator tab is active */}
        {!isRegisterMode && !isAdminTabActive && (
          <div className="space-y-4 mt-4">
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <span className="relative bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400 z-10">or continue with</span>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c.92-2.74 3.48-4.54 6.72-4.54z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v2.97h3.89c2.28-2.1 3.56-5.19 3.56-8.7z"/>
                <path fill="#FBBC05" d="M5.28 14.78c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.39 7.2A11.953 11.953 0 0 0 1 12c0 1.77.39 3.46 1.08 4.98l4.2-3.2z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.89-2.97c-1.08.72-2.48 1.15-4.07 1.15-3.24 0-5.8-1.8-6.72-4.54L1.39 16.8A11.94 11.94 0 0 0 12 23z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

        {/* 🚀 CONDITIONAL REGISTRATION FOOTER LINK: Hides if Administrator tab is active */}
        {!isAdminTabActive && (
          <div className="text-center text-xs mt-6">
            <button 
              type="button" 
              onClick={() => { setIsRegisterMode(!isRegisterMode); setPassword(""); }}
              className="text-pink-600 font-extrabold hover:underline cursor-pointer"
            >
              {isRegisterMode ? "Already have an account? Sign In" : "Don't have an account? Register Here"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

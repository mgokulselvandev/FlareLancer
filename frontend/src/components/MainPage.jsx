import React from "react";
import { useNavigate } from "react-router-dom";
import WalletConnect from "./WalletConnect";

function MainPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Navbar */}
      <div className="navbar relative z-10 px-8 py-4">
        <div className="flex-1">
          <a className="text-2xl font-bold font-display tracking-tight text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg">F</span>
            Flarelance
          </a>
        </div>
        <div className="flex-none">
          <WalletConnect />
        </div>
      </div>

      {/* Fero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-800 text-sm font-medium mb-8 border border-emerald-200/50 backdrop-blur-sm animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Powered by Flare Network
          </div>
          <h1 className="text-6xl md:text-7xl font-bold font-display text-slate-900 mb-6 leading-[1.1] animate-slide-up">
            Decentralized Work <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Reimagined</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Connect with top talent and visionary clients in a trustless, secure environment backed by smart contracts.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Client Card */}
          <div
            onClick={() => navigate("/client")}
            className="group relative p-8 rounded-3xl bg-white border border-slate-100 hover:border-emerald-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 text-xl group-hover:scale-110 transition-transform">
                💼
              </div>
              <h3 className="text-2xl font-bold font-display text-slate-900 mb-2">I'm a Client</h3>
              <p className="text-slate-500 mb-6">Post jobs, manage contracts, and find the perfect talent for your next big project.</p>
              <span className="inline-flex items-center text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform">
                Post a Job <span className="ml-2">→</span>
              </span>
            </div>
          </div>

          {/* Freelancer Card */}
          <div
            onClick={() => navigate("/freelancer")}
            className="group relative p-8 rounded-3xl bg-white border border-slate-100 hover:border-teal-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-teal-100/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6 text-xl group-hover:scale-110 transition-transform">
                👨‍💻
              </div>
              <h3 className="text-2xl font-bold font-display text-slate-900 mb-2">I'm a Freelancer</h3>
              <p className="text-slate-500 mb-6">Find work, build your reputation, and get paid securely with crypto.</p>
              <span className="inline-flex items-center text-teal-600 font-semibold group-hover:translate-x-1 transition-transform">
                Find Work <span className="ml-2">→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;


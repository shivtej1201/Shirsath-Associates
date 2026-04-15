import React, { useState, useEffect } from "react";
import { auth, signInWithGoogle, logout } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Scale,
  Phone,
  Mail,
  Menu,
  X,
  Shield,
  Users,
  Briefcase,
  Star,
  CheckCircle,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  HelpCircle,
  Clock,
  Globe,
  Newspaper,
  MapPin,
  TrendingUp,
  BarChart,
  PhoneCall,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db, handleFirestoreError, OperationType } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import { Language, translations } from "./translations";

const genAI = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
});
console.log("API KEY:", import.meta.env.VITE_GOOGLE_API_KEY);
// --- Types & Schemas ---

const leadSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Invalid phone number").max(20),
  legalIssue: z
    .string()
    .min(10, "Please describe your issue in more detail")
    .max(2000),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Lead extends LeadFormData {
  id: string;
  status: "new" | "contacted" | "closed";
  createdAt: any;
}

// --- Components ---

const CallbackForm = ({ t }: { t: any }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ phone: string }>();

  const onSubmit = async (data: { phone: string }) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "callbacks"), {
        phone: data.phone,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting callback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3 mb-6">
        <PhoneCall className="h-5 w-5 text-black" />
        <h3 className="text-lg font-black uppercase tracking-tight text-black">
          {t.title}
        </h3>
      </div>
      {isSuccess ? (
        <p className="text-xs font-black uppercase tracking-widest text-green-600">
          {t.success}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
          <input
            {...register("phone", { required: true })}
            placeholder={t.placeholder}
            className="flex-grow bg-gray-50 border-2 border-black px-4 py-2 text-xs font-bold outline-none focus:bg-white text-black"
          />
          <button
            disabled={isSubmitting}
            className="bg-black text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "..." : t.go}
          </button>
        </form>
      )}
    </div>
  );
};

const LegalDisclaimerPopup = ({
  onAccept,
  t,
}: {
  onAccept: () => void;
  t: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("legalDisclaimerAccepted");
    if (!accepted) {
      setIsOpen(true);
    } else {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem("legalDisclaimerAccepted", "true");
    setIsOpen(false);
    onAccept();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-2xl w-full bg-white border-8 border-black p-12 shadow-[40px_40px_0px_0px_rgba(255,255,255,0.1)]"
      >
        <div className="flex items-center gap-4 mb-10">
          <Shield className="h-12 w-12 text-black" />
          <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">
            {t.title}
          </h2>
        </div>
        <div className="space-y-6 mb-12">
          <p className="text-lg font-bold uppercase tracking-tight text-black leading-relaxed">
            {t.p1}
          </p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            {t.p2}
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="w-full py-6 bg-black text-white font-black text-xs uppercase tracking-[0.4em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20"
        >
          {t.accept}
        </button>
      </motion.div>
    </div>
  );
};

const WhatsAppButton = () => (
  <a
    href="https://wa.me/1234567890"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-8 left-8 z-40 bg-[#25D366] text-white p-5 rounded-full shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] hover:scale-110 transition-transform flex items-center justify-center group"
    title="Chat on WhatsApp"
  >
    <div className="absolute -top-12 left-0 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      WhatsApp Counsel
    </div>
    <Scale className="h-8 w-8" />
  </a>
);

const Navbar = ({
  onNavigate,
  currentPage,
  user,
  lang,
  setLang,
  t,
}: {
  onNavigate: (page: string) => void;
  currentPage: string;
  user: User | null;
  lang: Language;
  setLang: (l: Language) => void;
  t: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "mr", label: "मराठी" },
    { code: "hi", label: "हिंदी" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
  ];

  const currentLangLabel =
    languages.find((l) => l.code === lang)?.label || "EN";

  return (
    <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-md z-50 border-b border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0"
            onClick={() => onNavigate("home")}
          >
            <div className="relative shrink-0">
              <Scale className="h-7 w-7 sm:h-9 sm:w-9 text-white" />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-2xl font-black text-white tracking-tighter uppercase leading-none truncate">
                Shirsath & Associates
              </span>
              <span className="hidden sm:block text-[8px] font-black tracking-[0.4em] text-gray-500 uppercase mt-1">
                Est. 1995 • Legal Excellence
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest"
              >
                <Globe className="h-3 w-3" />
                {currentLangLabel}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    isLangOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsLangOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-4 w-40 bg-black border border-gray-800 shadow-2xl z-20"
                    >
                      {languages.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code);
                            setIsLangOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white hover:text-black",
                            lang === l.code
                              ? "bg-white/10 text-white"
                              : "text-gray-500",
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => onNavigate("home")}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors hover:text-white",
                currentPage === "home"
                  ? "text-white underline underline-offset-8"
                  : "text-gray-500",
              )}
            >
              {t.home}
            </button>
            <button
              onClick={() => onNavigate("services")}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors hover:text-white",
                currentPage === "services"
                  ? "text-white underline underline-offset-8"
                  : "text-gray-500",
              )}
            >
              {t.practice}
            </button>
            <button
              onClick={() => onNavigate("about")}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors hover:text-white",
                currentPage === "about"
                  ? "text-white underline underline-offset-8"
                  : "text-gray-500",
              )}
            >
              {t.about}
            </button>
            <button className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 group">
              <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />
              {t.portal}
            </button>
            {user && (
              <button
                onClick={() => onNavigate("admin")}
                className={cn(
                  "flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors hover:text-white",
                  currentPage === "admin" ? "text-white" : "text-gray-500",
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                {t.dashboard}
              </button>
            )}
            <a
              href="tel:+1234567890"
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl shadow-white/10"
            >
              <Phone className="h-4 w-4" />
              {t.call}
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-xl shadow-green-500/10"
            >
              <Scale className="h-4 w-4" />
              {t.whatsapp}
            </a>
          </div>

          <div className="lg:hidden flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest"
              >
                <Globe className="h-3 w-3" />
                {lang.toUpperCase()}
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsLangOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-32 bg-black border border-gray-800 shadow-2xl z-20"
                    >
                      {languages.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code);
                            setIsLangOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                            lang === l.code
                              ? "bg-white text-black"
                              : "text-gray-500",
                          )}
                        >
                          {l.code.toUpperCase()}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 p-2"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-black border-b border-gray-900 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-6">
              <button
                onClick={() => {
                  onNavigate("home");
                  setIsOpen(false);
                }}
                className="block w-full text-left text-2xl font-black uppercase tracking-tighter text-white"
              >
                {t.home}
              </button>
              <button
                onClick={() => {
                  onNavigate("services");
                  setIsOpen(false);
                }}
                className="block w-full text-left text-2xl font-black uppercase tracking-tighter text-white"
              >
                {t.practice}
              </button>
              <button
                onClick={() => {
                  onNavigate("about");
                  setIsOpen(false);
                }}
                className="block w-full text-left text-2xl font-black uppercase tracking-tighter text-white"
              >
                {t.about}
              </button>
              <button className="block w-full text-left text-2xl font-black uppercase tracking-tighter text-gray-500">
                {t.portal}
              </button>
              {user && (
                <button
                  onClick={() => {
                    onNavigate("admin");
                    setIsOpen(false);
                  }}
                  className="block w-full text-left text-2xl font-black uppercase tracking-tighter text-white"
                >
                  {t.dashboard}
                </button>
              )}
              <div className="pt-6 grid grid-cols-2 gap-4">
                <a
                  href="tel:+1234567890"
                  className="flex items-center justify-center gap-3 bg-white text-black py-4 text-[10px] font-black uppercase tracking-widest"
                >
                  <Phone className="h-4 w-4" />
                  {t.call}
                </a>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 text-[10px] font-black uppercase tracking-widest"
                >
                  <Scale className="h-4 w-4" />
                  WA
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({
  onContactClick,
  t,
}: {
  onContactClick: () => void;
  t: any;
}) => (
  <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black">
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
      <img
        src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=2000"
        alt="Law Office Background"
        className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col items-center mb-8">
          <span className="px-6 py-2 text-[10px] font-black tracking-[0.4em] text-white uppercase border-2 border-white mb-4">
            {t.legacy}
          </span>
          <div className="w-px h-12 bg-white/20" />
        </div>
        <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black text-white tracking-tighter mb-10 leading-[0.85] uppercase">
          {t.title1} <br />
          <span className="text-gray-800">{t.title2}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-12 leading-relaxed font-medium uppercase tracking-tight">
          {t.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button
            onClick={onContactClick}
            className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-none font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all shadow-2xl shadow-white/20 flex items-center justify-center gap-3 group"
          >
            {t.cta}
            <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
          </button>
          <a
            href="tel:+1234567890"
            className="w-full sm:w-auto px-10 py-5 bg-black text-white border-2 border-white rounded-none font-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
          >
            <Phone className="h-5 w-5" />
            {t.direct}
          </a>
        </div>
      </motion.div>
    </div>
  </section>
);

const StatsSection = ({ t }: { t: any }) => {
  const stats = [
    { label: t.years, value: "28+", icon: <Clock className="h-6 w-6" /> },
    {
      label: t.cases,
      value: "1,200+",
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      label: t.recovered,
      value: "$500M+",
      icon: <BarChart className="h-6 w-6" />,
    },
    { label: t.rate, value: "98%", icon: <CheckCircle className="h-6 w-6" /> },
  ];

  return (
    <section className="py-24 bg-black border-y-4 border-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-24">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center group">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
              </div>
              <div className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-2">
                {stat.value}
              </div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PracticeAreas = ({ t }: { t: any }) => {
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const areas = [
    {
      icon: <Users className="h-8 w-8" />,
      title: t.areas.injury.title,
      desc: t.areas.injury.desc,
      details:
        "Our firm handles complex personal injury litigation with a focus on catastrophic injuries. We have recovered millions for victims of negligence, ensuring they receive the medical care and financial security they deserve.",
      image:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: <Briefcase className="h-8 w-8" />,
      title: t.areas.corporate.title,
      desc: t.areas.corporate.desc,
      details:
        "From startups to Fortune 500 companies, we provide sophisticated counsel on mergers and acquisitions, intellectual property protection, and complex commercial agreements.",
      image:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: t.areas.criminal.title,
      desc: t.areas.criminal.desc,
      details:
        "We provide aggressive defense for individuals and corporations facing criminal charges. Our team includes former prosecutors who understand the intricacies of the criminal justice system.",
      image:
        "https://images.unsplash.com/photo-1453945619913-79ec89a82c51?auto=format&fit=crop&q=80&w=800",
    },
    {
      icon: <Scale className="h-8 w-8" />,
      title: t.areas.family.title,
      desc: t.areas.family.desc,
      details:
        "We handle sensitive family matters with discretion and precision. Our goal is to protect your assets and your future through strategic negotiation or rigorous litigation.",
      image:
        "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=800",
    },
  ];

  return (
    <section className="py-32 bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-none mb-8">
              {t.title}
            </h2>
            <p className="text-xl text-gray-500 font-medium uppercase tracking-tight">
              {t.subtitle}
            </p>
          </div>
          <div className="w-px h-24 bg-black hidden md:block" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {areas.map((area, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedArea(area)}
              className="group relative bg-gray-50 border-4 border-black p-10 hover:bg-black hover:text-white transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity -mr-8 -mt-8">
                <img
                  src={area.image}
                  alt=""
                  className="w-full h-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mb-12 group-hover:scale-110 transition-transform origin-left">
                {area.icon}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">
                {area.title}
              </h3>
              <p className="text-sm font-medium opacity-60 leading-relaxed mb-8">
                {area.desc}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em]">
                {t.view}{" "}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedArea && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArea(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-12 lg:p-20 max-w-2xl w-full border-8 border-black shadow-[40px_40px_0px_0px_rgba(255,255,255,0.1)]"
            >
              <button
                onClick={() => setSelectedArea(null)}
                className="absolute top-8 right-8 text-black hover:scale-110 transition-transform"
              >
                <X className="h-8 w-8" />
              </button>
              <div className="text-black mb-10">{selectedArea.icon}</div>
              <h3 className="text-5xl font-black uppercase tracking-tighter mb-8 text-black">
                {selectedArea.title}
              </h3>
              <p className="text-xl text-gray-600 font-medium leading-relaxed mb-12">
                {selectedArea.details}
              </p>
              <button
                onClick={() => {
                  setSelectedArea(null);
                  document
                    .getElementById("contact-form")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-6 bg-black text-white font-black text-sm uppercase tracking-[0.4em] hover:bg-gray-800 transition-all"
              >
                {t.request}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

const LeadForm = ({ id, t }: { id?: string; t: any }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "leads"), {
        ...data,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "leads");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id={id} className="py-32 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-8 text-white">
              {t.title}
            </h2>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed font-medium">
              {t.subtitle}
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white text-black flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-sm text-white">
                  Confidential Review
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white text-black flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-sm text-white">
                  Expert Analysis
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black p-10 lg:p-16 border-4 border-white shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)]">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-white text-black flex items-center justify-center mx-auto mb-8">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">
                  {t.successTitle}
                </h3>
                <p className="text-gray-500 mb-10 font-medium">
                  {t.successDesc}
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-white font-black uppercase tracking-widest text-xs border-b-2 border-white pb-1 hover:text-gray-400 hover:border-gray-400 transition-all"
                >
                  {t.newInquiry}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                <div className="space-y-8">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-2 block">
                      {t.nameLabel}
                    </label>
                    <input
                      {...register("name")}
                      className={cn(
                        "w-full px-0 py-2 bg-transparent border-b-2 border-white focus:border-gray-600 outline-none transition-all font-bold text-xl placeholder:text-gray-800 text-white",
                        errors.name && "border-red-500",
                      )}
                      placeholder={t.namePlaceholder}
                    />
                    {errors.name && (
                      <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-2 block">
                      {t.phoneLabel}
                    </label>
                    <input
                      {...register("phone")}
                      className={cn(
                        "w-full px-0 py-2 bg-transparent border-b-2 border-white focus:border-gray-600 outline-none transition-all font-bold text-xl placeholder:text-gray-800 text-white",
                        errors.phone && "border-red-500",
                      )}
                      placeholder="+1 (000) 000-0000"
                    />
                    {errors.phone && (
                      <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-2 block">
                      {t.emailLabel}
                    </label>
                    <input
                      {...register("email")}
                      className={cn(
                        "w-full px-0 py-2 bg-transparent border-b-2 border-white focus:border-gray-600 outline-none transition-all font-bold text-xl placeholder:text-gray-800 text-white",
                        errors.email && "border-red-500",
                      )}
                      placeholder="EMAIL@EXAMPLE.COM"
                    />
                    {errors.email && (
                      <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-2 block">
                      {t.issueLabel}
                    </label>
                    <textarea
                      {...register("legalIssue")}
                      rows={3}
                      className={cn(
                        "w-full px-0 py-2 bg-transparent border-b-2 border-white focus:border-gray-600 outline-none transition-all font-bold text-xl placeholder:text-gray-800 text-white resize-none",
                        errors.legalIssue && "border-red-500",
                      )}
                      placeholder={t.issuePlaceholder}
                    />
                    {errors.legalIssue && (
                      <p className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {errors.legalIssue.message}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 bg-white text-black font-black text-sm uppercase tracking-[0.4em] hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)]"
                >
                  {isSubmitting ? t.submitting : t.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const LegalInsights = () => {
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents:
            "Provide 3 brief, high-level summaries of recent significant legal developments in corporate and civil law for a prestigious law firm's website. Format as a list with titles. Use Markdown.",
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        setInsights(
          response.text || "Unable to retrieve latest insights at this time.",
        );
      } catch (error) {
        console.error("Error fetching legal insights:", error);
        setInsights(
          "Our associates are currently analyzing the latest legal precedents.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  return (
    <section className="py-40 bg-white text-black">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <Newspaper className="h-8 w-8" />
              <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">
                Thought Leadership
              </span>
            </div>
            <h2 className="text-6xl font-black tracking-tighter uppercase mb-6 leading-[0.9]">
              Legal <br />
              Insights.
            </h2>
          </div>
          <div className="h-px flex-grow bg-gray-100 mx-8 hidden lg:block" />
          <div className="text-black font-black uppercase tracking-widest text-xs">
            Updated Real-Time
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-100 w-3/4" />
                <div className="h-24 bg-gray-50 w-full" />
              </div>
            ))
          ) : (
            <div className="p-12 border-4 border-black bg-gray-50 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="markdown-body prose prose-xl max-w-none font-medium text-gray-800 leading-relaxed uppercase tracking-tight">
                <Markdown>{insights}</Markdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const LocationSection = ({ t }: { t: any }) => {
  return (
    <section className="py-40 bg-black text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <MapPin className="h-8 w-8" />
              <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                Global Headquarters
              </span>
            </div>
            <h2 className="text-7xl font-black tracking-tighter uppercase mb-12 leading-[0.85]">
              {t.title}
            </h2>
            <div className="space-y-12">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-4">
                  {t.address}
                </div>
                <p className="text-3xl font-black uppercase tracking-tight">
                  123 Law Street, Suite 500
                  <br />
                  Manhattan, NY 10001
                </p>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-4">
                  {t.hours}
                </div>
                <p className="text-xl font-black uppercase tracking-tight">
                  Mon — Fri: 08:00 - 20:00
                  <br />
                  Sat: By Appointment Only
                </p>
              </div>
              <button className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-200 transition-all">
                {t.directions}
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-white/5 -z-10 blur-3xl" />
            <div className="aspect-square bg-gray-900 border-4 border-white relative overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1000"
                alt="Office Location"
                className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-white flex items-center justify-center animate-pulse">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ProcessTimeline = ({ t }: { t: any }) => {
  const steps = [
    { title: t.step1.title, desc: t.step1.desc },
    { title: t.step2.title, desc: t.step2.desc },
    { title: t.step3.title, desc: t.step3.desc },
    { title: t.step4.title, desc: t.step4.desc },
  ];

  return (
    <section className="py-40 bg-white text-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-32">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6">
            {t.title}
          </h2>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border-4 border-black shadow-[40px_40px_0px_0px_rgba(0,0,0,0.05)]">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white p-12 relative group hover:bg-black hover:text-white transition-all duration-700"
            >
              <div className="text-8xl font-black text-gray-100 group-hover:text-gray-900 absolute top-4 right-4 transition-colors">
                0{idx + 1}
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-black text-white group-hover:bg-white group-hover:text-black flex items-center justify-center mb-10 transition-colors">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-6">
                  {step.title}
                </h3>
                <p className="text-gray-500 group-hover:text-gray-400 font-medium leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = ({ t }: { t: any }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: t.q1.q, a: t.q1.a },
    { q: t.q2.q, a: t.q2.a },
    { q: t.q3.q, a: t.q3.a },
    { q: t.q4.q, a: t.q4.a },
  ];

  return (
    <section className="py-40 bg-black text-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-6 mb-20">
          <div className="w-20 h-2 bg-white" />
          <h2 className="text-5xl font-black tracking-tighter uppercase">
            {t.title}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-2 border-white/10 hover:border-white transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full p-8 flex items-center justify-between text-left group"
              >
                <span className="text-xl font-black uppercase tracking-tight group-hover:translate-x-2 transition-transform">
                  {faq.q}
                </span>
                <ChevronDown
                  className={cn(
                    "h-6 w-6 transition-transform duration-500",
                    openIndex === idx && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 pt-0 text-gray-400 font-medium leading-relaxed text-lg border-t border-white/5 mt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FloatingCTA = () => (
  <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
    <a
      href="tel:+1234567890"
      className="w-16 h-16 bg-white text-black flex items-center justify-center shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] hover:scale-110 transition-all group"
    >
      <Phone className="h-6 w-6" />
      <span className="absolute right-full mr-4 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        Call Now
      </span>
    </a>
    <button
      onClick={() =>
        document
          .getElementById("contact-form")
          ?.scrollIntoView({ behavior: "smooth" })
      }
      className="w-16 h-16 bg-black text-white border-2 border-white flex items-center justify-center shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] hover:scale-110 transition-all group"
    >
      <Mail className="h-6 w-6" />
      <span className="absolute right-full mr-4 bg-black text-white border-2 border-white px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        Get Counsel
      </span>
    </button>
  </div>
);

const AdminDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qLeads = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const qCallbacks = query(
      collection(db, "callbacks"),
      orderBy("createdAt", "desc"),
    );

    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Lead[],
      );
    });

    const unsubCallbacks = onSnapshot(qCallbacks, (snapshot) => {
      setCallbacks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubLeads();
      unsubCallbacks();
    };
  }, []);

  const updateStatus = async (
    collectionName: string,
    id: string,
    status: string,
  ) => {
    try {
      await updateDoc(doc(db, collectionName, id), { status });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${collectionName}/${id}`,
      );
    }
  };

  if (loading)
    return (
      <div className="pt-40 text-center font-black uppercase tracking-widest bg-black text-white min-h-screen">
        Loading registry...
      </div>
    );

  return (
    <div className="pt-40 pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-black">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase text-white">
              Registry
            </h2>
            <div className="bg-white text-black px-4 py-1 text-sm font-black uppercase tracking-widest">
              {leads.length + callbacks.length} Total
            </div>
          </div>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">
            Internal portal for Shirsath & Associates • Secure Access
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-6 py-3 border-2 border-white text-xs font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all"
        >
          <LogOut className="h-4 w-4" />
          Terminate Session
        </button>
      </div>

      <div className="space-y-20">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-8 flex items-center gap-4">
            <Briefcase className="h-6 w-6" />
            Full Inquiries
          </h3>
          <div className="bg-black border-4 border-white overflow-hidden shadow-[30px_30px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-black">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Date
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Client
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Matter
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Status
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-white">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-900 transition-colors group"
                    >
                      <td className="px-8 py-8 text-xs font-black text-gray-500 whitespace-nowrap border-r border-gray-800">
                        {lead.createdAt?.toDate().toLocaleDateString()}
                      </td>
                      <td className="px-8 py-8 border-r border-gray-800">
                        <div className="text-base font-black uppercase tracking-tight text-white mb-1">
                          {lead.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                          {lead.email}
                        </div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                          {lead.phone}
                        </div>
                      </td>
                      <td className="px-8 py-8 border-r border-gray-800">
                        <p className="text-sm text-gray-400 line-clamp-2 font-medium italic">
                          "{lead.legalIssue}"
                        </p>
                      </td>
                      <td className="px-8 py-8 border-r border-gray-800">
                        <span
                          className={cn(
                            "px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-2",
                            lead.status === "new" &&
                              "bg-white text-black border-white",
                            lead.status === "contacted" &&
                              "bg-black text-white border-white",
                            lead.status === "closed" &&
                              "bg-gray-800 text-gray-500 border-gray-700",
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-8 py-8">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateStatus("leads", lead.id, e.target.value)
                          }
                          className="text-[10px] font-black uppercase tracking-widest border-2 border-white px-4 py-2 bg-black text-white outline-none"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Archive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-8 flex items-center gap-4">
            <PhoneCall className="h-6 w-6" />
            Quick Callbacks
          </h3>
          <div className="bg-black border-4 border-white overflow-hidden shadow-[30px_30px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-black">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Date
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Phone Number
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] border-r border-gray-200">
                      Status
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-white">
                  {callbacks.map((cb) => (
                    <tr
                      key={cb.id}
                      className="hover:bg-gray-900 transition-colors group"
                    >
                      <td className="px-8 py-8 text-xs font-black text-gray-500 whitespace-nowrap border-r border-gray-800">
                        {cb.createdAt?.toDate().toLocaleDateString()}
                      </td>
                      <td className="px-8 py-8 border-r border-gray-800">
                        <div className="text-xl font-black uppercase tracking-tight text-white">
                          {cb.phone}
                        </div>
                      </td>
                      <td className="px-8 py-8 border-r border-gray-800">
                        <span
                          className={cn(
                            "px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-2",
                            cb.status === "new" &&
                              "bg-white text-black border-white",
                            cb.status === "contacted" &&
                              "bg-black text-white border-white",
                            cb.status === "closed" &&
                              "bg-gray-800 text-gray-500 border-gray-700",
                          )}
                        >
                          {cb.status}
                        </span>
                      </td>
                      <td className="px-8 py-8">
                        <select
                          value={cb.status}
                          onChange={(e) =>
                            updateStatus("callbacks", cb.id, e.target.value)
                          }
                          className="text-[10px] font-black uppercase tracking-widest border-2 border-white px-4 py-2 bg-black text-white outline-none"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Archive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = ({
  onNavigate,
  t,
}: {
  onNavigate: (page: string) => void;
  t: any;
}) => (
  <footer className="bg-white text-black pt-32 pb-12 border-t border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-16 mb-24">
        <div className="col-span-1 sm:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <Scale className="h-8 w-8 sm:h-10 sm:w-10 text-black" />
            <span className="text-xl sm:text-3xl font-black tracking-tighter uppercase">
              Shirsath & Associates
            </span>
          </div>
          <p className="text-gray-500 max-w-sm mb-10 text-lg font-medium leading-relaxed">
            Distinguished legal representation for high-stakes matters.
            Committed to excellence, integrity, and results since 1995.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-gray-500 hover:text-black transition-colors"
            >
              <Mail className="h-6 w-6" />
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-black transition-colors"
            >
              <Phone className="h-6 w-6" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-gray-400">
            Practice
          </h4>
          <ul className="space-y-6 text-sm font-bold uppercase tracking-widest">
            <li>
              <button
                onClick={() => onNavigate("services")}
                className="text-gray-600 hover:text-black transition-colors"
              >
                Corporate Law
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("services")}
                className="text-gray-600 hover:text-black transition-colors"
              >
                Litigation
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("services")}
                className="text-gray-600 hover:text-black transition-colors"
              >
                Real Estate
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("services")}
                className="text-gray-600 hover:text-black transition-colors"
              >
                Family Law
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-gray-400">
            Legal
          </h4>
          <ul className="space-y-6 text-sm font-bold uppercase tracking-widest">
            <li>
              <button className="text-gray-600 hover:text-black transition-colors">
                {t.disclaimer}
              </button>
            </li>
            <li>
              <button className="text-gray-600 hover:text-black transition-colors">
                {t.privacy}
              </button>
            </li>
            <li>
              <button className="text-gray-600 hover:text-black transition-colors">
                {t.terms}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="pt-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">
        © 2026 Shirsath & Associates. {t.rights}
      </div>
    </div>
  </footer>
);

// --- Main App ---

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAccepted, setIsAccepted] = useState(false);
  const [lang, setLang] = useState<Language>("en");

  const t = translations[lang];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const scrollToContact = () => {
    const el = document.getElementById("contact-form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (authLoading)
    return (
      <div className="h-screen flex items-center justify-center font-black uppercase tracking-[0.5em] text-xs">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-white selection:text-black">
      {!isAccepted && (
        <LegalDisclaimerPopup
          onAccept={() => setIsAccepted(true)}
          t={t.disclaimer}
        />
      )}

      <div
        className={cn(
          "transition-opacity duration-1000",
          isAccepted ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <Navbar
          onNavigate={setCurrentPage}
          currentPage={currentPage}
          user={user}
          lang={lang}
          setLang={setLang}
          t={t.nav}
        />

        <main>
          {currentPage === "home" && (
            <>
              <Hero onContactClick={scrollToContact} t={t.hero} />
              <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20 hidden lg:block">
                <div className="max-w-sm ml-auto">
                  <CallbackForm t={t.callback} />
                </div>
              </div>
              <StatsSection t={t.stats} />
              <PracticeAreas t={t.practice} />
              <div className="bg-white py-32 border-y-8 border-gray-100">
                <div className="max-w-7xl mx-auto px-4 text-center">
                  <h2 className="text-5xl font-black text-black uppercase tracking-tighter mb-16">
                    Distinguished Counsel
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
                    <div className="flex flex-col items-center gap-6 p-10 border-2 border-gray-200 hover:border-black transition-all group">
                      <div className="w-16 h-16 bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-[0.3em] text-black">
                        Confidential Consult
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-6 p-10 border-2 border-gray-200 hover:border-black transition-all group">
                      <div className="w-16 h-16 bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-[0.3em] text-black">
                        Contingency Based
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-6 p-10 border-2 border-gray-200 hover:border-black transition-all group">
                      <div className="w-16 h-16 bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-[0.3em] text-black">
                        Global Reach
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <LeadForm id="contact-form" t={t.lead} />
              <ProcessTimeline t={t.process} />
              <LegalInsights />
              <section className="py-40 bg-black">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
                    <div className="max-w-2xl">
                      <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-[0.9] text-white">
                        Client <br />
                        Testimonials.
                      </h2>
                      <p className="text-gray-500 font-medium text-lg uppercase tracking-tight">
                        Verified feedback from our distinguished partners.
                      </p>
                    </div>
                    <div className="h-px flex-grow bg-gray-900 mx-8 hidden lg:block" />
                    <div className="text-white font-black uppercase tracking-widest text-xs">
                      Est. 1995
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-black p-12 text-left border-4 border-white shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)] hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] transition-all"
                      >
                        <div className="flex text-white mb-10">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <p className="text-gray-400 mb-12 font-medium leading-relaxed italic text-lg">
                          "Shirsath & Associates handled my corporate
                          acquisition with surgical precision. Their attention
                          to detail and strategic foresight is unmatched in the
                          industry."
                        </p>
                        <div className="pt-8 border-t-2 border-gray-900">
                          <div className="font-black uppercase tracking-widest text-xs text-white">
                            Executive Client {i}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2">
                            Fortune 500 Partner
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <FAQ t={t.faq} />
              <LocationSection t={t.location} />
            </>
          )}

          {currentPage === "services" && (
            <div className="pt-32">
              <PracticeAreas t={t.practice} />
              <LeadForm t={t.lead} />
            </div>
          )}

          {currentPage === "about" && (
            <div className="pt-48 pb-40 bg-black">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                  <div>
                    <div className="w-20 h-2 bg-white mb-12" />
                    <h2 className="text-5xl sm:text-7xl lg:text-9xl font-black text-white tracking-tighter uppercase mb-12 leading-[0.85]">
                      {t.about.title}
                    </h2>
                    <p className="text-2xl text-gray-500 mb-10 leading-relaxed font-medium uppercase tracking-tight">
                      {t.about.subtitle}
                    </p>
                    <p className="text-lg text-gray-400 mb-16 leading-relaxed font-medium">
                      {t.about.p1}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 border-t-4 border-white pt-16">
                      <div className="group">
                        <div className="text-7xl font-black text-white mb-4 tracking-tighter group-hover:scale-110 transition-transform origin-left">
                          98%
                        </div>
                        <div className="text-xs font-black text-gray-500 uppercase tracking-[0.4em]">
                          Success Rate
                        </div>
                      </div>
                      <div className="group">
                        <div className="text-7xl font-black text-white mb-4 tracking-tighter group-hover:scale-110 transition-transform origin-left">
                          500M+
                        </div>
                        <div className="text-xs font-black text-gray-500 uppercase tracking-[0.4em]">
                          Recovered
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -top-10 -left-10 w-full h-full border-4 border-white -z-10" />
                    <div className="bg-gray-900 aspect-[4/5] overflow-hidden border-4 border-white shadow-[40px_40px_0px_0px_rgba(255,255,255,0.05)]">
                      <img
                        src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1000"
                        alt="Law Firm Interior"
                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-12 -right-12 bg-white text-black p-12 hidden lg:block">
                      <div className="text-4xl font-black tracking-tighter uppercase mb-2">
                        Est. 1995
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50">
                        Legal Excellence
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === "admin" &&
            (user ? (
              <AdminDashboard />
            ) : (
              <div className="h-[80vh] flex flex-col items-center justify-center px-4 bg-black">
                <div className="bg-black p-16 border-4 border-white text-center max-w-md w-full shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)]">
                  <LayoutDashboard className="h-16 w-16 text-white mx-auto mb-8" />
                  <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 text-white">
                    Admin Portal
                  </h2>
                  <p className="text-gray-500 font-medium mb-10">
                    Authorized access only. Please authenticate with your
                    associate credentials.
                  </p>
                  <button
                    onClick={() => signInWithGoogle()}
                    className="w-full py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-200 transition-all flex items-center justify-center gap-4"
                  >
                    <img
                      src="https://www.google.com/favicon.ico"
                      className="w-5 h-5"
                      alt="Google"
                    />
                    Authenticate
                  </button>
                </div>
              </div>
            ))}
        </main>

        <Footer onNavigate={setCurrentPage} t={t.footer} />
        <FloatingCTA />
        <WhatsAppButton />
      </div>
    </div>
  );
}

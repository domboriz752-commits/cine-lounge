import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { activeProfile, logout } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Home", path: "/home" },
    { label: "Movies", path: "/home" },
    { label: "My List", path: "/my-list" },
  ];

  return (
    <motion.nav
      className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3 transition-colors duration-300 md:px-12 ${
        scrolled ? "bg-background" : "bg-gradient-to-b from-background/80 to-transparent"
      }`}
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-8">
        <Link to="/home" className="text-2xl font-bold tracking-tight text-primary">
          STREAMFLIX
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          {navItems.map(item => (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`text-sm transition-colors ${
                isActive(item.path)
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/search")}
          className="text-foreground transition-colors hover:text-primary"
        >
          <Search size={20} />
        </button>

        <div className="relative">
          <button
            className="flex items-center gap-1"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-sm"
              style={{ backgroundColor: activeProfile?.color || "#555" }}
            >
              {activeProfile?.icon || "👤"}
            </div>
            <ChevronDown
              size={14}
              className={`text-foreground transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                className="absolute right-0 top-12 w-48 rounded border border-border bg-popover py-2 shadow-xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => { setShowProfileMenu(false); navigate("/profiles"); }}
                  className="block w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Switch Profile
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); logout(); navigate("/profiles"); }}
                  className="block w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}

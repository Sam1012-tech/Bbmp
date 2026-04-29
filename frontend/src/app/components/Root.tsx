import { Outlet, Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Map, Truck, BarChart3, FileText, Menu, X, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

const WARDS = [
  { name: "Byrasandra", dumps: 18 },
  { name: "HSR Layout", dumps: 24 },
  { name: "Indiranagara", dumps: 31 },
  { name: "JP Nagara", dumps: 15 },
  { name: "Sarakki", dumps: 12 },
  { name: "Thanisandra", dumps: 28 },
  { name: "Whitefield", dumps: 42 },
];

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const selectedWard = searchParams.get("ward") || "";
  const isMapPage = location.pathname === "/";

  const handleWardChange = (ward: string) => {
    if (ward) setSearchParams({ ward });
    else setSearchParams({});
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const navigation = [
    { name: 'Map Dashboard', path: '/', icon: Map },
    { name: 'Officer Dashboard', path: '/officer', icon: FileText },
    { name: 'Truck Routes', path: '/trucks', icon: Truck },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2d7738] text-white shadow-lg sticky top-0 z-50">
        <div className="px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-2">
                <Map className="h-6 w-6 text-[#2d7738]" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Sky Swachh</h1>
                <p className="text-xs text-green-100">AI-Powered Satellite Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-white/20 text-white'
                          : 'text-green-100 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Ward Selector — only on Map Dashboard */}
              {isMapPage && (
                <div className="hidden lg:flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <ChevronDown className="h-3.5 w-3.5 text-green-100 shrink-0" />
                  <select
                    value={selectedWard}
                    onChange={(e) => handleWardChange(e.target.value)}
                    className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="" className="text-gray-800">All Wards</option>
                    {WARDS.map((w) => (
                      <option key={w.name} value={w.name} className="text-gray-800">
                        {w.name} ({w.dumps} dumps)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="h-6 w-px bg-white/20 hidden lg:block mx-2" />

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-green-100 hover:bg-white/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm hidden sm:inline">Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#2d7738] font-semibold hover:bg-green-50 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="text-sm hidden sm:inline">Login</span>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-3 pt-3 border-t border-green-600">
              <div className="flex flex-col gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-white/20 text-white'
                          : 'text-green-100 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

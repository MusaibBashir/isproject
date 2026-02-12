import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Plus, Package, TrendingUp, IndianRupee, Store, BarChart3, Users, History, LogOut, Home, FileText, ClipboardList, ShoppingCart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";

  const adminItems = [
    { label: "Admin Dashboard", icon: Home, to: "/admin" },
    { label: "Manage Franchises", icon: Store, to: "/admin/franchises" },
    { label: "Financial Reports", icon: FileText, to: "/admin/reports" },
    { label: "Analytics", icon: BarChart3, to: "/analytics" },
    { label: "Add Items", icon: Plus, to: "/add-items" },
    { label: "Inventory Details", icon: Package, to: "/admin/inventory" },
    { label: "Stock Orders", icon: ClipboardList, to: "/admin/stock-orders" },
    { label: "Customers", icon: Users, to: "/customers" },
    { label: "Forecast", icon: TrendingUp, to: "/forecast" },
  ];

  const franchiseItems = [
    { label: "Dashboard", icon: Home, to: "/dashboard" },
    { label: "Sales", icon: IndianRupee, to: "/sales" },
    { label: "Inventory Details", icon: Package, to: "/inventory" },
    { label: "Order Stock", icon: ShoppingCart, to: "/order-stock" },
    { label: "Sales History", icon: History, to: "/sales-history" },
    { label: "Customers", icon: Users, to: "/customers" },
    { label: "Forecast", icon: TrendingUp, to: "/forecast" },
  ];

  const menuItems = isAdmin ? adminItems : franchiseItems;

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-white">
        <SheetHeader>
          <SheetTitle className="text-gray-900 text-xl">
            {isAdmin ? "Admin Menu" : "Menu"}
          </SheetTitle>
          <SheetDescription className="text-gray-600">
            {isAdmin ? "Manage franchises and analytics" : "Access your store tools"}
          </SheetDescription>
        </SheetHeader>

        {/* Role badge */}
        <div className="mt-4 mb-2 px-4">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}>
            {isAdmin ? "Admin" : "Franchise"}
          </span>
        </div>

        <div className="flex flex-col gap-1 mt-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left w-full group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5 text-gray-700" />
                </div>
                <span className="text-gray-900 font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Sign Out */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left w-full group"
            >
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                <LogOut className="w-5 h-5 text-gray-700 group-hover:text-red-600" />
              </div>
              <span className="text-gray-900 group-hover:text-red-600 font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
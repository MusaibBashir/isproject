import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Plus, Package, TrendingUp, IndianRupee } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  const menuItems = [
    {
      label: "Sales",
      icon: IndianRupee,
      to: "/sales",
    },
    {
      label: "Add Items",
      icon: Plus,
      to: "/add-items",
    },
    {
      label: "Inventory Details",
      icon: Package,
      to: "/inventory",
    },
    {
      label: "Forecast",
      icon: TrendingUp,
      to: "/forecast",
    },
  ];

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
          <SheetTitle className="text-gray-900 text-xl">Menu</SheetTitle>
          <SheetDescription className="text-gray-600">
            Access inventory and forecasting tools
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-6">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
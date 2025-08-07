
import React from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// Toast removed
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileHeaderProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileHeader = ({ user, activeTab, onTabChange }: MobileHeaderProps) => {
  // Toast removed
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    // Removed toast notification
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-bold truncate">APGS Sales Rep Dashboard</h1>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
        
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Navigate and manage your account
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Navigation</h3>
                <Button
                  variant={activeTab === "leads" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("leads")}
                >
                  Leads
                </Button>
                <Button
                  variant={activeTab === "jobs" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("jobs")}
                >
                  Jobs Sold
                </Button>
                <Button
                  variant={activeTab === "calculator" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("calculator")}
                >
                  Par Calculator
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};


import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp, ShoppingCart, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Leads } from "./Dashboard";
import { JobsSold } from "./JobsSold";
import { ParCalculator } from "./ParCalculator";
import { MobileHeader } from "./MobileHeader";

interface MainDashboardProps {
  user: User;
}

export const MainDashboard = ({ user }: MainDashboardProps) => {
  const [activeTab, setActiveTab] = useState("leads");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader 
          user={user} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <span className="text-sm text-muted-foreground">
                  Welcome back, {user.email}
                </span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={`${isMobile ? 'px-4 pt-4' : 'max-w-7xl mx-auto px-6 pt-6'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {!isMobile && (
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="leads" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Leads</span>
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Jobs Sold</span>
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Par Calculator</span>
              </TabsTrigger>
            </TabsList>
          )}
          
          {/* Mobile Bottom Tab Navigation */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 p-2 z-40">
              <div className="flex justify-around">
                <Button
                  variant={activeTab === "leads" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("leads")}
                  className="flex-1 mx-1"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">Leads</span>
                </Button>
                <Button
                  variant={activeTab === "jobs" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("jobs")}
                  className="flex-1 mx-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  <span className="text-xs">Jobs</span>
                </Button>
                <Button
                  variant={activeTab === "calculator" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("calculator")}
                  className="flex-1 mx-1"
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  <span className="text-xs">Calc</span>
                </Button>
              </div>
            </div>
          )}
          
          <TabsContent value="leads" className={`mt-6 ${isMobile ? 'pb-20' : ''}`}>
            <Leads user={user} />
          </TabsContent>
          
          <TabsContent value="jobs" className={`mt-6 ${isMobile ? 'pb-20' : ''}`}>
            <JobsSold user={user} />
          </TabsContent>
          
          <TabsContent value="calculator" className={`mt-6 ${isMobile ? 'pb-20' : ''}`}>
            <ParCalculator user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

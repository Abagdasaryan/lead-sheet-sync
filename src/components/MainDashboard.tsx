import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Leads } from "./Dashboard";
import { JobsSold } from "./JobsSold";

interface MainDashboardProps {
  user: User;
}

export const MainDashboard = ({ user }: MainDashboardProps) => {
  const [activeTab, setActiveTab] = useState("leads");
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="leads" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Leads</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Jobs Sold</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="leads" className="mt-6">
            <Leads user={user} />
          </TabsContent>
          
          <TabsContent value="jobs" className="mt-6">
            <JobsSold user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
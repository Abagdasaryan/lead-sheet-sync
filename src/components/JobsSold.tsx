import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { User } from "@supabase/supabase-js";
import { RefreshCw, DollarSign, Package } from "lucide-react";
import { MobileDataCard } from "./MobileDataCard";
import { cn } from "@/lib/utils";

interface JobsSoldProps {
  user: User;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  rep_email: string | null;
  rep_alias: string | null;
  created_at: string;
  updated_at: string;
}

interface JobData {
  id?: string;
  customerName: string;
  jobDescription: string;
  amount: number;
  date: string;
}

export const JobsSold = ({ user }: JobsSoldProps) => {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Removed add/edit functionality - jobs come from sheet only
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const PRODUCTION_WEBHOOK_URL = 'https://n8n.srv858576.hstgr.cloud/webhook/4bcba099-6b2a-4177-87c3-8930046d675b';

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchJobsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sheet-data', {
        body: { 
          userEmail: user.email,
          userAlias: profile?.rep_alias,
          sheetType: 'jobs-sold'
        }
      });

      if (error) throw error;

      console.log('Jobs data from backend:', data);
      setJobs(data.rows || []);
      toast({
        title: "Jobs loaded",
        description: `Found ${data.rows?.length || 0} jobs${profile?.rep_alias ? ' using alias' : ''}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed all job modification functions - jobs are read-only from sheet

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    if (profile) {
      fetchJobsData();
    }
  }, [profile]);

  const totalAmount = jobs.reduce((sum, job) => sum + job.amount, 0);

  // Removed form component - jobs are read-only from sheet

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 animate-fade-in">
      <div className={`${isMobile ? 'px-4' : 'max-w-7xl mx-auto px-6'} space-y-6`}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Jobs Sold</h2>
            <p className="text-muted-foreground">Manage your completed jobs and track revenue</p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={fetchJobsData} 
              disabled={loading}
              variant="outline"
              className={`${isMobile ? 'w-full' : ''}`}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${jobs.length > 0 ? (totalAmount / jobs.length).toLocaleString() : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Display */}
        <Card>
          <CardHeader>
            <CardTitle>Your Jobs</CardTitle>
            <CardDescription>
              Jobs linked to your email: {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-lg mb-2">No jobs found</p>
                <p className="text-sm text-muted-foreground">
                  No jobs in the sheet for your account
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                {isMobile ? (
                  <div className="space-y-3">
                    {jobs.map((job, index) => (
                      <Card key={job.id || index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate mb-1">
                                {job.customerName}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {job.jobDescription}
                              </p>
                            </div>
                            
                             {/* Jobs are read-only from sheet */}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Amount:</span>
                              <span className="ml-1 font-medium">${job.amount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <span className="ml-1 font-medium">{job.date}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* Desktop Table View */
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                           <th className="px-4 py-3 text-left font-medium">Customer</th>
                           <th className="px-4 py-3 text-left font-medium">Description</th>
                           <th className="px-4 py-3 text-left font-medium">Amount</th>
                           <th className="px-4 py-3 text-left font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job, index) => (
                          <tr key={job.id || index} className="border-t hover:bg-muted/30">
                             <td className="px-4 py-3">{job.customerName}</td>
                             <td className="px-4 py-3">{job.jobDescription}</td>
                             <td className="px-4 py-3 font-medium">${job.amount.toLocaleString()}</td>
                             <td className="px-4 py-3">{job.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { User } from "@supabase/supabase-js";
import { RefreshCw, DollarSign, Package, Settings, CheckCircle } from "lucide-react";
import { MobileDataCard } from "./MobileDataCard";
import { LineItemsModal } from "./LineItemsModal";
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
  client: string;
  job_number: string;
  rep: string;
  price_sold: string;
  payment_type: string;
  install_date: string;
  sf_order_id: string;
  lineItemsCount?: number;
  lineItems?: Array<{
    product_name: string;
    quantity: number;
  }>;
  webhookSent?: boolean;
}

export const JobsSold = ({ user }: JobsSoldProps) => {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const openLineItemsModal = (job: JobData) => {
    setSelectedJob(job);
    setLineItemsModalOpen(true);
  };

  const closeLineItemsModal = () => {
    setSelectedJob(null);
    setLineItemsModalOpen(false);
    // Refresh jobs to update line items count and webhook status
    setTimeout(() => {
      fetchJobsData();
    }, 100); // Small delay to ensure database operations complete
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    if (profile) {
      fetchJobsData();
    }
  }, [profile]);

  const totalAmount = jobs.reduce((sum, job) => sum + (parseFloat(job.price_sold?.toString() || '0') || 0), 0);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-700 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">${totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Average Job Value</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
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
                                {job.client || 'Unknown Client'}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">
                                Job #{job.job_number || 'N/A'} - {job.payment_type || 'N/A'}
                              </p>
                              <div className="text-xs text-muted-foreground mt-1">
                                {job.lineItems && job.lineItems.length > 0 ? (
                                  <div className="space-y-1">
                                    {job.lineItems.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        {item.product_name}: {item.quantity}x
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs">No line items</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {job.webhookSent && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Sent
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLineItemsModal(job)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Amount:</span>
                              <span className="ml-1 font-medium">${parseFloat(job.price_sold?.toString() || '0').toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Install Date:</span>
                              <span className="ml-1 font-medium">{job.install_date || 'N/A'}</span>
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
                            <th className="px-4 py-3 text-left font-medium">Client</th>
                            <th className="px-4 py-3 text-left font-medium">Job Number</th>
                            <th className="px-4 py-3 text-left font-medium">Amount</th>
                            <th className="px-4 py-3 text-left font-medium">Install Date</th>
                            <th className="px-4 py-3 text-left font-medium">Payment Type</th>
                            <th className="px-4 py-3 text-left font-medium">Line Items</th>
                            <th className="px-4 py-3 text-left font-medium">Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {jobs.map((job, index) => (
                           <tr key={job.id || index} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3">{job.client || 'Unknown'}</td>
                                <td className="px-4 py-3">{job.job_number || 'N/A'}</td>
                                <td className="px-4 py-3 font-medium">${parseFloat(job.price_sold?.toString() || '0').toLocaleString()}</td>
                                <td className="px-4 py-3">{job.install_date || 'N/A'}</td>
                                <td className="px-4 py-3">{job.payment_type || 'N/A'}</td>
                                 <td className="px-4 py-3">
                                   <div className="space-y-1">
                                     {job.lineItems && job.lineItems.length > 0 ? (
                                       job.lineItems.map((item, idx) => (
                                         <div key={idx} className="text-xs text-muted-foreground">
                                           {item.product_name}: <span className="text-primary font-medium">{item.quantity}x</span>
                                         </div>
                                       ))
                                     ) : (
                                       <span className="text-muted-foreground text-xs">No line items</span>
                                     )}
                                   </div>
                                 </td>
                                <td className="px-4 py-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openLineItemsModal(job)}
                                  >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage
                                  </Button>
                                </td>
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

        {/* Line Items Modal */}
        {selectedJob && (
          <LineItemsModal
            isOpen={lineItemsModalOpen}
            onClose={closeLineItemsModal}
            jobData={{
              sf_order_id: selectedJob.sf_order_id,
              client: selectedJob.client,
              job_number: selectedJob.job_number,
              install_date: selectedJob.install_date
            }}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
};

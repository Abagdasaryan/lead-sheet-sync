
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useIsMobile } from "@/hooks/use-mobile";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { User } from "@supabase/supabase-js";
import { Profile, JobData } from "@/types/sheets";
import { RefreshCw, DollarSign, Package, Settings, CheckCircle, Lock, Unlock } from "lucide-react";
import { MobileDataCard } from "./MobileDataCard";
import { LineItemsModal } from "./LineItemsModal";
import { cn } from "@/lib/utils";

interface JobsSoldProps {
  user: User;
}

// Interfaces moved to types/sheets.ts

export const JobsSold = ({ user }: JobsSoldProps) => {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  
  const { handleError } = useErrorHandler();
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
      handleError(error, 'fetching profile');
    }
  };

  const fetchJobsData = async () => {
    setLoading(true);
    try {
      // Fetch jobs with line items directly from database
      // RLS policies now filter by rep field matching user's full_name
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs_sold')
        .select(`
          *,
          job_line_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total
          )
        `);

      if (jobsError) throw jobsError;

      // Jobs data retrieved successfully
      
      // Transform database data to match current JobData interface
      const transformedJobs = (jobsData || []).map(job => ({
        id: job.id,
        client: job.client,
        job_number: job.job_number,
        rep: job.rep,
        price_sold: job.lead_sold_for?.toString() || '0',
        payment_type: job.payment_type,
        install_date: job.install_date,
        sf_order_id: job.sf_order_id,
        lineItems: job.job_line_items?.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity
        })) || [],
        webhookSent: !!job.webhook_sent_at,
        webhookSentAt: job.webhook_sent_at
      }));
      
      setJobs(transformedJobs);
      console.info(`Jobs loaded: ${transformedJobs.length}`);
    } catch (error: any) {
      handleError(error, 'fetching jobs');
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
    fetchJobsData();
  }, [user.id]);

  const totalAmount = jobs.reduce((sum, job) => sum + (parseFloat(job.price_sold?.toString() || '0') || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 animate-fade-in">
      <div className={`${isMobile ? 'px-4' : 'max-w-7xl mx-auto px-6'} space-y-6`}>
        {/* Header Actions */}
        <div className="animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-card to-card/50 rounded-xl sm:rounded-2xl shadow-elegant border border-border/50 backdrop-blur-sm">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Jobs Sold
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your completed jobs and track revenue
              </p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={fetchJobsData} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 shadow-primary transition-all duration-300 hover:shadow-hover hover:scale-105"
                size="lg"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                {loading ? "Loading..." : "Refresh Data"}
              </Button>
            </div>
          </div>
        </div>

        
        {/* Jobs Display */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Your Jobs
            </CardTitle>
            <CardDescription className="text-sm">
              Jobs linked to your email: <span className="font-medium text-foreground">{user.email}</span>
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
                      <Card key={job.job_number} className="hover:shadow-md transition-shadow">
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
                                   <div className="flex flex-wrap gap-1">
                                     {job.lineItems.slice(0, 3).map((item, idx) => (
                                       <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                         {item.product_name}: {item.quantity}x
                                       </span>
                                     ))}
                                     {job.lineItems.length > 3 && (
                                       <span className="text-xs text-muted-foreground">+{job.lineItems.length - 3} more</span>
                                     )}
                                   </div>
                                 ) : (
                                   <span className="text-xs text-muted-foreground">No line items</span>
                                 )}
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {job.webhookSent ? (
                                <div className="flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Sent
                                  </Badge>
                                </div>
                              ) : (
                                <Unlock className="w-3 h-3 text-green-600" />
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLineItemsModal(job)}
                              >
                                <Settings className={cn(isMobile ? 'h-3 w-3' : 'h-4 w-4')} />
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
                             <th className="px-4 py-3 text-left font-medium">Status</th>
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
                            <tr key={job.job_number} className="border-t hover:bg-muted/30">
                                 <td className="px-4 py-3">
                                   <div className="flex items-center gap-2">
                                     {job.webhookSent ? (
                                       <div className="flex items-center gap-1">
                                         <Lock className="w-4 h-4 text-amber-600" />
                                         <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                                           <CheckCircle className="w-3 h-3 mr-1" />
                                           Locked
                                         </Badge>
                                       </div>
                                     ) : (
                                       <div className="flex items-center gap-1">
                                         <Unlock className="w-4 h-4 text-green-600" />
                                         <Badge variant="outline" className="text-green-600 border-green-600">
                                           Editable
                                         </Badge>
                                       </div>
                                     )}
                                   </div>
                                 </td>
                                 <td className="px-4 py-3">{job.client || 'Unknown'}</td>
                                 <td className="px-4 py-3">{job.job_number || 'N/A'}</td>
                                 <td className="px-4 py-3 font-medium">${parseFloat(job.price_sold?.toString() || '0').toLocaleString()}</td>
                                 <td className="px-4 py-3">{job.install_date || 'N/A'}</td>
                                 <td className="px-4 py-3">{job.payment_type || 'N/A'}</td>
                                 <td className="px-4 py-3">
                                   <div className="flex flex-wrap gap-1 max-w-xs">
                                     {job.lineItems && job.lineItems.length > 0 ? (
                                       <>
                                         {job.lineItems.slice(0, 4).map((item, idx) => (
                                           <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary whitespace-nowrap">
                                             {item.product_name}: {item.quantity}x
                                           </span>
                                         ))}
                                         {job.lineItems.length > 4 && (
                                           <span className="text-xs text-muted-foreground">+{job.lineItems.length - 4} more</span>
                                         )}
                                       </>
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
        </div>

        {/* Line Items Modal */}
        {selectedJob && (
          <LineItemsModal
            isOpen={lineItemsModalOpen}
            onClose={closeLineItemsModal}
            jobData={{
              sf_order_id: selectedJob.sf_order_id,
              client: selectedJob.client,
              job_number: selectedJob.job_number,
              install_date: selectedJob.install_date,
              lineItems: selectedJob.lineItems
            }}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
};

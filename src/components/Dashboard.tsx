import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface DashboardProps {
  user: User;
}

export const Dashboard = ({ user }: DashboardProps) => {
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sheet-data', {
        body: { userEmail: user.email }
      });

      if (error) throw error;

      setSheetData(data.rows || []);
      toast({
        title: "Data loaded",
        description: `Found ${data.rows?.length || 0} rows for your email.`,
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

  useEffect(() => {
    fetchSheetData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.email}</p>
          </div>
          <div className="space-x-2">
            <Button onClick={fetchSheetData} disabled={loading}>
              {loading ? "Loading..." : "Refresh Data"}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Sheet Data</CardTitle>
            <CardDescription>
              Data filtered for your email: {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sheetData.length === 0 ? (
              <p className="text-muted-foreground">No data found for your email.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(sheetData[0] || {}).map((key) => (
                        <th key={key} className="border border-border p-2 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="border border-border p-2">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
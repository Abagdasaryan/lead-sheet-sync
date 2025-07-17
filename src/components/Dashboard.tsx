import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, LogOut, Database, Filter, X, TrendingUp, Save, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardProps {
  user: User;
}

export const Dashboard = ({ user }: DashboardProps) => {
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [editedData, setEditedData] = useState<Record<number, any>>({});
  const { toast } = useToast();

  // Define editable columns
  const editableColumns = ['Status', 'Lost Reason', 'Last Price'];
  const allColumns = ['date', 'CLIENT NAME', 'AppointmentName', 'Status', 'Lost Reason', 'Last Price'];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const handleEdit = (rowIndex: number) => {
    setEditingRows(prev => new Set([...prev, rowIndex]));
    // Initialize edited data with current row data
    if (!editedData[rowIndex]) {
      setEditedData(prev => ({
        ...prev,
        [rowIndex]: { ...sheetData[rowIndex] }
      }));
    }
  };

  const handleSave = (rowIndex: number) => {
    // Update the main data with edited values
    setSheetData(prev => prev.map((row, index) => 
      index === rowIndex ? { ...row, ...editedData[rowIndex] } : row
    ));
    
    // Remove from editing set
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowIndex);
      return newSet;
    });

    toast({
      title: "Changes saved",
      description: "Row has been updated successfully.",
    });
  };

  const handleCancel = (rowIndex: number) => {
    // Remove from editing set and discard changes
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowIndex);
      return newSet;
    });
    
    // Remove edited data
    setEditedData(prev => {
      const newData = { ...prev };
      delete newData[rowIndex];
      return newData;
    });
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [column]: value
      }
    }));
  };

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sheet-data', {
        body: { 
          userEmail: user.email,
          filterDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
        }
      });

      if (error) throw error;

      setSheetData(data.rows || []);
      toast({
        title: "Data loaded",
        description: `Found ${data.rows?.length || 0} rows${selectedDate ? ` for ${format(selectedDate, 'PPP')}` : ''}.`,
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
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 animate-fade-in">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-gradient-to-r from-card to-card/50 rounded-2xl shadow-elegant border border-border/50 backdrop-blur-sm">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Welcome back, <span className="text-foreground font-medium">{user.email}</span>
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Connected to Google Sheets</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={fetchSheetData} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 shadow-primary transition-all duration-300 hover:shadow-hover hover:scale-105"
                size="lg"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                {loading ? "Loading..." : "Refresh Data"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                size="lg"
                className="hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-r from-card to-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filters
              </CardTitle>
              <CardDescription>Filter your data by date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal transition-all duration-300",
                        !selectedDate && "text-muted-foreground",
                        "hover:shadow-primary hover:border-primary/50"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date to filter</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{sheetData.length}</div>
              <p className="text-xs text-muted-foreground">
                {selectedDate ? `for ${format(selectedDate, 'PPP')}` : 'all time'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Email</CardTitle>
              <Database className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{user.email}</div>
              <p className="text-xs text-muted-foreground">
                authenticated user
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-hover transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Source</CardTitle>
              <Filter className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Google Sheets</div>
              <p className="text-xs text-muted-foreground">
                live connection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Your Sheet Data
              </CardTitle>
              <CardDescription>
                Data filtered for your email: <span className="font-medium text-foreground">{user.email}</span>
                {selectedDate && (
                  <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    {format(selectedDate, 'PPP')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sheetData.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">No data found</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate 
                      ? `No records found for ${format(selectedDate, 'PPP')}` 
                      : 'No records found for your email'
                    }
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-muted to-muted/50">
                        <tr>
                          {allColumns.map((column) => (
                            <th key={column} className="border-r border-border/30 p-4 text-left font-semibold text-foreground">
                              {column}
                            </th>
                          ))}
                          <th className="border-r border-border/30 p-4 text-left font-semibold text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheetData.map((row, rowIndex) => {
                          const isEditing = editingRows.has(rowIndex);
                          const currentData = isEditing ? { ...row, ...editedData[rowIndex] } : row;
                          
                          return (
                            <tr 
                              key={rowIndex} 
                              className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/30"
                            >
                              {allColumns.map((column) => {
                                const isEditable = editableColumns.includes(column);
                                const cellValue = currentData[column] || '';
                                
                                return (
                                  <td key={column} className="border-r border-border/20 p-4 text-sm">
                                    {isEditing && isEditable ? (
                                      <Input
                                        value={cellValue}
                                        onChange={(e) => handleCellChange(rowIndex, column, e.target.value)}
                                        className="w-full min-w-[120px]"
                                        placeholder={`Enter ${column}`}
                                      />
                                    ) : (
                                      <span className={cn(
                                        isEditable && !isEditing && "cursor-pointer hover:bg-primary/5 px-2 py-1 rounded transition-colors",
                                        column === 'Status' && cellValue && getStatusColor(cellValue),
                                        "block min-h-[32px] flex items-center"
                                      )}>
                                        {cellValue}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border-r border-border/20 p-4 text-sm">
                                <div className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleSave(rowIndex)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCancel(rowIndex)}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(rowIndex)}
                                      className="hover:bg-primary/10 hover:border-primary"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function to get status colors
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('confirmed') || statusLower.includes('booked')) {
    return 'text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  if (statusLower.includes('pending') || statusLower.includes('scheduled')) {
    return 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  if (statusLower.includes('cancelled') || statusLower.includes('lost')) {
    return 'text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium';
  }
  return 'text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium';
};
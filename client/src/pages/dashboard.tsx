import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Clock, Route, CheckCircle, Building, Calendar, CalendarCheck, Cog, ChartBar, CalendarDays } from "lucide-react";
import StatisticsTab from "@/components/statistics-tab";
import ScheduleTab from "@/components/schedule-tab";

interface DashboardStats {
  totalCustomers: number;
  totalTravelTimeSaved: number;
  totalTravelTimeOriginal: number;
  totalTravelTimeOptimized: number;
  improvementPercentage: number;
  averageTravelTimeOriginal: number;
  averageTravelTimeOptimized: number;
  medianTravelTimeOriginal: number;
  medianTravelTimeOptimized: number;
  dailySlotCounts: {
    [day: string]: {
      optimizedSlots: number;
      originalSlots: number;
    };
  };
  timeShiftData: Array<{
    timeShift: number;
    customerCount: number;
  }>;
}

export default function Dashboard() {
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load CSV data mutation
  const loadDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/load-csv-data");
      return response.json();
    },
    onSuccess: () => {
      setDataLoaded(true);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
    },
  });

  // Dashboard stats query
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-stats"],
    enabled: dataLoaded,
  });

  // Load data on component mount
  useEffect(() => {
    if (!dataLoaded && !loadDataMutation.isPending) {
      loadDataMutation.mutate();
    }
  }, [dataLoaded, loadDataMutation]);

  if (isLoading || loadDataMutation.isPending) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600">Failed to load dashboard data</p>
                <Button 
                  onClick={() => loadDataMutation.mutate()} 
                  className="mt-4"
                  disabled={loadDataMutation.isPending}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <div className="w-full h-full flex">
        <Tabs defaultValue="statistics" className="h-full w-full flex" orientation="vertical">
          {/* Left sidebar navigation */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center">
                <Route className="h-6 w-6 mr-2" style={{ color: '#00365b' }} />
                <h1 className="text-lg font-bold text-gray-800">
                  TCA Schedule Optimizer
                </h1>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Franchise 372 • Mount Prospect
              </div>
              
              {/* Configuration Settings */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Configuration Settings</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-600" />
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-mono text-gray-800">2025-07-07</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-3 w-3 text-gray-600" />
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-mono text-gray-800">2025-07-13</span>
                  </div>
                </div>
              </div>

            </div>
            <TabsList className="flex flex-col h-auto bg-transparent p-2 space-y-1">
              <TabsTrigger 
                value="statistics" 
                className="w-full justify-start text-left data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-l-2 data-[state=active]:border-blue-700 flex items-center gap-2"
              >
                <ChartBar className="h-4 w-4" />
                Statistics & Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="w-full justify-start text-left data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-l-2 data-[state=active]:border-blue-700 flex items-center gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Schedule Comparison
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 h-full">
            <TabsContent value="statistics" className="h-full mt-0 p-4 overflow-hidden">
              <StatisticsTab stats={stats} />
            </TabsContent>
            
            <TabsContent value="schedule" className="h-full mt-0">
              <ScheduleTab stats={stats} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

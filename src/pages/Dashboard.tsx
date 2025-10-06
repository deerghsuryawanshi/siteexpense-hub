import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, TrendingUp, Building2, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DashboardStats {
  todayTotal: number;
  monthTotal: number;
  unpaidTotal: number;
  sitesCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayTotal: 0,
    monthTotal: 0,
    unpaidTotal: 0,
    sitesCount: 0,
  });
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0];

      // Fetch today's expenses
      const { data: todayExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("date", today);

      // Fetch month's expenses
      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .gte("date", firstDayOfMonth);

      // Fetch unpaid expenses
      const { data: unpaidExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("payment_status", "unpaid");

      // Fetch sites count
      const { data: sites } = await supabase.from("sites").select("id");

      // Fetch category-wise data
      const { data: expensesByCategory } = await supabase
        .from("expenses")
        .select("amount, categories(category_name)")
        .gte("date", firstDayOfMonth);

      // Fetch monthly trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: monthlyExpenses } = await supabase
        .from("expenses")
        .select("amount, date")
        .gte("date", sixMonthsAgo.toISOString().split("T")[0])
        .order("date");

      // Process data
      const todayTotal = todayExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const monthTotal = monthExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const unpaidTotal = unpaidExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      // Process category data
      const categoryMap = new Map();
      expensesByCategory?.forEach((exp: any) => {
        const category = exp.categories?.category_name || "Other";
        categoryMap.set(category, (categoryMap.get(category) || 0) + Number(exp.amount));
      });
      const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      // Process monthly trend
      const monthMap = new Map();
      monthlyExpenses?.forEach((exp: any) => {
        const month = new Date(exp.date).toLocaleDateString("en-US", { month: "short" });
        monthMap.set(month, (monthMap.get(month) || 0) + Number(exp.amount));
      });
      const monthlyChartData = Array.from(monthMap.entries()).map(([month, amount]) => ({
        month,
        amount,
      }));

      setStats({
        todayTotal,
        monthTotal,
        unpaidTotal,
        sitesCount: sites?.length || 0,
      });
      setCategoryData(categoryChartData);
      setMonthlyData(monthlyChartData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your construction expenses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Expenses</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₹{stats.todayTotal.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₹{stats.monthTotal.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.sitesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unpaid Bills</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-warning">₹{stats.unpaidTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SiteSummary {
  site_name: string;
  received: number;
  expense: number;
  balance: number;
}

interface AccountSummary {
  account_name: string;
  expense: number;
  credit: number;
  transferIn: number;
  transferOut: number;
}

const Dashboard = () => {
  const [siteSummary, setSiteSummary] = useState<SiteSummary[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch site-wise summary
      const { data: allSites } = await supabase
        .from("sites")
        .select("id, site_name");

      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("site_id, amount, payment_method, bank_account_id");

      const { data: allCredits } = await supabase
        .from("credits")
        .select("site_id, amount, payment_method, bank_account_id");

      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("id, account_name");

      const { data: fundTransfers } = await supabase
        .from("fund_transfers")
        .select("from_account_id, to_account_id, amount");

      // Process site-wise summary
      const siteSummaryData: SiteSummary[] = [];
      allSites?.forEach((site) => {
        const siteExpenses = allExpenses
          ?.filter((exp) => exp.site_id === site.id)
          .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
        
        const siteCredits = allCredits
          ?.filter((credit) => credit.site_id === site.id)
          .reduce((sum, credit) => sum + Number(credit.amount), 0) || 0;

        siteSummaryData.push({
          site_name: site.site_name,
          received: siteCredits,
          expense: siteExpenses,
          balance: siteCredits - siteExpenses,
        });
      });

      // Process account-wise summary
      const accountSummaryData: AccountSummary[] = [];

      // Cash summary (no fund transfers for cash)
      const cashExpenses = allExpenses
        ?.filter((exp) => exp.payment_method === 'cash')
        .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      
      const cashCredits = allCredits
        ?.filter((credit) => credit.payment_method === 'cash')
        .reduce((sum, credit) => sum + Number(credit.amount), 0) || 0;

      accountSummaryData.push({
        account_name: 'Cash',
        expense: cashExpenses,
        credit: cashCredits,
        transferIn: 0,
        transferOut: 0,
      });

      // Bank account summaries
      bankAccounts?.forEach((account) => {
        const bankExpenses = allExpenses
          ?.filter((exp) => exp.payment_method === 'bank_transfer' && exp.bank_account_id === account.id)
          .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
        
        const bankCredits = allCredits
          ?.filter((credit) => credit.payment_method === 'bank_transfer' && credit.bank_account_id === account.id)
          .reduce((sum, credit) => sum + Number(credit.amount), 0) || 0;

        // Calculate fund transfers for this account
        const transferIn = fundTransfers
          ?.filter((t) => t.to_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const transferOut = fundTransfers
          ?.filter((t) => t.from_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        accountSummaryData.push({
          account_name: account.account_name,
          expense: bankExpenses,
          credit: bankCredits,
          transferIn,
          transferOut,
        });
      });

      setSiteSummary(siteSummaryData);
      setAccountSummary(accountSummaryData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate totals for overview
  const totalSiteBalance = siteSummary.reduce((sum, site) => sum + site.balance, 0);
  const totalAccountBalance = accountSummary.reduce((sum, acc) => 
    sum + (acc.credit + acc.transferIn - acc.expense - acc.transferOut), 0
  );
  const totalRevenue = siteSummary.reduce((sum, site) => sum + site.received, 0);
  const totalExpenses = siteSummary.reduce((sum, site) => sum + site.expense, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Financial overview and site performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">All credits received</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalExpenses.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">All expenses incurred</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSiteBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₹{totalSiteBalance.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall site balance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sites</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{siteSummary.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Construction sites</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg sm:text-xl">Site-wise Summary</CardTitle>
                <CardDescription className="text-xs mt-1">Performance breakdown by construction site</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {siteSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs sm:text-sm font-semibold">SITE NAME</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">RECEIVED</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">EXPENSE</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteSummary.map((site, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="text-xs sm:text-sm font-medium py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {site.site_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right text-success font-medium">
                          ₹{site.received.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right text-destructive font-medium">
                          ₹{site.expense.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right font-semibold py-4">
                          <Badge variant={site.balance >= 0 ? "default" : "destructive"} className="font-mono">
                            ₹{site.balance.toLocaleString('en-IN')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-primary/5 hover:bg-primary/5 border-t-2">
                      <TableCell className="text-xs sm:text-sm uppercase">TOTAL</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-success">
                        ₹{siteSummary.reduce((sum, site) => sum + site.received, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-destructive">
                        ₹{siteSummary.reduce((sum, site) => sum + site.expense, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        <Badge variant={totalSiteBalance >= 0 ? "default" : "destructive"} className="font-mono font-bold">
                          ₹{totalSiteBalance.toLocaleString('en-IN')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground p-8">
                <Building2 className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No site data available</p>
                <p className="text-xs mt-1">Add sites and transactions to see the summary</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-lg sm:text-xl">Account Summary</CardTitle>
                <CardDescription className="text-xs mt-1">Cash and bank account balances</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {accountSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs sm:text-sm font-semibold">ACCOUNT NAME</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">CREDIT</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">EXPENSE</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right font-semibold">BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountSummary.map((account, index) => {
                      const balance = account.credit + account.transferIn - account.expense - account.transferOut;
                      const isCash = account.account_name === 'Cash';
                      
                      return (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="text-xs sm:text-sm font-medium py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${isCash ? 'bg-accent' : 'bg-primary'}`} />
                              {account.account_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-right text-success font-medium">
                            ₹{account.credit.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-right text-destructive font-medium">
                            ₹{account.expense.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-right font-semibold py-4">
                            <Badge variant={balance >= 0 ? "default" : "destructive"} className="font-mono">
                              ₹{balance.toLocaleString('en-IN')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-accent/5 hover:bg-accent/5 border-t-2">
                      <TableCell className="text-xs sm:text-sm uppercase">TOTAL</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-success">
                        ₹{accountSummary.reduce((sum, acc) => sum + acc.credit, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-destructive">
                        ₹{accountSummary.reduce((sum, acc) => sum + acc.expense, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        <Badge variant={totalAccountBalance >= 0 ? "default" : "destructive"} className="font-mono font-bold">
                          ₹{totalAccountBalance.toLocaleString('en-IN')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground p-8">
                <Wallet className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No account data available</p>
                <p className="text-xs mt-1">Add bank accounts and transactions to see the summary</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
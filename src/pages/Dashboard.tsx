import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

      // Cash summary
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
      });

      // Bank account summaries
      bankAccounts?.forEach((account) => {
        const bankExpenses = allExpenses
          ?.filter((exp) => exp.payment_method === 'bank_transfer' && exp.bank_account_id === account.id)
          .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
        
        const bankCredits = allCredits
          ?.filter((credit) => credit.payment_method === 'bank_transfer' && credit.bank_account_id === account.id)
          .reduce((sum, credit) => sum + Number(credit.amount), 0) || 0;

        accountSummaryData.push({
          account_name: account.account_name,
          expense: bankExpenses,
          credit: bankCredits,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your construction finances</p>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Site-wise Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {siteSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">SITE</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Received</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">EXPENSE</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteSummary.map((site, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs sm:text-sm font-medium">{site.site_name}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">
                          ₹{site.received.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">
                          ₹{site.expense.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className={`text-xs sm:text-sm text-right font-medium ${site.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          ₹{site.balance.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="text-xs sm:text-sm">TOTAL</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        ₹{siteSummary.reduce((sum, site) => sum + site.received, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        ₹{siteSummary.reduce((sum, site) => sum + site.expense, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className={`text-xs sm:text-sm text-right ${siteSummary.reduce((sum, site) => sum + site.balance, 0) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        ₹{siteSummary.reduce((sum, site) => sum + site.balance, 0).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {accountSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">ACCOUNT</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">CREDIT</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">EXPENSE</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountSummary.map((account, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs sm:text-sm font-medium">{account.account_name}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">
                          ₹{account.credit.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right">
                          ₹{account.expense.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className={`text-xs sm:text-sm text-right font-medium ${(account.credit - account.expense) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          ₹{(account.credit - account.expense).toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="text-xs sm:text-sm">TOTAL</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        ₹{accountSummary.reduce((sum, acc) => sum + acc.credit, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right">
                        ₹{accountSummary.reduce((sum, acc) => sum + acc.expense, 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className={`text-xs sm:text-sm text-right ${(accountSummary.reduce((sum, acc) => sum + acc.credit, 0) - accountSummary.reduce((sum, acc) => sum + acc.expense, 0)) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        ₹{(accountSummary.reduce((sum, acc) => sum + acc.credit, 0) - accountSummary.reduce((sum, acc) => sum + acc.expense, 0)).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
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
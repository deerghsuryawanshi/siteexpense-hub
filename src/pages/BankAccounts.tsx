import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Landmark, Trash2 } from "lucide-react";

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string | null;
  balance: number;
  created_at: string;
}

const BankAccounts = () => {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setBankAccounts(data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newBankAccount = {
      account_name: formData.get("account_name") as string,
      account_number: formData.get("account_number") as string,
      bank_name: formData.get("bank_name") as string,
      ifsc_code: formData.get("ifsc_code") as string,
      balance: parseFloat(formData.get("balance") as string),
    };

    const { error } = await supabase.from("bank_accounts").insert([newBankAccount]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Bank account added successfully",
      });
      setDialogOpen(false);
      fetchBankAccounts();
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
      fetchBankAccounts();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your bank accounts and track balances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bank Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  name="account_name"
                  placeholder="Enter account name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  placeholder="Enter bank name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  name="account_number"
                  placeholder="Enter account number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  name="ifsc_code"
                  placeholder="Enter IFSC code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Initial Balance (₹)</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter initial balance"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Add Bank Account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Account Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Bank Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Account Number</TableHead>
                  <TableHead className="text-xs sm:text-sm">IFSC Code</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Balance</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {bankAccounts.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs sm:text-sm text-muted-foreground py-8">
                    No bank accounts found. Add your first bank account to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                        <span className="truncate">{account.account_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{account.bank_name}</TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">{account.account_number}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{account.ifsc_code || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-xs sm:text-sm whitespace-nowrap">
                      ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccounts;
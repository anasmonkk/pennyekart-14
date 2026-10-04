import LegalLinks from "@/components/LegalLinks";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface Props {
  userType: "delivery_staff" | "selling_partner";
  title: string;
  dashboardPath: string;
  signupPath: string;
  forgotPath: string;
}

const PartnerLogin = ({ userType, title, dashboardPath, signupPath, forgotPath }: Props) => {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();

  // Already signed in on this device → skip the form.
  useEffect(() => {
    if (!authLoading && user && profile?.user_type === userType && profile.is_approved) {
      navigate(dashboardPath, { replace: true });
    }
  }, [authLoading, user, profile, userType, dashboardPath, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);

    const email = `${mobile}@pennyekart.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, user_type")
        .eq("user_id", data.user.id)
        .single();

      if (!profile || profile.user_type !== userType) {
        await supabase.auth.signOut();
        toast({ title: "Access denied", description: "This login is not for your account type.", variant: "destructive" });
      } else if (!profile.is_approved) {
        await supabase.auth.signOut();
        toast({ title: "Account pending", description: "Your account is awaiting admin approval.", variant: "destructive" });
      } else {
        navigate(dashboardPath);
      }
    }
    setLoading(false);
  };

  // While a saved login is being restored, don't flash the form.
  const restoring = authLoading;
  if (restoring) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Pennyekart" className="mx-auto mb-4 h-12" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>Login with your mobile number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="10-digit number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <div className="flex justify-between text-sm">
              <Link to={forgotPath} className="text-primary underline">Forgot Password?</Link>
              <Link to={signupPath} className="text-primary underline">Sign Up</Link>
            </div>
            <LegalLinks className="pt-2" />
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLogin;

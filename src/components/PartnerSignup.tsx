import LegalLinks from "@/components/LegalLinks";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface LocalBody {
  id: string;
  name: string;
  body_type: string;
  ward_count: number;
  district_id: string;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  userType: "delivery_staff" | "selling_partner";
  title: string;
  description: string;
  sellerType?: "normal" | "utility";
  loginPath?: string;
}

const nativeSelectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const PartnerSignup = ({ userType, title, description, sellerType, loginPath: loginPathProp }: Props) => {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [localBodyId, setLocalBodyId] = useState("");
  const [wardNumber, setWardNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("locations_districts").select("id, name").eq("is_active", true).order("sort_order")
      .then(({ data, error }) => {
        if (error) console.error("District fetch error:", error);
        if (data) setDistricts(data);
      });
  }, []);

  useEffect(() => {
    if (!districtId) { setLocalBodies([]); return; }
    supabase.from("locations_local_bodies").select("id, name, body_type, ward_count, district_id")
      .eq("district_id", districtId).eq("is_active", true).order("sort_order")
      .then(({ data, error }) => {
        if (error) console.error("Local body fetch error:", error);
        if (data) setLocalBodies(data as LocalBody[]);
      });
  }, [districtId]);

  const selectedLocalBody = localBodies.find(lb => lb.id === localBodyId);
  const wardOptions = selectedLocalBody ? Array.from({ length: selectedLocalBody.ward_count }, (_, i) => i + 1) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);

    const email = `${mobile}@pennyekart.local`;
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          mobile_number: mobile,
          date_of_birth: dob,
          user_type: userType,
          local_body_id: localBodyId || null,
          ward_number: wardNumber ? parseInt(wardNumber) : null,
          ...(userType === "selling_partner" ? { seller_type: sellerType ?? "normal" } : {}),
        },
      },
    });

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      const updates: Record<string, string> = {};
      if (sellerType) updates.seller_type = sellerType;

      if (avatarFile && signUpData.user) {
        const path = `avatars/${signUpData.user.id}-${Date.now()}.${avatarFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("products").upload(path, avatarFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
          updates.avatar_url = pub.publicUrl;
        }
      }

      if (signUpData.user && Object.keys(updates).length) {
        await supabase.from("profiles").update(updates).eq("user_id", signUpData.user.id);
      }
      await supabase.auth.signOut();
      toast({ title: "Registration successful!", description: "Your account is pending admin approval." });
      navigate(loginPathProp ?? (userType === "delivery_staff" ? "/delivery-staff/login" : "/selling-partner/login"));
    }
    setLoading(false);
  };

  const loginPath = loginPathProp ?? (userType === "delivery_staff" ? "/delivery-staff/login" : "/selling-partner/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Pennyekart" className="mx-auto mb-4 h-12" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="h-20 w-20 border border-border">
                  {avatarPreview && <AvatarImage src={avatarPreview} alt="Profile preview" />}
                  <AvatarFallback className="text-lg">
                    {fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : <Camera className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(""); }}
                    className="absolute -right-1 -top-1 rounded-full border border-border bg-background p-1 shadow"
                    aria-label="Remove profile picture"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                {avatarPreview ? "Change photo" : "Add profile picture"}
              </Button>
              <p className="text-xs text-muted-foreground">Optional</p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: "Image too large", description: "Please choose an image under 2MB", variant: "destructive" });
                    return;
                  }
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="10-digit number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="flex gap-2">
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="flex-1"
                  required
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" type="button" className="shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={dob ? new Date(dob + "T00:00:00") : undefined}
                      onSelect={(date) => date && setDob(format(date, "yyyy-MM-dd"))}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      captionLayout="dropdown-buttons"
                      fromYear={1940}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="district">District</Label>
              <select
                id="district"
                value={districtId}
                onChange={(e) => { setDistrictId(e.target.value); setLocalBodyId(""); setWardNumber(""); }}
                className={nativeSelectClass}
              >
                <option value="">Select district</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="localBody">Panchayath / Municipality</Label>
              <select
                id="localBody"
                value={localBodyId}
                onChange={(e) => { setLocalBodyId(e.target.value); setWardNumber(""); }}
                disabled={!districtId}
                className={nativeSelectClass}
              >
                <option value="">Select panchayath</option>
                {localBodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name} ({lb.body_type})</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ward">Ward</Label>
              <select
                id="ward"
                value={wardNumber}
                onChange={(e) => setWardNumber(e.target.value)}
                disabled={!localBodyId}
                className={nativeSelectClass}
              >
                <option value="">Select ward</option>
                {wardOptions.map(w => <option key={w} value={String(w)}>Ward {w}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Repeat Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Sign Up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered? <Link to={loginPath} className="text-primary underline">Login here</Link>
            </p>
            <LegalLinks className="pt-2" />
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerSignup;

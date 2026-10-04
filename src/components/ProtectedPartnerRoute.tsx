import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
  userType: "delivery_staff" | "selling_partner";
  loginPath: string;
}

const ProtectedPartnerRoute = ({ children, userType, loginPath }: Props) => {
  const { user, profile, loading } = useAuth();

  // Wait for the profile too: a saved session briefly has user but no profile yet.
  if (loading || (user && !profile)) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (profile?.user_type !== userType) return <Navigate to={loginPath} replace />;
  if (!profile?.is_approved) return <Navigate to={loginPath} replace />;

  return <>{children}</>;
};

export default ProtectedPartnerRoute;

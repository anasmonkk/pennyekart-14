import PartnerLogin from "@/components/PartnerLogin";

const SellingPartnerLogin = () => (
  <PartnerLogin
    userType="selling_partner"
    title="Selling Partner Login"
    dashboardPath="/selling-partner/dashboard"
    signupPath="/selling-partner/signup"
    forgotPath="/selling-partner/forgot-password"
    rememberMobile
  />
);

export default SellingPartnerLogin;

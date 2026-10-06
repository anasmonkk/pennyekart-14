import { Link } from "react-router-dom";
import LegalPageLayout, { ContactBlock } from "@/components/LegalPageLayout";

const Terms = () => (
  <LegalPageLayout
    title="Terms & Conditions"
    description="Terms governing use of the Pennyekart marketplace, customer services, seller partner services, delivery partner services and local utility services."
  >
    <h2>1. Introduction</h2>
    <p>
      These Terms apply to the Pennyekart website, Customer App, Seller Partner App, Delivery Partner App, dashboards, marketplace,
      delivery services, utility/local services, wallet and reward features, and related Pennyekart services. By using the platform,
      you agree to the Terms that apply to you.
    </p>

    <h2>2. Accounts</h2>
    <ul>
      <li>Provide accurate information and keep it updated.</li>
      <li>Protect your login credentials.</li>
      <li>Use your account lawfully and do not impersonate another person.</li>
    </ul>
    <p>Pennyekart may suspend or restrict accounts involved in fraud, abuse, unlawful activity or serious violations.</p>

    <h2>3. Customer orders</h2>
    <ul>
      <li>Product descriptions, availability, prices and delivery charges may change.</li>
      <li>Orders are subject to availability.</li>
      <li>An order may be cancelled or refused if products are unavailable, the area is not supported, information is incorrect or operational issues occur.</li>
      <li>Delivery availability depends on supported areas.</li>
    </ul>

    <h2>4. Product information</h2>
    <p>Sellers are responsible for accurate product information, prices, stock, descriptions and images. Pennyekart may remove listings that break the law or platform rules.</p>

    <h2>5. Seller Partner terms</h2>
    <p>Seller Partners must:</p>
    <ul>
      <li>Provide accurate business, tax and registration information where required.</li>
      <li>Offer only lawful products and services, and never list prohibited or illegal products.</li>
      <li>Keep pricing and stock information accurate.</li>
      <li>Fulfil accepted orders and cooperate with customer and order support.</li>
      <li>Comply with applicable laws.</li>
    </ul>
    <p>Seller Partners are responsible for the legality and accuracy of their listings.</p>

    <h2>6. Delivery Partner terms</h2>
    <p>Delivery Partners must:</p>
    <ul>
      <li>Accept and complete assigned deliveries responsibly and follow delivery instructions.</li>
      <li>Keep customer and order information confidential and never misuse it.</li>
      <li>Update delivery status accurately.</li>
      <li>Follow traffic, safety and other applicable laws.</li>
      <li>Handle returns and undelivered orders according to platform procedures.</li>
    </ul>

    <h2>7. Utility and local services</h2>
    <p>
      Pennyekart may connect customers with independent service partners such as electricians, plumbers, mechanics, transport providers
      and other local providers. Where an independent partner provides the service, that partner may be responsible for the actual service
      quality, subject to applicable law and the specific service arrangement.
    </p>

    <h2>8. Delivery areas</h2>
    <p>Delivery and service availability may be limited to supported panchayaths, municipalities, wards and service zones. Pennyekart may expand or change these areas.</p>

    <h2>9. Payments</h2>
    <p>You may be required to pay product/service charges, delivery charges, taxes or other fees shown before you confirm. Payment processing may involve third-party payment providers.</p>

    <h2>10. Wallet and rewards</h2>
    <ul>
      <li>Wallet balances and rewards follow the applicable program rules.</li>
      <li>Rewards may have conditions, limits or expiry.</li>
      <li>Rewards are not equivalent to cash unless expressly stated.</li>
      <li>Pennyekart may modify or discontinue reward programs, subject to applicable law.</li>
    </ul>

    <h2>11. Partner settlements</h2>
    <p>
      Seller, service and delivery partners receive settlements according to platform rules, commissions, deductions, returns, cancellations
      and other agreed terms. Pennyekart maintains settlement and transaction records.
    </p>

    <h2>12. Prohibited use</h2>
    <p>You must not:</p>
    <ul>
      <li>Commit fraud, impersonate others or misuse accounts.</li>
      <li>Upload illegal content or list prohibited/illegal products.</li>
      <li>Manipulate orders, rewards or wallet systems.</li>
      <li>Interfere with platform security or attempt unauthorised access.</li>
      <li>Misuse customer, seller or delivery partner information.</li>
      <li>Use the platform for any unlawful purpose.</li>
    </ul>

    <h2>13. Intellectual property</h2>
    <p>
      Pennyekart branding, software, design, logos, text and platform content are protected by intellectual-property laws. You may not copy,
      modify, distribute or commercially use them without permission, except where the law allows.
    </p>

    <h2>14. Privacy</h2>
    <p>Your use of Pennyekart is also subject to our <Link className="underline" to="/privacy-policy">Privacy Policy</Link>.</p>

    <h2>15. Third-party services</h2>
    <p>Third-party services such as WhatsApp, maps, payment providers, notification providers and other integrated services have their own terms and privacy policies.</p>

    <h2>16. Platform availability</h2>
    <p>
      We aim to keep the platform available but do not guarantee uninterrupted or error-free operation. Services may be temporarily unavailable
      because of maintenance, technical failures, network issues, third-party failures or circumstances beyond reasonable control.
    </p>

    <h2>17. Disclaimer and liability</h2>
    <p>
      To the extent permitted by applicable law, Pennyekart is not responsible for indirect or consequential losses arising from use of the
      platform. Nothing in these Terms excludes liability that cannot legally be excluded.
    </p>

    <h2>18. Suspension and termination</h2>
    <p>
      Pennyekart may suspend or terminate access where necessary because of fraud, misuse, unlawful activity, security concerns or serious
      violation of these Terms. You may stop using the platform at any time and request account deletion at{" "}
      <Link className="underline" to="/delete-account">/delete-account</Link>.
    </p>

    <h2>19. Changes to these Terms</h2>
    <p>We may update these Terms. The updated version will be published on this page.</p>

    <h2>20. Governing law</h2>
    <p>These Terms are governed by the applicable laws of India, and disputes are subject to the courts with jurisdiction under those laws.</p>

    <h2>21. Contact</h2>
    <ContactBlock />
  </LegalPageLayout>
);

export default Terms;

import { Link } from "react-router-dom";
import LegalPageLayout, { ContactBlock } from "@/components/LegalPageLayout";

const PrivacyPolicy = () => (
  <LegalPageLayout
    title="Privacy Policy"
    description="How Pennyekart collects, uses, shares and deletes personal and business information across its customer, seller partner and delivery partner services."
  >
    <h2>1. Introduction</h2>
    <p>
      This Privacy Policy applies to the Pennyekart website, the Pennyekart Customer App, Seller Partner App, Delivery Partner App,
      partner dashboards and related services (together, the "platform"). "Pennyekart", "we", "us" and "our" refer to the platform and its operator.
    </p>
    <p>
      It explains what information we collect, how we use it, when we share it, how we protect and retain it, how you can delete it,
      your choices and rights, and how we may change this policy.
    </p>

    <h2>2. Information we collect</h2>
    <p><b>Customer information</b></p>
    <ul>
      <li>Name, mobile number and email address (where provided).</li>
      <li>Password or login credentials where applicable (stored securely by our login provider).</li>
      <li>Date of birth where collected, to confirm eligibility to use the service.</li>
      <li>Panchayath/municipality and ward, to show products and services available in your area.</li>
      <li>Delivery address, contact name and phone number.</li>
      <li>Order information, service requests, wallet and reward information.</li>
      <li>Search terms and platform interactions, used to improve the catalogue.</li>
      <li>A notification/device token when you enable notifications.</li>
    </ul>
    <p><b>Location</b></p>
    <ul>
      <li>Device location is accessed only when you actively use a location feature, such as setting a delivery pin or finding nearby products and services.</li>
      <li>It may be used for delivery pins, nearby products, nearby services and delivery/service operations.</li>
      <li>Pennyekart does not continuously track you and does not intentionally use background location tracking, unless a future feature is separately disclosed and you permit it.</li>
    </ul>
    <p><b>Photos</b></p>
    <ul>
      <li>You may choose images from your device for product listings, profile photos or other supported uploads. Photos are selected and uploaded by you; the app does not continuously access your camera.</li>
    </ul>
    <p><b>Microphone and voice</b></p>
    <ul>
      <li>Voice input may be available in Penny Assistant. Speech is converted to text by your device or browser speech service. We do not store audio recordings.</li>
    </ul>
    <p><b>Notifications</b></p>
    <ul>
      <li>When you enable notifications, we collect a device token to send order, delivery, service, account and relevant platform updates. You can turn notifications off in supported settings or your device settings.</li>
    </ul>

    <h2>3. Seller Partner information</h2>
    <p>Seller Partners may provide:</p>
    <ul>
      <li>Name and contact details, business name and business address.</li>
      <li>GST or other business registration information where applicable.</li>
      <li>Bank/settlement details and service areas.</li>
      <li>Product information, images, pricing and stock.</li>
      <li>Order fulfilment information and partner account activity.</li>
    </ul>
    <p>We use this to operate the seller marketplace, process orders, manage settlements and maintain business records.</p>

    <h2>4. Delivery Partner information</h2>
    <p>Delivery Partners may provide:</p>
    <ul>
      <li>Name, mobile number, account and profile information.</li>
      <li>Delivery assignments and order/delivery status.</li>
      <li>Delivery-related location information where required for an active delivery.</li>
      <li>Other information required to complete assigned deliveries.</li>
    </ul>
    <p>We do not continuously track Delivery Partners in the background.</p>

    <h2>5. Utility / Service Partner information</h2>
    <p>Local service providers such as electricians, plumbers, mechanics, transport providers and others may provide:</p>
    <ul>
      <li>Name, business/service information and contact details.</li>
      <li>Service areas and availability.</li>
      <li>Information needed to fulfil customer requests.</li>
    </ul>

    <h2>6. How we use information</h2>
    <ul>
      <li>Create and manage accounts.</li>
      <li>Process orders and provide delivery services.</li>
      <li>Connect customers with sellers and with service/utility partners.</li>
      <li>Manage seller partner and delivery partner operations.</li>
      <li>Process partner settlements and maintain transaction and accounting records.</li>
      <li>Send notifications and service updates, and provide customer support.</li>
      <li>Prevent fraud and misuse and maintain security.</li>
      <li>Improve our products, services, user experience and the Pennyekart marketplace.</li>
    </ul>

    <h2>7. Sharing of information</h2>
    <p>We share information only as reasonably necessary with:</p>
    <ul>
      <li>Sellers handling your order, Delivery Partners handling delivery, and utility/service partners handling your service request — only what they need, such as name, phone and address.</li>
      <li>Payment/financial service providers where applicable.</li>
      <li>Technology providers that help run the platform, for example Supabase (database, login, file storage), Google Maps (maps and location pins), Firebase Cloud Messaging (notifications) and image/file storage providers.</li>
      <li>Government, regulators or authorities when legally required.</li>
    </ul>
    <p>If you tap a WhatsApp link or button, the WhatsApp app or service opens and WhatsApp's own privacy policy and terms apply.</p>
    <p><b>Pennyekart does not sell personal information.</b></p>

    <h2>8. Payments and financial information</h2>
    <p>
      We maintain transaction, wallet, reward and settlement records. We do not store complete card numbers, UPI credentials, CVV or banking passwords.
      Where a third-party payment provider processes a payment, that provider's own terms and privacy policy may apply.
    </p>

    <h2>9. Wallet and rewards</h2>
    <p>We may maintain your wallet balance, reward points, reward history and transaction history. Wallet and reward features follow the rules shown in the platform.</p>

    <h2>10. Data security</h2>
    <p>
      We use reasonable technical and organisational measures to protect information, including encrypted connections, role-based access,
      database access controls, authentication controls and restricted access to sensitive information. No system is completely secure,
      so we cannot guarantee absolute security.
    </p>

    <h2>11. Data retention</h2>
    <p>We keep information while:</p>
    <ul>
      <li>your account is active or services are being provided;</li>
      <li>transactions are being processed;</li>
      <li>legal or accounting obligations require it;</li>
      <li>fraud or security investigations require it; or</li>
      <li>legitimate business purposes require it.</li>
    </ul>
    <p>After account deletion, certain transaction, settlement, accounting or legally required records may be kept (anonymised where possible) for the required period.</p>

    <h2>12. Account and data deletion</h2>
    <p>
      You can request deletion of your account and personal information from your profile or dashboard, or at{" "}
      <Link className="underline" to="/delete-account">/delete-account</Link>. Some information may be retained where required by law,
      accounting, fraud prevention or other legitimate legal requirements.
    </p>

    <h2>13. Your rights and choices</h2>
    <p>Where applicable, you can:</p>
    <ul>
      <li>View and update your profile information.</li>
      <li>Manage notification settings.</li>
      <li>Deny or control location, photo and microphone permissions.</li>
      <li>Request correction of inaccurate information.</li>
      <li>Request account deletion.</li>
      <li>Contact us with privacy questions.</li>
    </ul>

    <h2>14. Third-party services</h2>
    <p>Third-party services such as maps, WhatsApp, notification services, payment providers and other integrated services have their own policies, which apply when you use them.</p>

    <h2>15. Children</h2>
    <p>Pennyekart is not intended for children under 13, and we do not encourage children to use services that are not intended for them.</p>

    <h2>16. Changes to this policy</h2>
    <p>We may update this policy from time to time. The updated version will be published on this page.</p>

    <h2>17. Contact</h2>
    <ContactBlock />
  </LegalPageLayout>
);

export default PrivacyPolicy;

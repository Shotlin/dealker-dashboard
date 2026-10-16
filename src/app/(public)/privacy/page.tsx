export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-slate-500">Last updated: 14 October 2026</p>
      <p>
        This policy explains what personal information Dealker (&quot;we&quot;, &quot;us&quot;) collects when you
        use the Dealker app and website, why we collect it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><b>Account details:</b> your mobile number, name, email address and profile photo (optional).</li>
        <li><b>Delivery details:</b> saved addresses, pincode and, when you allow it, your device location to find your delivery address and nearby repair shops.</li>
        <li><b>Orders and payments:</b> items you buy, sell, bid on or repair, order history and wallet transactions. Card, UPI and bank details are handled by our payment partner Razorpay; we do not store your card number or UPI PIN.</li>
        <li><b>Device information for selling, exchange and repair:</b> device model, condition, IMEI/serial number and photos you upload.</li>
        <li><b>Usage and device data:</b> app version, device type and crash or performance logs, used to keep the service reliable and secure.</li>
        <li><b>Messages and support:</b> conversations with our support team.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To create your account, verify you with a one-time password and keep it secure.</li>
        <li>To process orders, auctions, payments, refunds, pickups, deliveries and repairs.</li>
        <li>To share the details a seller, repair shop or courier needs to fulfil your request (for example your name, delivery address and phone number).</li>
        <li>To send order, auction and repair updates and, if you allow, offers and reminders.</li>
        <li>To prevent fraud, enforce our Terms and meet legal and tax obligations.</li>
        <li>To improve the app and our services.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We do not sell your personal information. We share it only with:</p>
      <ul>
        <li>Sellers, repair shops and buyers you transact with, limited to what is needed for that transaction.</li>
        <li>Delivery and logistics partners.</li>
        <li>Payment providers such as Razorpay.</li>
        <li>Service providers who help us run the app (hosting, SMS, notifications, maps), under confidentiality obligations.</li>
        <li>Authorities, when the law requires it.</li>
      </ul>

      <h2>Location, camera and notifications</h2>
      <p>
        The app asks for location to fill in your address and find nearby repair shops, camera access to scan an
        IMEI or add photos, and permission to send notifications. You can turn each off in your phone settings;
        some features may then work with limits.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is active and for as long as needed for orders, warranties,
        disputes, accounting and legal requirements. Invoices and transaction records are kept for the period the
        law requires.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>View and update your profile and addresses in the app.</li>
        <li>Control notifications from <i>Profile → Notification preferences</i>.</li>
        <li>Delete your account from <i>Profile → Delete account</i>. Some records are kept where the law requires.</li>
        <li>Ask us a question about your data at support@dealker.in.</li>
      </ul>

      <h2>Security</h2>
      <p>
        We use encryption in transit, access controls and monitoring to protect your information. No system is
        perfectly secure, so please keep your phone and one-time passwords private.
      </p>

      <h2>Children</h2>
      <p>Dealker is not meant for anyone under 18 and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date above and, for significant changes, tell you in the app.</p>

      <h2>Contact</h2>
      <p>
        <a className="text-indigo-700" href="mailto:support@dealker.in">support@dealker.in</a>
      </p>
    </>
  )
}

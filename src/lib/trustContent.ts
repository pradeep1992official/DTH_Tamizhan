import { refundPolicy } from './refundPolicy';
import { termsPolicy } from './termsPolicy';
import { privacyPolicy } from './privacyPolicy';
export const BUSINESS_DETAILS = {
  legalName: 'SMP Enterprises',
  address: 'I, 68/72C, East Street, Thirukoilur - 605757',
  phone: '+91 9677-156-157',
  email: 'support@dthtamizhan.in',
  supportHours: 'Monday to Friday, 10:00 am to 6:00 pm IST',
  gstin: '33CDBPP1554Q1Z8',
  grievanceOfficer: 'Pradeep, Grievance Officer',
  grievanceEmail: 'professorpradeeps@gmail.com',
  grievanceAddress: '68/72C, East Street, Thirukoilur - 605757',
  // Merchant grievance commitments follow consumer rules, not Razorpay's own complaint SLA.
  acknowledgement: 'Within 48 hours of receiving the complaint, with a copy of the recorded complaint',
  resolution: 'Within one month of receiving the complaint, subject to any shorter applicable legal deadline',
  refundReview: 'We check the payment status and whether the operator recharge was completed. We communicate the decision or any further information needed through the grievance process; Razorpay does not set a separate merchant eligibility-review deadline',
  refundProcessing: 'After approval, we must manually submit the refund through Razorpay and confirm the initiation date and refund reference. Approval alone does not start bank processing; Razorpay does not prescribe our internal approval-to-submission deadline',
  bankCredit: 'Razorpay refunds are returned to the original payment method where supported. Processing and bank-credit time depend on the payment method and bank. After initiation, we provide the refund reference and the payment provider’s estimated timeline. Contact support if that estimate is exceeded; a cancellation request or refund approval alone does not start bank processing',
  reconciliation: 'Report a debit with an unconfirmed payment immediately. Razorpay may check the bank for late authorisation for up to 3 days from payment creation. This is a payment-status reconciliation window, not a promise of recharge completion or bank-refund credit within 3 days',
  feesAndTaxes: 'The amount displayed at checkout is the amount charged; this checkout does not add a separate Razorpay gateway surcharge. Razorpay processing fees and 18% GST on those fees are merchant charges under the merchant agreement, not an automatic 18% tax on the recharge value. Any applicable customer charges or taxes must be disclosed before payment. The payment receipt is not a tax invoice',
  policyDate: '24 November 2026',
  retention: 'Account profiles and saved boxes are kept while needed to provide the account service; verified deletion requests are reviewed by support, subject to required records. Closed support correspondence is retained for 2 years after closure as our business retention period. Payment, recharge and refund records needed for GST accounts are retained for 72 months from the due date for the annual return for the relevant year. Records involved in proceedings or investigations are retained until one year after final disposal or the statutory retention period, whichever is later. Other applicable legal holds may extend retention. Removal or anonymisation of records no longer needed is handled through manual review; automatic deletion is not implemented',
  processors: 'Google Cloud Run and Firebase Hosting host the deployed website. Google/Firebase provides authentication and database storage; Razorpay processes payments; Brevo sends transactional emails. Optional AI pack suggestions send preferences and plan information to Google Gemini. Information shared with each provider is limited to its service purpose. Hosting, logs and provider processing may occur in India or other countries according to deployment configuration and provider terms; India-only processing is not promised',
  installation: 'For new-connection bookings, a technician will contact you within 24\u201348 hours after booking to arrange installation. The set-top box is provided on a rental basis',
} as const;

export const POLICY_ROUTES = [
  { path: '/contact', key: 'contact', en: 'Contact & Grievance Details', ta: 'தொடர்பு மற்றும் குறைதீர்ப்பு விவரங்கள்' },
  { path: '/refund-policy', key: 'refund', en: 'Refund & Cancellation Policy', ta: 'பணத்திருப்பல் மற்றும் ரத்துசெய்தல் கொள்கை' },
  { path: '/privacy-policy', key: 'privacy', en: 'Privacy Policy', ta: 'தனியுரிமைக் கொள்கை' },
  { path: '/terms', key: 'terms', en: 'Terms of Use', ta: 'பயன்பாட்டு விதிமுறைகள்' },
] as const;
export type PolicyKey = typeof POLICY_ROUTES[number]['key'];
export type PolicySection = { heading: string; paragraphs: string[] };
const b = BUSINESS_DETAILS;
export const POLICY_CONTENT: Record<PolicyKey, PolicySection[]> = {
  contact: [
    {"heading": "Recharge, bookings and service requests", "paragraphs": ["Start a recharge from Recharge or the saved connection on Home. Use Recharge history for payment and recharge updates, My Bookings for new connections, and My tickets for service requests. You can also contact us by phone or WhatsApp using the details on this page.", "For an account-check failure, tell us the selected operator and the lookup reference if one is shown. A lookup-provider failure is not confirmation that the customer ID is incorrect. Never send API keys, passwords or payment credentials to support."]},
    { heading: 'How to ask for help', paragraphs: [
      'For a recharge, payment, cancellation or privacy question, use the support details below.',
      'Share the order reference, operator, amount, date and a short description. Mask unrelated personal or banking details in screenshots. Never share your OTP, UPI PIN, password, full card number or CVV.',
      'If your account was debited but the recharge is not confirmed, keep the transaction reference and ask support to check its status. Avoid paying again while the first payment is unresolved.',
    ] },
    { heading: 'Complaints and escalation', paragraphs: [
      `If support has not resolved your issue, contact ${b.grievanceOfficer} at ${b.grievanceEmail}. Postal contact: ${b.grievanceAddress}. Include your earlier support reference.`,
      `Acknowledgement: ${b.acknowledgement}. Resolution: ${b.resolution}. These are our grievance commitments; Razorpay handles complaints submitted directly to it under its own policy. Your statutory complaint and consumer-forum rights are unaffected.`,
    ] },
  ],
  refund: refundPolicy('en', b),
  privacy: privacyPolicy('en', b),
  terms: termsPolicy('en', b),
};

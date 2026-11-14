export const BUSINESS_DETAILS = {
  legalName: 'SMP Enterprises',
  address: 'I, 68/72C, East Street, Thirukoilur - 605757',
  phone: '+91 8144404504',
  email: 'professorpradeeps@gmail.com',
  supportHours: 'Monday to Friday, 10:00 am to 6:00 pm IST',
  gstin: '33CDBPP1554Q1Z8',
  grievanceOfficer: 'Lavanya, Grievance Officer',
  grievanceEmail: 'lavanyacommunication09@gmail.com',
  grievanceAddress: '68/72C, East Street, Thirukoilur - 605757',
  // Merchant grievance commitments follow consumer rules, not Razorpay's own complaint SLA.
  acknowledgement: 'Within 48 hours of receiving the complaint, with a copy of the recorded complaint',
  resolution: 'Within one month of receiving the complaint, subject to any shorter applicable legal deadline',
  refundReview: 'SMP Enterprises checks the payment status and whether the operator recharge was completed. We communicate the decision or any further information needed through the grievance process; Razorpay does not set a separate merchant eligibility-review deadline',
  refundProcessing: 'After approval, SMP Enterprises must manually submit the refund through Razorpay and confirm the initiation date and refund reference. Approval alone does not start bank processing; Razorpay does not prescribe our internal approval-to-submission deadline',
  bankCredit: 'Normally 7–10 working days after initiation of a normal Razorpay refund, to the original payment method. Timing depends on the bank and payment method; contact support with the refund reference if the stated period is exceeded',
  reconciliation: 'Report a debit with an unconfirmed payment immediately. Razorpay may check the bank for late authorisation for up to 3 days from payment creation. This is a payment-status reconciliation window, not a promise of recharge completion or bank-refund credit within 3 days',
  feesAndTaxes: 'The amount displayed at checkout is the amount charged; this checkout does not add a separate Razorpay gateway surcharge. Razorpay processing fees and 18% GST on those fees are merchant charges under the merchant agreement, not an automatic 18% tax on the recharge value. Any applicable customer charges or taxes must be disclosed before payment. The payment receipt is not a tax invoice',
  policyDate: 'To be announced after launch; this policy is a draft until its effective date is published',
  retention: 'Account profiles and saved boxes are kept while needed to provide the account service; verified deletion requests are reviewed by support, subject to required records. Closed support correspondence is retained for 2 years after closure as our business retention period. Payment, recharge and refund records needed for GST accounts are retained for 72 months from the due date for the annual return for the relevant year. Records involved in proceedings or investigations are retained until one year after final disposal or the statutory retention period, whichever is later. Other applicable legal holds may extend retention. Removal or anonymisation of records no longer needed is handled through manual review; automatic deletion is not implemented',
  processors: 'Netlify is the current hosting provider selected for deployment. Google/Firebase provides authentication and database storage; Razorpay processes payments; Brevo sends transactional emails. Optional AI pack suggestions send preferences and plan information to Google Gemini. Information shared with each provider is limited to its service purpose. Hosting, logs and provider processing may occur in India or other countries according to deployment configuration and provider terms; India-only processing is not promised',
  installation: 'Not applicable. DTH Tamizhan provides DTH recharges only; installation services, installation service areas and installation quotations are not offered',
} as const;

export const POLICY_ROUTES = [
  { path: '/contact', key: 'contact', en: 'Contact / Support', ta: 'தொடர்பு / உதவி' },
  { path: '/refund-policy', key: 'refund', en: 'Refund & Cancellation Policy', ta: 'பணத்திருப்பல் மற்றும் ரத்துசெய்தல் கொள்கை' },
  { path: '/privacy-policy', key: 'privacy', en: 'Privacy Policy', ta: 'தனியுரிமைக் கொள்கை' },
  { path: '/terms', key: 'terms', en: 'Terms of Use', ta: 'பயன்பாட்டு விதிமுறைகள்' },
] as const;
export type PolicyKey = typeof POLICY_ROUTES[number]['key'];
export type PolicySection = { heading: string; paragraphs: string[] };
const b = BUSINESS_DETAILS;
export const POLICY_CONTENT: Record<PolicyKey, PolicySection[]> = {
  contact: [
    { heading: 'How to ask for help', paragraphs: [
      'For a recharge, payment, cancellation or privacy question, use the support details below.',
      'Share the order reference, operator, amount, date and a short description. Mask unrelated personal or banking details in screenshots. Never share your OTP, UPI PIN, password, full card number or CVV.',
      'If your account was debited but the recharge is not confirmed, keep the transaction reference and ask support to check its status. Avoid paying again while the first payment is unresolved.',
    ] },
    { heading: 'Complaints and escalation', paragraphs: [
      `If support has not resolved your issue, contact ${b.grievanceOfficer} at ${b.grievanceEmail}. Postal contact: ${b.grievanceAddress}. Include your earlier support reference.`,
      `Acknowledgement: ${b.acknowledgement}. Resolution: ${b.resolution}. These are SMP Enterprises grievance commitments; Razorpay handles complaints submitted directly to it under its own policy. Your statutory complaint and consumer-forum rights are unaffected.`,
    ] },
  ],
  refund: [
    { heading: 'Before you confirm a recharge', paragraphs: [
      'Check the operator, subscriber ID, selected pack, validity and final amount before paying. A payment confirmation and an operator recharge confirmation are separate events. A pending payment is not proof that a recharge has succeeded.',
      `Any fees, taxes or non-refundable components must be shown before confirmation: ${b.feesAndTaxes}.`,
    ] },
    { heading: 'Cancellation requests', paragraphs: [
      'You may ask support to cancel a request. Whether it can be stopped depends on whether it has already been submitted to or accepted by the operator. We cannot promise cancellation after submission.',
      'A recharge already credited to the intended subscriber account may not be reversible. If you entered the wrong ID, contact support promptly so available options can be checked. This policy does not exclude refunds or remedies required by law, including remedies for a service error.',
    ] },
    { heading: 'Failed, duplicate or pending payments', paragraphs: [
      'Contact support if money was debited but the recharge failed, a payment was duplicated, or the outcome is unclear. Provide the order and payment references. The transaction must be checked with the payment provider and operator before its final status is confirmed.',
      'A duplicate payment is reviewed separately from the first payment. Do not assume that an unclear or pending transaction has failed, and do not keep retrying payment while it is being checked.',
      `Pending-status review: ${b.reconciliation}. Refund eligibility review: ${b.refundReview}.`,
    ] },
    { heading: 'Approved refunds', paragraphs: [
      'Where a refund is due, support will confirm the amount and reference. Refunds should return through the original payment method where supported. If that method is unavailable, support must explain the documented alternative; do not send a further payment or share a UPI PIN to receive a refund.',
      `Refund initiation after approval: ${b.refundProcessing}. Expected credit after initiation: ${b.bankCredit}. Bank and provider processing can affect when a credit appears. Any applicable statutory requirement takes priority over this draft policy.`,
    ] },
  ],
  privacy: [
    { heading: 'Who handles your information', paragraphs: [
      `The business operating DTH Tamizhan is ${b.legalName}, located at ${b.address}. Privacy questions and requests can be sent to ${b.email}; unresolved concerns can be escalated to ${b.grievanceEmail}.`,
    ] },
    { heading: 'Information used by the service', paragraphs: [
      'Account information can include your Google/Firebase user ID, name, email, profile image and any phone number you provide. Saved-box and recharge details can include your DTH operator, subscriber ID, box nickname, selected pack, amount, transaction references and status. Support correspondence may contain information you choose to send.',
      'The app uses browser storage for items such as profile/session-related display data, language, selected operator and saved-box information. Clearing browser storage removes local copies; it does not automatically delete server records or sign you out of every service.',
      'Network requests can disclose IP address, browser/device information and technical logs to hosting and service providers. The site uses Google/Firebase for authentication and Google-hosted fonts. Provider details and processing locations are described below.',
      'This checkout does not collect card numbers, CVVs or UPI PINs. Razorpay handles payment credentials through its hosted checkout under its own privacy notice.',
    ] },
    { heading: 'Purpose, sharing and retention', paragraphs: [
      'Information is used to provide sign-in, manage saved boxes, handle recharge requests, investigate payment status, respond to support requests, prevent misuse and keep records required by law. Operators and payment providers need the information required for a requested transaction. Hosting/authentication providers process information for their relevant service.',
      `Processor list and processing locations: ${b.processors}. Any additional analytics, marketing, advertising or data-sharing use must be disclosed before it is enabled.`,
      `Retention: ${b.retention}.`,
    ] },
    { heading: 'Your choices and requests', paragraphs: [
      'Contact support to ask about access, correction, deletion, consent withdrawal or a privacy complaint, as applicable under Indian law. Some verification may be needed to protect your account. We will explain if a legal retention requirement limits a deletion request. Do not send passwords or payment credentials as identity proof.',
      'Using optional features is your choice. This draft does not establish a separate marketing consent. Privacy information should be updated when the actual service or providers change; the effective date must be shown.',
    ] },
  ],
  terms: [
    { heading: 'Business and scope', paragraphs: [
      `DTH Tamizhan is operated by ${b.legalName}. Registered address: ${b.address}. GST information: ${b.gstin}. These draft terms cover use of the website and DTH recharge/support requests in India. ${b.installation}.`,
      'Operator names and logos identify the relevant services. Their appearance does not by itself establish an authorized partnership, endorsement or affiliation.',
    ] },
    { heading: 'Your request and the final amount', paragraphs: [
      'Use accurate subscriber and contact details and review the selected operator, pack, validity and final payable amount. Do not use another person’s account or make a recharge without their authority. Keep your sign-in credentials private and do not use the site for fraud or interference.',
      `Prices are shown as Rs. Applicable charges, tax treatment and invoice details: ${b.feesAndTaxes}. A catalog listing is not a guarantee of operator acceptance or a promise that an incorrect listing will be supplied. Errors must be explained and resolved without removing your statutory rights.`,
    ] },
    { heading: 'Payment and recharge status', paragraphs: [
      'A request is not a completed recharge merely because you clicked a button, saw a redirect or were debited. Payment needs provider confirmation, and the recharge needs operator confirmation. Operator or payment-provider processing can delay the outcome; activation is not guaranteed to be instant.',
      'A clearly marked test/sandbox session simulates an outcome only. It does not take a real payment, dispatch a recharge or establish that an operator account was credited. Live payment is currently unavailable until a real payment provider is configured.',
    ] },
    { heading: 'Refunds, privacy and service issues', paragraphs: [
      'Read the Refund & Cancellation Policy for failed, duplicate and pending transactions and cancellation requests. Read the Privacy Policy for information handling and contact support if you have questions before using the service.',
      'Service availability, channel line-ups and operator policies can change. If a service cannot be supplied or an error occurs, support must explain the available remedy. These terms do not exclude rights or liability that cannot lawfully be excluded.',
    ] },
    { heading: 'Complaints and applicable law', paragraphs: [
      `Support: ${b.email}; escalation: ${b.grievanceOfficer}, ${b.grievanceEmail}. We encourage you to include the order reference and explain the remedy requested.`,
      'Applicable Indian law governs these terms. Your right to approach a competent consumer forum, regulator or court is preserved; these terms do not force an exclusive dispute forum. Material changes should be made available with an updated effective date and should not retrospectively remove rights for an existing transaction.',
    ] },
  ],
};

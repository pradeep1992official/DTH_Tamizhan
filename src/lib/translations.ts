import { Language } from '../types';

export const translations = {
  en: {
    brandTitle: 'DTH Tamizhan',
    brandTagline: "Tamil Nadu's #1 Instant DTH Recharge & Service Portal",
    navRecharge: 'Quick Recharge',
    navPlans: 'Browse Packs',
    navConnections: 'My Set-Top Boxes',
    navRefresh: 'Signal Refresh',
    navNewDish: 'New Dish Connection',
    navWorker: 'Dealer / Worker Queue',
    navHelp: 'Customer Care',
    
    // Auth
    loginTitle: 'Sign In to DTH Tamizhan',
    loginSubtitle: 'Choose your preferred method to access saved set-top boxes & instant recharge receipts',
    phoneOption: 'Phone Number OTP',
    phonePlaceholder: 'Enter 10-digit mobile number',
    sendOtp: 'Send 6-Digit OTP',
    enterOtp: 'Enter Verification Code',
    verifyOtp: 'Verify & Sign In',
    resendOtp: 'Resend Code',
    googleOption: 'Sign in with Google',
    orDivider: 'OR EQUAL AUTH METHOD',
    linkedNotice: 'Phone and Google logins are automatically linked to a unified account.',
    signOut: 'Sign Out',
    loggedInAs: 'Logged in as',
    workerMode: 'Worker / Dealer Mode',
    customerMode: 'Customer Mode',

    // Operator selection
    selectOperator: '1. Select DTH Operator',
    popularInTamilNadu: 'Supported DTH Operators',
    
    // Smart card input
    enterCardNumber: '2. Enter Smart Card / Customer ID',
    checkBalance: 'Check Balance & Status',
    verifying: 'Checking account with operator...',
    subscriberFound: 'Subscriber Found',
    validityExpires: 'Validity Expires',
    activePack: 'Active Pack',
    expiredAlert: 'Recharge Due! Channels currently stopped.',
    activeAlert: 'Active Subscription',

    // Plans
    selectPlan: '3. Select Recharge Pack or Amount',
    customAmount: 'Custom Amount',
    enterAmount: 'Enter Amount (₹)',
    channels: 'Channels',
    hdChannels: 'HD Channels',
    validity: 'Validity',
    days: 'Days',
    viewChannels: 'View Channels',
    selectThisPack: 'Select Pack',
    popularBadge: 'Popular',
    saveBadge: 'Best Value',

    // Payment
    proceedToPay: 'Proceed to Secure Recharge',
    paymentTitle: 'Complete DTH Recharge',
    totalPayable: 'Total Payable',
    secureEncryption: '256-Bit Encrypted Secure Transaction',
    payViaUpi: 'UPI / QR Code',
    payViaCard: 'Debit / Credit Card',
    payViaNetbanking: 'Net Banking',
    scanToPay: 'Scan QR with any UPI App (GPay, PhonePe, Paytm)',
    payNow: 'Pay & Recharge Now',
    processingPayment: 'Processing secure recharge...',
    rechargeSuccess: 'Recharge Successful!',

    // Refresh
    signalRefreshTitle: 'DTH Signal Refresh & Channel Recovery',
    signalRefreshDesc: 'Recharged but channels not showing? Send a signal refresh command directly to your set-top box to unblock channels.',
    triggerRefresh: 'Send Signal Refresh',
    refreshing: 'Sending signal refresh command...',
    turnOnChannel100: 'Keep your TV & Set-Top Box turned ON on Channel 100 for 5 minutes',

    // Connections
    myConnectionsTitle: 'Saved Set-Top Boxes',
    addConnection: 'Add New Box',
    rechargeAgain: 'Quick Recharge',
    noConnections: 'No saved set-top boxes yet. Add your home or office DTH box for one-click recharges.',

    // Worker queue
    workerQueueTitle: 'DTH Dealer / Worker Processing Queue',
    workerQueueDesc: 'Real-time feed of pending customer recharge orders requiring operator verification or signal commands.',
    pendingOrders: 'Pending Orders',
    markCompleted: 'Mark Fulfilled',
    operatorRefPlaceholder: 'Enter Operator Ref ID / Journal No.',
    workerNotesPlaceholder: 'Dealer notes (optional)',

    // Footer
    footerDisclaimer: 'Authorized DTH Service Partner. All trademarks (Sun Direct, Tata Play, Airtel DTH, Dish TV, D2H) belong to their respective brand owners.',
    tollFreeSupport: '24x7 DTH Helpline',
  },
  ta: {
    brandTitle: 'டிடிஎச் தமிழன்',
    brandTagline: 'அனைத்து முன்னணி டிடிஎச் உடனடி ரீசார்ஜ் போர்டல்',
    navRecharge: 'உடனடி ரீசார்ஜ்',
    navPlans: 'பேக்குகளை காண்க',
    navConnections: 'என் செட்-டாப் பாக்ஸ்கள்',
    navRefresh: 'சிக்னல் புதுப்பிப்பு',
    navNewDish: 'புதிய டிஷ் இணைப்பு',
    navWorker: 'டீலர் / பணியாளர் பிரிவு',
    navHelp: 'வாடிக்கையாளர் உதவி',

    // Auth
    loginTitle: 'டிடிஎச் தமிழனில் உள்நுழைக',
    loginSubtitle: 'உங்கள் சேமிக்கப்பட்ட செட்-டாப் பாக்ஸ்கள் மற்றும் ரசீதுகளைப் பெற உள்நுழையவும்',
    phoneOption: 'மொபைல் எண் ஓடிபி',
    phonePlaceholder: '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
    sendOtp: '6 இலக்க OTP பெறுக',
    enterOtp: 'சரிபார்ப்பு குறியீட்டை உள்ளிடவும்',
    verifyOtp: 'சரிபார்த்து உள்நுழைக',
    resendOtp: 'மீண்டும் OTP அனுப்பு',
    googleOption: 'கூகிள் மூலம் உள்நுழைக',
    orDivider: 'அல்லது சமமான உள்நுழைவு முறை',
    linkedNotice: 'மொபைல் மற்றும் கூகிள் உள்நுழைவு தானாகவே ஒரே கணக்கில் இணைக்கப்படும்.',
    signOut: 'வெளியேறு',
    loggedInAs: 'உள்நுழைந்துள்ள கணக்கு',
    workerMode: 'டீலர் முறை',
    customerMode: 'வாடிக்கையாளர் முறை',

    // Operator selection
    selectOperator: '1. டிடிஎச் ஆபரேட்டரைத் தேர்ந்தெடுக்கவும்',
    popularInTamilNadu: 'அனைத்து டிடிஎச் ஆபரேட்டர்கள்',

    // Smart card input
    enterCardNumber: '2. ஸ்மார்ட் கார்டு / வாடிக்கையாளர் எண்',
    checkBalance: 'இருப்பு & நிலையைச் சரிபார்க்கவும்',
    verifying: 'ஆபரேட்டருடன் சரிபார்க்கப்படுகிறது...',
    subscriberFound: 'வாடிக்கையாளர் விபரம் கிடைத்தது',
    validityExpires: 'காலாவதி தேதி',
    activePack: 'தற்போதைய பேக்',
    expiredAlert: 'ரீசார்ஜ் காலம் முடிந்தது! சேனல்கள் நிறுத்தப்பட்டுள்ளன.',
    activeAlert: 'செயலில் உள்ள இணைப்பு',

    // Plans
    selectPlan: '3. ரீசார்ஜ் பேக் அல்லது தொகையைத் தேர்ந்தெடுக்கவும்',
    customAmount: 'விருப்பத் தொகை',
    enterAmount: 'தொகையை உள்ளிடவும் (₹)',
    channels: 'சேனல்கள்',
    hdChannels: 'எச்டி சேனல்கள்',
    validity: 'செல்லுபடியாகும் காலம்',
    days: 'நாட்கள்',
    viewChannels: 'சேனல்களைக் காண்க',
    selectThisPack: 'இந்த பேக்கைத் தேர்ந்தெடு',
    popularBadge: 'பிரபலமானது',
    saveBadge: 'அதிக சேமிப்பு',

    // Payment
    proceedToPay: 'பாதுகாப்பான ரீசார்ஜ் தொடர்க',
    paymentTitle: 'ரீசார்ஜ் கட்டணம் செலுத்துதல்',
    totalPayable: 'செலுத்த வேண்டிய தொகை',
    secureEncryption: '256-பிட் குறியாக்கப்பட்ட பாதுகாப்பான பரிவர்த்தனை',
    payViaUpi: 'UPI / QR குறியீடு',
    payViaCard: 'டெபிட் / கிரெடிட் கார்டு',
    payViaNetbanking: 'நெட் பேங்கிங்',
    scanToPay: 'எந்தவொரு UPI செயலியிலும் QR-ஐ ஸ்கேன் செய்யவும் (GPay, PhonePe, Paytm)',
    payNow: 'இப்போதே ரீசார்ஜ் செய்',
    processingPayment: 'பாதுகாப்பான ரீசார்ஜ் செயலாக்கப்படுகிறது...',
    rechargeSuccess: 'ரீசார்ஜ் வெற்றிகரமாக முடிந்தது!',

    // Refresh
    signalRefreshTitle: 'டிடிஎச் சிக்னல் புதுப்பிப்பு மற்றும் சேனல் சரிசெய்தல்',
    signalRefreshDesc: 'ரீசார்ஜ் செய்தும் டிவி தெரியவில்லையா? சேனல்களை இயக்க உங்கள் செட்-டாப் பாக்ஸிற்கு சிக்னல் புதுப்பிப்பு கோரிக்கையை அனுப்பவும்.',
    triggerRefresh: 'சிக்னல் புதுப்பிக்கவும்',
    refreshing: 'சிக்னல் புதுப்பிப்பு அனுப்பப்படுகிறது...',
    turnOnChannel100: 'உங்கள் செட்-டாப் பாக்ஸை சேனல் 100-ல் 5 நிமிடங்கள் இயக்கி வைக்கவும்',

    // Connections
    myConnectionsTitle: 'சேமிக்கப்பட்ட செட்-டாப் பாக்ஸ்கள்',
    addConnection: 'புதிய பாக்ஸ் சேர்க்கவும்',
    rechargeAgain: 'விரைவு ரீசார்ஜ்',
    noConnections: 'சேமிக்கப்பட்ட பாக்ஸ்கள் இல்லை. ஒரு கிளிக்கில் ரீசார்ஜ் செய்ய உங்கள் டிடிஎச் எண்ணைச் சேர்க்கவும்.',

    // Worker queue
    workerQueueTitle: 'டிடிஎச் டீலர் ஆர்டர் பட்டியல்',
    workerQueueDesc: 'வாடிக்கையாளர்களின் புதிய ரீசார்ஜ் கோரிக்கைகளை நேரடியாக ஆபரேட்டருடன் இணைத்து நிறைவேற்றும் பகுதி.',
    pendingOrders: 'நிலுவையில் உள்ள ஆர்டர்கள்',
    markCompleted: 'நிறைவேற்றப்பட்டது என மாற்றுக',
    operatorRefPlaceholder: 'ஆபரேட்டர் ரெஃபரன்ஸ் எண் உள்ளிடவும்',
    workerNotesPlaceholder: 'டீலர் குறிப்புகள் (தேவையெனில்)',

    // Footer
    footerDisclaimer: 'அங்கீகரிக்கப்பட்ட டிடிஎச் சேவை மையம். அனைத்து வணிக முத்திரைகளும் அந்தந்த நிறுவனங்களுக்கு உரியவை.',
    tollFreeSupport: '24x7 வாடிக்கையாளர் உதவி எண்',
  }
};

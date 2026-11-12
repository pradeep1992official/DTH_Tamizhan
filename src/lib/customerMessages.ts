// Customer copy. All Tamil values below are drafts requiring native-speaker review.
const pairs = {
  uiCatalogOperator: ['Operator', 'ஆபரேட்டர்'], // Native Tamil review required.
  uiCatalogPack: ['Pack', 'பேக்'], // Native Tamil review required.
  uiCatalogDuration: ['Duration', 'காலம்'], // Native Tamil review required.
  uiCatalogTotal: ['Total', 'மொத்தம்'], // Native Tamil review required.
  uiCatalogAction: ['Action', 'செயல்'], // Native Tamil review required.
  uiNetworkError: ['We could not load the details. Check your connection, then try again.', 'விவரங்களை ஏற்ற முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'], // Native Tamil review required.
  uiTaskLanguage: ['Language for this recharge', 'ரீசார்ஜ் செய்யும் மொழி'], // Native Tamil review required.
  uiOperatorChanged: ['Operator selected: {operator}. Check the ID below before continuing.', '{operator} தேர்ந்தெடுக்கப்பட்டது. கீழே உள்ள எண்ணைச் சரிபார்த்து தொடருங்கள்.'], // Native Tamil review required.
  uiBoxIllustration: ['A remote and set-top box for DTH connections', 'DTH இணைப்புக்கான ரிமோட்டும் செட்-டாப் பாக்ஸும்'], // Native Tamil review required.
  uiFindYourId: ['Where is my connection ID?', 'என் இணைப்பு எண்ணை எங்கே பார்ப்பது?'], // Native Tamil review required.
  uiIdGuide: ['Look for the smart card or connection label on your box, or check your operator account. The label and location vary by operator. Match the number to the operator you selected.', 'உங்கள் செட்-டாப் பாக்ஸில் உள்ள ஸ்மார்ட் கார்டு அல்லது இணைப்பு விவரச் சீட்டைப் பாருங்கள். ஆபரேட்டரின் கணக்கிலும் எண்ணைக் காணலாம். ஒவ்வொரு ஆபரேட்டருக்கும் இடமும் பெயரும் மாறலாம். நீங்கள் தேர்ந்தெடுத்த ஆபரேட்டருக்கான எண்ணை உள்ளிடுங்கள்.'], // Native Tamil review required.
  uiIdPhotoSlot: ['[FILL IN] Add a real annotated photo showing the ID label. Illustration only; not an operator-specific guide.', '[FILL IN] எண் இருக்கும் இடத்தைக் குறித்துக் காட்டும் உண்மையான படத்தைச் சேர்க்கவும். இது விளக்கப் படம் மட்டுமே; குறிப்பிட்ட ஆபரேட்டருக்கான வழிகாட்டி அல்ல.'], // Native Tamil review required.
  uiBusinessSupport: ['Who to contact', 'உதவிக்கு யாரைத் தொடர்புகொள்வது'], // Native Tamil review required.
  uiSupportDraft: ['Contact details marked [FILL IN] are awaiting confirmation and are not working support channels.', '[FILL IN] எனக் குறித்துள்ள தொடர்பு விவரங்கள் இன்னும் உறுதிப்படுத்தப்படவில்லை. அவை தற்போது பயன்படுத்தக்கூடிய உதவி எண்கள் அல்ல.'], // Native Tamil review required.
  uiPaymentFacts: ['Checkout shows the provider, order reference and total. After payment, check the recharge status before paying again.', 'கட்டணப் பக்கத்தில் சேவை நிறுவனம், ஆர்டர் எண், மொத்தத் தொகை ஆகியவற்றைப் பார்க்கலாம். பணம் செலுத்திய பிறகு மீண்டும் செலுத்துவதற்கு முன் ரீசார்ஜ் நிலையைச் சரிபாருங்கள்.'], // Native Tamil review required.
  uiPackView: ["Pack view", "பேக்குகளைக் காணும் முறை"], // Native Tamil review required.
  uiAll: ["All", "அனைத்தும்"], // Native Tamil review required.
  uiSelectHDDuration: ["Select HD duration", "HD பேக்கின் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required.
  uiSelectSDDuration: ["Select SD duration", "SD பேக்கின் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required.
  uiQuickAmountChoices: ["Quick amount choices", "தொகையைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required.
  uiPackFilters: ["Pack filters", "பேக் வடிகட்டல்கள்"], // Native Tamil review required.
  uiPictureQuality: ["Picture quality", "படத் தரம்"], // Native Tamil review required.
  uiChooseAnAvailableDuration: ["Choose an available duration", "கிடைக்கும் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required.
  uiHDPackUnavailable: ["HD pack unavailable", "HD பேக் தற்போது கிடைக்கவில்லை"], // Native Tamil review required.
  uiSDPackUnavailable: ["SD pack unavailable", "SD பேக் தற்போது கிடைக்கவில்லை"], // Native Tamil review required.
  uiNoCatalogPackIsAvailableForThisOperatorChooseACustomTopUpInstead: ["No catalog pack is available for this operator. Choose a custom top-up instead.", "இந்த ஆபரேட்டருக்கான பேக்குகள் இங்கு இல்லை. உங்கள் விருப்பத் தொகையில் ரீசார்ஜ் செய்யலாம்."], // Native Tamil review required.
  uiClearFilters: ["Clear filters", "வடிகட்டல்களை நீக்கவும்"], // Native Tamil review required.
  uiHighDefinitionPacks: ["High Definition packs", "உயர் படத் தர பேக்குகள்"], // Native Tamil review required.
  uiStandardDefinitionPacks: ["Standard Definition packs", "சாதாரண படத் தர பேக்குகள்"], // Native Tamil review required.
  uiSaveThisConnectionForFasterRecharges: ["Save this connection for faster recharges", "அடுத்த முறை ரீசார்ஜ் செய்ய இந்த இணைப்பைச் சேமிக்கவும்"], // Native Tamil review required.
  uiRemoveFromCompare: ["Remove from compare", "ஒப்பீட்டிலிருந்து நீக்கவும்"], // Native Tamil review required.
  uiRemoveFromComparison: ["Remove from comparison", "ஒப்பீட்டிலிருந்து நீக்கவும்"], // Native Tamil review required.
  uiPleaseSelectACompatibleSetTopBox: ["Please select a compatible Set-Top Box.", "இந்த ஆபரேட்டருக்கான செட்-டாப் பாக்ஸைத் தேர்ந்தெடுக்கவும்."], // Native Tamil review required.
  uiSelectSavedBox: ["Select Saved Box:", "சேமித்த பெட்டியைத் தேர்ந்தெடுக்கவும்:"], // Native Tamil review required.
  uiMockQRIllustrationCannotBeScannedOrPaid: ["UPI test session. No scannable QR or real payment is available.", "இது UPI சோதனை அமர்வு மட்டுமே. ஸ்கேன் செய்யக்கூடிய QR அல்லது உண்மையான கட்டணம் இங்கு இல்லை."], // Native Tamil review required.
  uiProviderQRIsUnavailableRetryCheckoutToRequestAProviderOrder: ["Provider QR is unavailable. Retry checkout to request a provider order.", "கட்டணச் சேவையின் QR தற்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiMockCardPaymentNoCardNumberExpiryOrCVVIsRequiredUseTheTestControlsBelo: ["Mock card payment. No card number, expiry or CVV is required. Use the test controls below.", "இது சோதனைக் கார்டு கட்டணம் மட்டுமே. கார்டு எண், காலாவதி தேதி அல்லது CVV தேவையில்லை. கீழே உள்ள சோதனை வசதிகளைப் பயன்படுத்தவும்."], // Native Tamil review required.
  uiCardPaymentsRequireTheProviderHostedCheckoutProviderUnavailableNoCardD: ["Card payments require the provider hosted checkout. Provider unavailable; no card details are collected.", "கார்டு கட்டணம் கட்டணச் சேவையின் பக்கத்தில் மட்டுமே நடைபெறும். அந்தச் சேவை தற்போது கிடைக்கவில்லை; கார்டு விவரங்கள் எதுவும் பெறப்படாது."], // Native Tamil review required.
  uiMockNetBankingNoBankLoginIsRequired: ["Mock net banking. No bank login is required.", "இது இணைய வங்கிச் சோதனை மட்டுமே. வங்கிக் கணக்கில் உள்நுழையத் தேவையில்லை."], // Native Tamil review required.
  uiNetBankingRequiresTheProviderHostedCheckoutProviderUnavailable: ["Net banking requires the provider hosted checkout. Provider unavailable.", "இணைய வங்கிக் கட்டணத்திற்கான சேவைப் பக்கம் தற்போது கிடைக்கவில்லை."], // Native Tamil review required.
  uiCheckoutIsUnavailablePleaseRetry: ["Checkout is unavailable. Please retry.", "கட்டணப் பக்கம் தற்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiRequestTimedOutRetryToCheckTheSameTestSessionDoNotStartAnotherPayment: ["Request timed out. Retry to check the same test session; do not start another payment.", "கோரிக்கைக்கான நேரம் முடிந்துவிட்டது. இதே சோதனை அமர்வைச் சரிபார்க்க மீண்டும் முயற்சிக்கவும்; புதிய கட்டணம் தொடங்க வேண்டாம்."], // Native Tamil review required.
  uiProviderOrderOrQRIsUnavailableNoPaymentHasBeenTaken: ["Provider order or QR is unavailable. No payment has been taken.", "கட்டண ஆர்டர் அல்லது QR கிடைக்கவில்லை. பணம் எதுவும் பெறப்படவில்லை."], // Native Tamil review required.
  uiCheckoutUnavailablePleaseRetry: ["Checkout unavailable. Please retry.", "கட்டணப் பக்கம் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiCouldNotCheckTheTestPayment: ["Could not check the test payment.", "சோதனைக் கட்டணத்தின் நிலையைச் சரிபார்க்க முடியவில்லை."], // Native Tamil review required.
  uiCompleteDTHRecharge: ["Complete DTH Recharge", "டிடிஎச் ரீசார்ஜைத் தொடரவும்"], // Native Tamil review required.
  uiCloseCheckout: ["Close checkout", "கட்டணப் பக்கத்தை மூடவும்"], // Native Tamil review required.
  uiTestModeNoRealPaymentWillBeTaken: ["Test mode - no real payment will be taken", "சோதனை முறை — உண்மையான பணம் எதுவும் பெறப்படாது"], // Native Tamil review required.
  uiAwaitingServerQuote: ["Awaiting server quote", "சேவையகத்தின் கட்டண விவரங்களுக்காகக் காத்திருக்கிறது"], // Native Tamil review required.
  uiTotalPayable: ["Total payable", "செலுத்த வேண்டிய மொத்தத் தொகை"], // Native Tamil review required.
  uiPaymentProvider: ["Payment provider", "கட்டணச் சேவை"], // Native Tamil review required.
  uiOrderReference: ["Order reference", "ஆர்டர் எண்"], // Native Tamil review required.
  uiNoRealPaymentProviderConfigured: ["No real payment provider configured", "உண்மையான கட்டணச் சேவை இன்னும் அமைக்கப்படவில்லை"], // Native Tamil review required.
  uiNotCreated: ["Not created", "இன்னும் உருவாக்கப்படவில்லை"], // Native Tamil review required.
  uiCheckingCheckout: ["Checking checkout...", "கட்டண விவரங்கள் சரிபார்க்கப்படுகின்றன…"], // Native Tamil review required.
  uiRetryCheckout: ["Retry checkout", "மீண்டும் முயற்சிக்கவும்"], // Native Tamil review required.
  uiPaymentMethod: ["Payment method", "கட்டணம் செலுத்தும் முறை"], // Native Tamil review required.
  uiDebitCreditCard: ["Debit / Credit Card", "டெபிட் / கிரெடிட் கார்டு"], // Native Tamil review required.
  uiNetBanking: ["Net banking", "இணைய வங்கி"], // Native Tamil review required.
  uiSessionExpiredGenerateANewQR: ["Session expired, generate a new QR.", "இந்த அமர்வின் நேரம் முடிந்துவிட்டது. புதிய QR உருவாக்கவும்."], // Native Tamil review required.
  uiGenerateANewMockQR: ["Generate a new mock QR", "புதிய சோதனை QR உருவாக்கவும்"], // Native Tamil review required.
  uiGenerateANewQR: ["Generate a new QR", "புதிய QR உருவாக்கவும்"], // Native Tamil review required.
  uiTestSession: ["Test session", "சோதனை அமர்வு"], // Native Tamil review required.
  uiTestResult: ["Test result", "சோதனை முடிவு"], // Native Tamil review required.
  uiSuccess: ["Success", "வெற்றி"], // Native Tamil review required.
  uiFailure: ["Failure", "தோல்வி"], // Native Tamil review required.
  uiPending: ["Pending", "நிலுவையில் உள்ளது"], // Native Tamil review required.
  uiSimulateTestPayment: ["Simulate test payment", "சோதனைக் கட்டணத்தை இயக்கவும்"], // Native Tamil review required.
  uiTestPaymentSucceededNoRealPaymentOrRechargeWasMade: ["Test payment succeeded. No real payment or recharge was made.", "சோதனைக் கட்டணம் வெற்றியடைந்தது. உண்மையான கட்டணமோ ரீசார்ஜோ நடைபெறவில்லை."], // Native Tamil review required.
  uiTestPaymentFailedNoMoneyWasTaken: ["Test payment failed. No money was taken.", "சோதனைக் கட்டணம் தோல்வியடைந்தது. பணம் எதுவும் பெறப்படவில்லை."], // Native Tamil review required.
  uiTestPaymentPendingThisIsNotASuccessConfirmationNoRechargeHasStarted: ["Test payment pending. This is not a success confirmation; no recharge has started.", "சோதனைக் கட்டணம் நிலுவையில் உள்ளது. இது வெற்றி உறுதிப்படுத்தல் அல்ல; ரீசார்ஜ் தொடங்கப்படவில்லை."], // Native Tamil review required.
  uiStartANewTestSession: ["Start a new test session", "புதிய சோதனை அமர்வைத் தொடங்கவும்"], // Native Tamil review required.
  uiRemoveConnection: ["Remove Connection", "இணைப்பை நீக்கவும்"], // Native Tamil review required.
  uiBalance: ["Balance", "இருப்பு"], // Native Tamil review required.
  uiExpiry: ["Expiry", "முடிவுத் தேதி"], // Native Tamil review required.
  uiNotAvailable: ["Not available", "விவரம் கிடைக்கவில்லை"], // Native Tamil review required.
  uiExpired: ["Expired", "காலாவதியானது"], // Native Tamil review required.
  uiActive: ["Active", "செயலில் உள்ளது"], // Native Tamil review required.
  uiCurrentPack: ["Current pack", "தற்போதைய பேக்"], // Native Tamil review required.
  uiEdit: ["Edit", "திருத்தவும்"], // Native Tamil review required.
  uiManageYourSavedSetTopBoxesAndRechargeThemQuickly: ["Manage your saved Set-Top Boxes and recharge them quickly.", "சேமித்த செட்-டாப் பாக்ஸ்களை நிர்வகித்து ரீசார்ஜ் செய்யுங்கள்."], // Native Tamil review required.
  uiNoSavedSetTopBoxes: ["No Saved Set-Top Boxes", "செட்-டாப் பாக்ஸ்கள் இன்னும் சேமிக்கப்படவில்லை"], // Native Tamil review required.
  uiDTHTamizhanHome: ["DTH Tamizhan home", "டிடிஎச் தமிழன் முகப்பு"], // Native Tamil review required.
  uiMainNavigation: ["Main navigation", "முதன்மை வழிசெலுத்தல்"], // Native Tamil review required.
  uiEnglish: ["English", "English"], // Native Tamil review required.
  uiDTHAccountVerified: ["DTH account", "டிடிஎச் கணக்கு"], // Native Tamil review required.
  uiNameMustBeAtLeast2Characters: ["Name must be at least 2 characters.", "பெயரில் குறைந்தது இரண்டு எழுத்துகள் இருக்க வேண்டும்."], // Native Tamil review required.
  uiUnableToSaveProfilePleaseTryAgain: ["Unable to save profile. Please try again.", "கணக்கு விவரங்களைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiUnableToVerifyAdminAccess: ["Unable to verify admin access.", "நிர்வாக அணுகலைச் சரிபார்க்க முடியவில்லை."], // Native Tamil review required.
  uiRetryAccessCheck: ["Retry access check", "அணுகலை மீண்டும் சரிபார்க்கவும்"], // Native Tamil review required.
  uiSaving: ["Saving…", "சேமிக்கப்படுகிறது…"], // Native Tamil review required.
  uiRecordedStatus: ["Recorded status", "பதிவான நிலை"], // Native Tamil review required.
  uiDTHOperator: ["DTH Operator", "டிடிஎச் ஆபரேட்டர்"], // Native Tamil review required.
  uiPaymentMode: ["Payment Mode", "கட்டணம் செலுத்திய முறை"], // Native Tamil review required.
  uiNoChannelsAreListedForThisPack: ["No channels are listed for this pack.", "இந்தப் பேக்கின் சேனல் விவரங்கள் வழங்கப்படவில்லை."], // Native Tamil review required.
  uiCloseComparison: ["Close comparison", "ஒப்பீட்டை மூடவும்"], // Native Tamil review required.
  uiCompareSelectedPacks: ["Compare selected packs", "தேர்ந்தெடுத்த பேக்குகளை ஒப்பிடவும்"], // Native Tamil review required.
  uiClearComparison: ["Clear comparison", "ஒப்பீட்டை நீக்கவும்"], // Native Tamil review required.
  uiChannelDetailsNeedReview: ["Channel details need review", "சேனல் விவரங்களைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required.
  uiChannelDetailsNotProvided: ["Channel details not provided", "சேனல் விவரங்கள் வழங்கப்படவில்லை"], // Native Tamil review required.
  uiPriceNeedsReview: ["Price needs review", "விலையைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required.
  uiMonthlyPriceNeedsReview: ["Monthly price needs review", "மாதக் கட்டணத்தைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required.
  uiDurationNeedsReview: ["Duration needs review", "பேக்கின் காலத்தைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required.
  uiEnterYourName: ["Enter your name", "உங்கள் பெயரை உள்ளிடவும்"], // Native Tamil review required.
  uiEnterABoxNickname: ["Enter a box nickname", "பெட்டிக்கு ஒரு பெயர் உள்ளிடவும்"], // Native Tamil review required.
  uiUnableToSubmitTheInstallationRequest: ["Unable to submit the installation request.", "நிறுவல் கோரிக்கையை அனுப்ப முடியவில்லை."], // Native Tamil review required.
  uiUnableToSubmitTheRequestPleaseTryAgain: ["Unable to submit the request. Please try again.", "கோரிக்கையை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiQuotationRequired: ["Quotation required", "கட்டண மதிப்பீட்டைக் கேட்கவும்"], // Native Tamil review required.
  uiSubmittingRequest: ["Submitting request…", "கோரிக்கை அனுப்பப்படுகிறது…"], // Native Tamil review required.
  uiSubmitInstallationRequest: ["Submit installation request", "நிறுவல் கோரிக்கையை அனுப்பவும்"], // Native Tamil review required.
  uiYourInstallationRequestHasBeenReceivedOurTeamWillContactYouToConfirmTh: ["Your installation request has been received. Our team will contact you to confirm the details.", "உங்கள் நிறுவல் கோரிக்கை பெறப்பட்டது. விவரங்களை உறுதிசெய்ய எங்கள் குழு உங்களைத் தொடர்புகொள்ளும்."], // Native Tamil review required.
  uiAuthenticationIsCurrentlyNotAvailablePleaseTryAgainLater: ["Authentication is currently not available. Please try again later.", "இப்போது உள்நுழைய முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiGoogleSignInWasNotCompletedPleaseTryAgain: ["Google Sign-In was not completed. Please try again.", "Google உள்நுழைவு நிறைவடையவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiSomethingWentWrongPleaseTryAgain: ["Something went wrong. Please try again.", "ஏதோ சிக்கல் ஏற்பட்டுள்ளது. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required.
  uiOperatorTermsApply: ["Operator terms apply", "ஆபரேட்டரின் விதிமுறைகள் பொருந்தும்"], // Native Tamil review required.
  uiCustomTopUp: ["Custom top-up", "விருப்பத் தொகை ரீசார்ஜ்"], // Native Tamil review required.
  uiLocalSandboxSimulator: ["Local sandbox simulator", "உள்ளூர் சோதனைச் சேவை"], // Native Tamil review required.
  uiSuccess2: ["success", "வெற்றி"], // Native Tamil review required.
  uiFailed: ["failed", "தோல்வி"], // Native Tamil review required.
  uiPending2: ["pending", "நிலுவையில் உள்ளது"], // Native Tamil review required.
  uiPaid: ["paid", "பணம் செலுத்தப்பட்டது"], // Native Tamil review required.
  uiInitiated: ["initiated", "தொடங்கப்பட்டது"], // Native Tamil review required.
  uiProcessing: ["processing", "செயலாக்கத்தில் உள்ளது"], // Native Tamil review required.
  uiCompleted: ["completed", "நிறைவடைந்தது"], // Native Tamil review required.
  uiReady: ["ready", "தயாராக உள்ளது"], // Native Tamil review required.
  uiGSTIN: ["GSTIN", "சரக்கு மற்றும் சேவை வரி எண் (GSTIN)"], // Native Tamil review required.
  uiNoGSTBreakdownIsAvailableForThisRecord: ["No GST breakdown is available for this record.", "இந்தப் பதிவிற்கான GST விவரங்கள் வழங்கப்படவில்லை."], // Native Tamil review required.
  uiUnavailable: ["Unavailable", "கிடைக்கவில்லை"], // Native Tamil review required.
  uiNoMatchingPacks: ["No matching packs.", "பொருந்தும் பேக்குகள் இல்லை."], // Native Tamil review required.
  uiTryAnotherSearchOrClearYourFilters: ["Try another search or clear your filters.", "வேறு சொற்களைத் தேடவும் அல்லது வடிகட்டல்களை நீக்கவும்."], // Native Tamil review required.
  uiChannelList: ["Channel list", "சேனல் பட்டியல்"], // Native Tamil review required.
  uiEnIN: ["en-IN", "ta-IN"], // Native Tamil review required.
  uiAccount: ["Account", "கணக்கு"], // Native Tamil review required.
  uiYourAccount: ["Your account", "உங்கள் கணக்கு"], // Native Tamil review required.
  uiSignInWithGoogle: ["Sign in with Google", "கூகிள் மூலம் உள்நுழைக"], // Native Tamil review required.
  uiLanguage: ["Language", "மொழி"], // Native Tamil review required.
  uiCheckingAdminAccess: ["Checking admin access…", "நிர்வாக அணுகலைச் சரிபார்க்கிறது…"], // Native Tamil review required.
  uiTheSignInWindowClosedBeforeAuthenticationCompletedTryAgainIfItKeepsHap: ["The sign-in window closed before authentication completed. Try again; if it keeps happening, check the Firebase authorized domain.", "உள்நுழைவு முடிவதற்கு முன் சாளரம் மூடப்பட்டது. மீண்டும் முயற்சிக்கவும்; தொடர்ந்தால் Firebase அங்கீகரிக்கப்பட்ட டொமைனைச் சரிபார்க்கவும்."], // Native Tamil review required.
  uiConnecting: ["Connecting...", "சரிபார்க்கப்படுகிறது..."], // Native Tamil review required.
  uiViewSavedSetTopBoxes: ["View saved set-top boxes", "சேமித்த பெட்டிகளைப் பார்க்கவும்"], // Native Tamil review required.
  uiSignInToAccessYourSavedConnections: ["Sign in to access your saved connections.", "சேமித்த இணைப்புகளை அணுக உள்நுழையுங்கள்."], // Native Tamil review required.
  uiSignIn: ["Sign in", "உள்நுழையுங்கள்"], // Native Tamil review required.
  uiPageNotFound: ["Page not found", "பக்கம் கிடைக்கவில்லை"], // Native Tamil review required.
  uiWeCouldNotLoadThisPage: ["We could not load this page", "பக்கத்தை ஏற்ற முடியவில்லை"], // Native Tamil review required.
  uiThisAddressDoesNotExistCheckTheLinkOrReturnHome: ["This address does not exist. Check the link or return home.", "இந்த முகவரி கிடைக்கவில்லை. இணைப்பைச் சரிபார்க்கவும் அல்லது முகப்புக்குச் செல்லவும்."], // Native Tamil review required.
  uiReturnHomeToTryAgainThisErrorIsNotConfirmationThatAPaymentSucceeded: ["Return home to try again. This error is not confirmation that a payment succeeded.", "மீண்டும் முயற்சிக்க முகப்புப் பக்கத்திற்குச் செல்லவும். இந்தப் பிழை கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது."], // Native Tamil review required.
  uiBackToHome: ["Back to home", "முகப்புப் பக்கத்திற்குத் திரும்பவும்"], // Native Tamil review required.
  uiSupportAndPolicies: ["Support and policies", "உதவி மற்றும் கொள்கைகள்"], // Native Tamil review required.
  uiBusinessName: ["Business name", "வணிகப் பெயர்"], // Native Tamil review required.
  uiSupportPhone: ["Support phone", "உதவி தொலைபேசி"], // Native Tamil review required.
  uiSupportEmail: ["Support email", "உதவி மின்னஞ்சல்"], // Native Tamil review required.
  uiSupportHours: ["Support hours", "உதவி நேரம்"], // Native Tamil review required.
  uiAddress: ["Address", "முகவரி"], // Native Tamil review required.
  uiGrievanceOfficer: ["Grievance officer", "குறைதீர் அதிகாரி"], // Native Tamil review required.
  uiGrievanceEmail: ["Grievance email", "குறைதீர் மின்னஞ்சல்"], // Native Tamil review required.
  uiGrievanceAddress: ["Grievance address", "குறைதீர் முகவரி"], // Native Tamil review required.
  uiPaymentTermsAndSupport: ["Payment terms and support", "கட்டண விதிமுறைகள் மற்றும் உதவி"], // Native Tamil review required.
  uiByPayingYouAgreeToTheTermsOfUseAndRefundCancellationPolicyPleaseAlsoRe: ["By paying you agree to the Terms of Use and Refund & Cancellation Policy. Please also read the Privacy Policy.", "பணம் செலுத்துவதன் மூலம் பயன்பாட்டு விதிமுறைகளையும் பணத்திருப்பல் கொள்கையையும் ஏற்கிறீர்கள். தனியுரிமைக் கொள்கையையும் படிக்கவும்."], // Native Tamil review required.
  uiChooseCustomTopUp: ["Choose custom top-up", "விருப்பத் தொகை ரீசார்ஜ்"], // Native Tamil review required.
  uiNotConfigured: ['Not configured', 'இன்னும் அமைக்கப்படவில்லை'], // Native Tamil review required.
  uiCheckingConfiguration: ['Checking configuration...', 'சேவை அமைப்புகள் சரிபார்க்கப்படுகின்றன…'], // Native Tamil review required.
  uiRemoveNamedPlan: ['Remove {name} from comparison', '{name} பேக்கை ஒப்பீட்டிலிருந்து நீக்கவும்'], // Native Tamil review required.
  uiPackCount: ['{shown} of {total} packs', 'மொத்தம் {total} பேக்குகளில் {shown}'], // Native Tamil review required.
  uiEquipment: ['Equipment to be confirmed', 'சாதன விவரங்கள் உறுதிசெய்யப்பட வேண்டும்'], // Native Tamil review required.
  uiCabling: ['Cabling to be confirmed', 'கேபிள் விவரங்கள் உறுதிசெய்யப்பட வேண்டும்'], // Native Tamil review required.
  uiAvailability: ['Availability to be confirmed', 'சேவை கிடைக்குமா என்பதை உறுதிசெய்ய வேண்டும்'], // Native Tamil review required.
  uiMobilePlaceholder: ['Enter a 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'], // Native Tamil review required.
  uiAddressPlaceholder: ['Door number, street and area', 'கதவு எண், தெரு மற்றும் பகுதி'], // Native Tamil review required.
  uiGSTPlaceholder: ['[FILL IN] GSTIN, or confirm not applicable', '[FILL IN] GSTIN எண்ணை நிரப்பவும் அல்லது பொருந்தாது என்பதை உறுதிசெய்யவும்'], // Native Tamil review required.
  uiEnterOperatorId: ['Enter your {label}', '{label} உள்ளிடவும்'], // Native Tamil review required.
  uiIdHelp: ['{label}: {lengths} digits{prefix}', '{label}: {lengths} இலக்கங்கள்{prefix}'], // Native Tamil review required.
  uiIdPrefix: ['; starts with {prefixes}', '; {prefixes} என்று தொடங்க வேண்டும்'], // Native Tamil review required.
  uiUpdateId: ['Please update this ID. {help}.', 'இந்த எண்ணைத் திருத்தவும். {help}.'], // Native Tamil review required.
  uiSupportedOperator: ['Select a supported operator', 'ஆதரிக்கப்படும் ஆபரேட்டரைத் தேர்ந்தெடுக்கவும்'], // Native Tamil review required.
  uiAmountBounds: ['Enter an amount from Rs. {min} to Rs. {max} with no more than {decimals} decimal places.', 'Rs. {min} முதல் Rs. {max} வரை, அதிகபட்சம் {decimals} தசம இடங்களுடன் தொகையை உள்ளிடவும்.'], // Native Tamil review required.
  uiAmountHelp: ['Rs. {min}–Rs. {max}; up to {decimals} decimal places.', 'Rs. {min} முதல் Rs. {max} வரை; அதிகபட்சம் {decimals} தசம இடங்கள்.'], // Native Tamil review required.
  uiPolicyDraft: ['Draft — details marked [FILL IN] await confirmation. Effective date: {date}.', 'வரைவு — [FILL IN] எனக் குறிக்கப்பட்ட விவரங்கள் உறுதிசெய்யப்பட வேண்டும். நடைமுறைக்கு வரும் தேதி: {date}.'], // Native Tamil review required.
  uiSetTopBox: ['Set-top box', 'செட்-டாப் பாக்ஸ்'], // Native Tamil review required.
  uiNoCatalogPacks: ['{operator} has no catalog packs here. You can choose a custom top-up from {range} instead.', '{operator} பேக்குகள் இங்கு இல்லை. {range} வரம்பில் உங்கள் விருப்பத் தொகையில் ரீசார்ஜ் செய்யலாம்.'], // Native Tamil review required.
  uiNoProviderOrder: ['No provider order created', 'கட்டணச் சேவை ஆர்டர் இன்னும் உருவாக்கப்படவில்லை'], // Native Tamil review required.
  uiSandboxExplanation: ['Test results stay in this dialog. No recharge, receipt, saved-box update or real order is created.', 'சோதனை முடிவுகள் இந்தப் பக்கத்தில் மட்டுமே இருக்கும். ரீசார்ஜ், ரசீது, சேமித்த பெட்டி மாற்றம் அல்லது உண்மையான ஆர்டர் எதுவும் உருவாக்கப்படாது.'], // Native Tamil review required.
  uiPaymentExplanation: ['Payment must be confirmed by the provider before recharge processing begins. Closing this dialog does not prove payment success.', 'ரீசார்ஜ் தொடங்கும் முன் கட்டணச் சேவை பணம் செலுத்தப்பட்டதை உறுதிசெய்ய வேண்டும். இந்தப் பக்கத்தை மூடுவது கட்டண வெற்றிக்கான சான்று அல்ல.'], // Native Tamil review required.
  uiProviderUnavailable: ['Payment provider is not configured. No payment has been taken. Please retry later.', 'கட்டணச் சேவை இன்னும் அமைக்கப்படவில்லை. பணம் எதுவும் பெறப்படவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'], // Native Tamil review required.
  uiSessionBusy: ['Test checkout is busy. Please retry later.', 'சோதனைக் கட்டணச் சேவை தற்போது பிஸியாக உள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'], // Native Tamil review required.
  uiSessionConflict: ['Idempotency key already used for another checkout.', 'இந்தக் கட்டணக் கோரிக்கை எண் ஏற்கெனவே பயன்படுத்தப்பட்டுள்ளது. புதிய அமர்வைத் தொடங்கவும்.'], // Native Tamil review required.
  uiSessionComplete: ['This test payment already has a result. Generate a new session.', 'இந்தச் சோதனைக்கு ஏற்கெனவே முடிவு உள்ளது. புதிய அமர்வைத் தொடங்கவும்.'], // Native Tamil review required.
  uiRemoveNamedBox: ['Remove {name}', '{name} பெட்டியை நீக்கவும்'], // Native Tamil review required.
  uiConfirmRemoveBox: ['Remove “{name}” from your saved boxes?', 'சேமித்த பெட்டிகளிலிருந்து “{name}” பெட்டியை நீக்கவா?'], // Native Tamil review required.
  uiCatalogReview: ['Catalog details need review', 'பேக் விவரங்களைச் சரிபார்க்க வேண்டும்'], // Native Tamil review required.
  uiCatalogTotalError: ['Check the total channel count.', 'மொத்தச் சேனல் எண்ணிக்கையைச் சரிபார்க்கவும்.'], // Native Tamil review required.
  uiCatalogHdError: ['Check the HD channel count; it must not exceed the total.', 'HD சேனல் எண்ணிக்கை மொத்தத்தைவிட அதிகமாக இருக்கக்கூடாது. சரிபார்க்கவும்.'], // Native Tamil review required.
  uiCatalogNameError: ['Check that the pack name matches its details.', 'பேக்கின் பெயரும் விவரங்களும் பொருந்துகின்றனவா என்று சரிபார்க்கவும்.'], // Native Tamil review required.
  uiCatalogPriceError: ['Check that the price is greater than zero.', 'விலை பூஜ்ஜியத்தைவிட அதிகமாக இருக்க வேண்டும். சரிபார்க்கவும்.'], // Native Tamil review required.
  uiCatalogDurationError: ['Choose 1, 3, 6 or 12 months.', '1, 3, 6 அல்லது 12 மாதங்களைத் தேர்ந்தெடுக்கவும்.'], // Native Tamil review required.
  uiSunDirect: ['Sun Direct', 'சன் டைரக்ட்'], // Native Tamil review required.
  uiTataPlay: ['Tata Play', 'டாடா பிளே'], // Native Tamil review required.
  uiAirtel: ['Airtel Digital TV', 'ஏர்டெல் டிஜிட்டல் டிவி'], // Native Tamil review required.
  uiDishD2h: ['Dish TV & D2H', 'டிஷ் டிவி மற்றும் டி2எச்'], // Native Tamil review required.
  uiAiUnavailable: ['Pack suggestions are unavailable. Browse the available packs instead.', 'பேக் பரிந்துரைகள் தற்போது கிடைக்கவில்லை. கிடைக்கும் பேக்குகளைப் பார்த்துத் தேர்ந்தெடுக்கவும்.'], // Native Tamil review required.
  uiSkipContent: ['Skip to content', 'உள்ளடக்கத்திற்குச் செல்'], // Native Tamil review required.
  uiSignInEdit: ['You must be signed in to edit your profile.', 'கணக்கு விவரங்களைத் திருத்த முதலில் உள்நுழையவும்.'], // Native Tamil review required.
  uiSecurityInputSurfaces: ["Input surfaces", "தகவல் உள்ளிடும் இடங்கள்"], // Native Tamil review required.
  uiSecurityInvalidSmartCardCharactersInjectionAttemptsOversizedUploads: ["Invalid smart-card characters, injection attempts, oversized uploads", "தவறான கணக்கு எண்கள், தீங்கிழைக்கும் உள்ளீடுகள் மற்றும் அளவுக்கு மீறிய பதிவேற்றங்கள்"], // Native Tamil review required.
  uiSecurityOperatorSpecificInputValidationRequestSchemasAndUploadLimits: ["Operator-specific input validation, request schemas, and upload limits", "ஆபரேட்டருக்கான எண் சரிபார்ப்பு, கோரிக்கை வடிவங்கள் மற்றும் பதிவேற்ற வரம்புகள்"], // Native Tamil review required.
  uiSecurityPlanningAndReasoning: ["Planning and reasoning", "கோரிக்கையைப் புரிந்துகொள்ளுதல்"], // Native Tamil review required.
  uiSecurityInstructionOverrideAndIndirectInjectionFromExternalInputs: ["Instruction override and indirect injection from external inputs", "வெளித் தகவல்கள் மூலம் அறிவுறுத்தல்களை மாற்றும் முயற்சிகள்"], // Native Tamil review required.
  uiSecurityDataOnlyDeserializationContextualStateValidationAndFixedAllowedOp: ["Data-only deserialization, contextual state validation, and fixed allowed operators", "தகவலை மட்டும் படித்தல், செயல்நிலையைச் சரிபார்த்தல் மற்றும் அனுமதிக்கப்பட்ட ஆபரேட்டர்களை மட்டுமே பயன்படுத்துதல்"], // Native Tamil review required.
  uiSecurityToolExecution: ["Tool execution", "செயல்களை இயக்குதல்"], // Native Tamil review required.
  uiSecurityPrivilegeEscalationUnauthorizedOrderUpdatesTransponderFlooding: ["Privilege escalation, unauthorized order updates, transponder flooding", "அனுமதியற்ற அணுகல், ஆர்டர் மாற்றங்கள் மற்றும் மிகுதியான கோரிக்கைகள்"], // Native Tamil review required.
  uiSecurityRateLimitsOnSensitiveOperationsAndVerifiedFirebaseIDTokens: ["Rate limits on sensitive operations and verified Firebase ID tokens", "முக்கியச் செயல்களுக்கு கோரிக்கை வரம்புகளும் சரிபார்க்கப்பட்ட Firebase அடையாளச் சான்றுகளும்"], // Native Tamil review required.
  uiSecurityMemoryAndState: ["Memory and state", "தகவலும் செயல்நிலையும்"], // Native Tamil review required.
  uiSecurityCrossTenantDataAccessUnauthorizedOverwritesUndefinedValues: ["Cross-tenant data access, unauthorized overwrites, undefined values", "பிறரின் தகவலை அணுகுதல், அனுமதியின்றி மாற்றுதல் மற்றும் முழுமையற்ற மதிப்புகள்"], // Native Tamil review required.
  uiSecurityOwnerBoundFirestorePathsAccessRulesAndPayloadSanitization: ["Owner-bound Firestore paths, access rules, and payload sanitization", "உரிமையாளருக்கான Firestore அணுகல் விதிகளும் அனுப்பும் தகவலைச் சீராக்குதலும்"], // Native Tamil review required.
  uiSecurityFirestoreRules: ["Firestore rules", "Firestore அணுகல் விதிகள்"], // Native Tamil review required.
  uiSecurityInterSystemCommunication: ["Inter-system communication", "சேவைகளுக்கு இடையிலான தொடர்பு"], // Native Tamil review required.
  uiSecurityAPIKeyLeakageAndHardcodedCredentials: ["API-key leakage and hardcoded credentials", "API சாவிகள் வெளியாவதும் குறியீட்டில் ரகசியங்களை நேரடியாகச் சேமிப்பதும்"], // Native Tamil review required.
  uiSecurityServerSideAPIProxiesAndEnvironmentBasedSecretInjection: ["Server-side API proxies and environment-based secret injection", "சேவையக API இடைமுகங்களும் சூழல் அமைப்புகள் வழியாக ரகசியங்களைப் பெறுதலும்"], // Native Tamil review required.
  uiSecuritySecurityControlsOverview: ["Security controls overview", "பாதுகாப்பு ஏற்பாடுகளின் சுருக்கம்"], // Native Tamil review required.
  uiSecurityASummaryOfSecurityControlsDescribedForThisApplication: ["A summary of security controls described for this application.", "இந்தச் செயலிக்காக விவரிக்கப்பட்டுள்ள பாதுகாப்பு ஏற்பாடுகளின் சுருக்கம்."], // Native Tamil review required.
  uiSecurity5ControlAreas: ["5 control areas", "5 பாதுகாப்புப் பகுதிகள்"], // Native Tamil review required.
  uiSecurityRisk: ["Risk:", "ஆபத்து:"], // Native Tamil review required.
  uiSecurityControls: ["Controls:", "ஏற்பாடுகள்:"], // Native Tamil review required.
  uiSecurityControlArea: ["Control area", "பாதுகாப்புப் பகுதி"], // Native Tamil review required.
  uiSecurityExampleRisks: ["Example risks", "ஆபத்து எடுத்துக்காட்டுகள்"], // Native Tamil review required.
  uiSecurityDescribedControls: ["Described controls", "விவரிக்கப்பட்ட ஏற்பாடுகள்"], // Native Tamil review required.
  uiSecurityReference: ["Reference", "குறிப்பு"], // Native Tamil review required.
  uiSecurityCredentialHandling: ["Credential handling", "ரகசிய விவரங்களைக் கையாளுதல்"], // Native Tamil review required.
  uiSecurityTheProjectDescribesServerSideEnvironmentConfigurationForSensitive: ["The project describes server-side environment configuration for sensitive credentials.", "முக்கிய ரகசிய விவரங்களை சேவையகச் சூழல் அமைப்புகள் வழியாகப் பெறும் முறை இந்தத் திட்டத்தில் விவரிக்கப்பட்டுள்ளது."], // Native Tamil review required.
  uiSecurityDataAccess: ["Data access", "தகவல் அணுகல்"], // Native Tamil review required.
  uiSecurityFirestoreRulesDefineAccessForCustomerConnectionsAndAdministrative: ["Firestore rules define access for customer connections and administrative data.", "வாடிக்கையாளர் இணைப்புகள் மற்றும் நிர்வாகத் தகவல்களுக்கான அணுகலை Firestore விதிகள் வரையறுக்கின்றன."], // Native Tamil review required.
  uiSecurityServerRequests: ["Server requests", "சேவையகக் கோரிக்கைகள்"], // Native Tamil review required.
  uiSecurityServerRoutesValidateRequestBodiesAndSanitizeSelectedFirestorePayl: ["Server routes validate request bodies and sanitize selected Firestore payloads.", "சேவையக வழிகள் கோரிக்கைகளின் வடிவத்தைச் சரிபார்த்து, குறிப்பிட்ட Firestore தகவல்களைச் சீராக்குகின்றன."], // Native Tamil review required.
  uiSecurityThisPageSummarizesProjectDocumentationItIsNotAnIndependentSecurit: ["This page summarizes project documentation; it is not an independent security assessment. Effective protection depends on deployment and configuration.", "இந்தப் பக்கம் திட்ட ஆவணங்களின் சுருக்கம் மட்டுமே; தனியான பாதுகாப்பு ஆய்வு அல்ல. பாதுகாப்பின் செயல்திறன் நிறுவல் மற்றும் அமைப்புகளைப் பொறுத்தது."], // Native Tamil review required.
  uiOffline: ['Offline', 'சேவை கிடைக்கவில்லை'], // Native Tamil review required.
  uiMaintenance: ['Maintenance', 'பராமரிப்பு'], // Native Tamil review required.
  uiFlexible: ['Flexible', 'விருப்பத் தொகை'], // Native Tamil review required.
  uiSunSetup: ['Sun Direct HD dish, set-top box and remote', 'சன் டைரக்ட் HD டிஷ், செட்-டாப் பாக்ஸ் மற்றும் ரிமோட்'], // Native Tamil review required.
  uiAirtelSetup: ['Airtel Digital TV setup', 'ஏர்டெல் டிஜிட்டல் டிவி அமைப்பு'], // Native Tamil review required.
  uiTataSetup: ['Tata Play setup', 'டாடா பிளே அமைப்பு'], // Native Tamil review required.
  uiDishSetup: ['Dish TV and D2H setup', 'டிஷ் டிவி மற்றும் டி2எச் அமைப்பு'], // Native Tamil review required.
} as const satisfies Record<string, readonly [string, string]>;
type Messages = { [Key in keyof typeof pairs]: string };
export const customerMessages = {
  en: Object.fromEntries(Object.entries(pairs).map(([key, value]) => [key, value[0]])) as Messages,
  ta: Object.fromEntries(Object.entries(pairs).map(([key, value]) => [key, value[1]])) as Messages,
};
const byEnglish = new Map<string, string>(Object.values(pairs).map(([en, ta]) => [en, ta]));
const byTamil = new Map<string, string>(Object.values(pairs).map(([en, ta]) => [ta, en]));
export function localizeCustomerText(text: string, lang: 'en' | 'ta'): string { return (lang === 'ta' ? byEnglish : byTamil).get(text) || text; }
export function localizeCustomerError(text: string, lang: 'en' | 'ta'): string {
  if (/failed to fetch|network\s*(error|request)|networkerror|load failed/i.test(text)) return customerMessages[lang].uiNetworkError;
  if (lang === 'en') return byTamil.get(text) || text;
  return /[\u0b80-\u0bff]/.test(text) ? text : byEnglish.get(text) || customerMessages.ta.uiSomethingWentWrongPleaseTryAgain;
}
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => key in values ? String(values[key]) : match);
}
export function paymentMethodLabel(method: string, lang: 'en' | 'ta'): string {
  return ({ upi: 'UPI', card: customerMessages[lang].uiDebitCreditCard, netbanking: customerMessages[lang].uiNetBanking } as Record<string, string>)[method] || method;
}

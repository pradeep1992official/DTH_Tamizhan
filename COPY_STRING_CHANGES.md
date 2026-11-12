# Exhaustive copy/source change ledger

This ledger records every changed nonblank source line from the pre-task snapshot, so multiline copy templates are not omitted. It includes imports, comments and control-flow context as well as actual strings. Before/current line numbers belong to their respective file versions. Moved copy appears where removed and in its new dictionary. Unchanged text and test fixture values are not listed.

All new/changed Tamil is draft copy requiring native-speaker review. Policy Tamil also requires legal review.

## server/controllers/aiController.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 4 | -- | import { customerMessages } from '../../src/lib/customerMessages'; |
| -- | 5 | -- | import { planModel } from '../models/planModel'; |
| -- | 6 | -- | import { validateCatalogPack } from '../../src/lib/catalog'; |
| 18 | 21 | res.json({ | res.status(503).json({ success: false, error: customerMessages[preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable }); |
| 19 | -- | success: true, | -- |
| 20 | -- | recommendation: &#96;Based on your budget of ₹${monthlyBudget \|\| 300}, we recommend the ${operator === 'sun_direct' ? 'Sun Direct Prime HD' : 'Tamil Entertainment HD'} pack.&#96;, | -- |
| 21 | -- | }); | -- |
| 28 | 28 | - Monthly Budget: ₹${monthlyBudget \|\| 300} | - Monthly Budget: Rs. ${monthlyBudget \|\| 300} |
| 32 | 32 | Provide a friendly 2-3 sentence recommendation highlighting value, HD clarity, and savings.&#96;; | Available catalog records: ${JSON.stringify(planModel.getAll().filter(pack =&gt; !validateCatalogPack(pack).length).map(pack =&gt; ({ operator: pack.operator, name: pack.plan_name, amount: pack.amount, duration_months: pack.duration_months })))} |
| -- | 33 | -- | Use only these catalog records. If none match, say so. Do not invent packs, prices, channel counts, statistics, testimonials, rankings, savings or activation times. Use Rs. for currency and month/months for durations. Reply in the requested language with 2-3 plain-language sentences.&#96;; |
| -- | 35 | -- | if (!result.text) { res.status(503).json({ success: false, error: customerMessages[preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable }); return; } |
| 36 | 38 | recommendation: result.text \|\| 'Recommended Tamil HD entertainment pack.', | recommendation: result.text, |
| 40 | 42 | res.status(500).json({ success: false, error: 'AI recommendation service unavailable' }); | res.status(500).json({ success: false, error: customerMessages[req.body.preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable }); |

## server/pages.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { customerMessages } from '../src/lib/customerMessages'; |
| 10 | 11 | export function statusPageBody(status: 404 \| 500): string { | export function statusPageBody(status: 404 \| 500, lang: Language = 'en'): string { |
| 11 | 12 | return &#96;&lt;main style="max-width:48rem;margin:4rem auto;padding:2rem;font:1rem/1.6 system-ui;color:#33272b;background:#fffefa"&gt;&lt;h1&gt;${status} — ${status === 404 ? 'Page not found / பக்கம் கிடைக்கவில்லை' : 'Service error / சேவைப் பிழை'}&lt;/h1&gt;&lt;p&gt;${status === 404 ? 'This address does not exist. / இந்த முகவரி கிடைக்கவில்லை.' : 'The page could not be loaded. This is not confirmation of payment. / பக்கத்தை ஏற்ற முடியவில்லை. இது கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது.'}&lt;/p&gt;&lt;a href="/"&gt;Back to home / முகப்புப் பக்கத்திற்குத் திரும்பவும்&lt;/a&gt;&lt;/main&gt;&#96;; | const t = customerMessages[lang]; |
| -- | 13 | -- | const title = status === 404 ? t.uiPageNotFound : t.uiWeCouldNotLoadThisPage; |
| -- | 14 | -- | const description = status === 404 ? t.uiThisAddressDoesNotExistCheckTheLinkOrReturnHome : t.uiReturnHomeToTryAgainThisErrorIsNotConfirmationThatAPaymentSucceeded; |
| -- | 15 | -- | return &#96;&lt;main style="max-width:48rem;margin:4rem auto;padding:2rem;font:1rem/1.7 system-ui;color:#33272b;background:#fffefa"&gt;&lt;h1&gt;${status} — ${escapeHtml(title)}&lt;/h1&gt;&lt;p&gt;${escapeHtml(description)}&lt;/p&gt;&lt;a href="/"&gt;${escapeHtml(t.uiBackToHome)}&lt;/a&gt;&lt;/main&gt;&#96;; |
| -- | 26 | -- | if (!/&lt;meta\s+charset=/i.test(html)) html = html.replace('&lt;/head&gt;', '&lt;meta charset="UTF-8" /&gt;&lt;/head&gt;'); |
| 38 | 44 | if (meta.status === 404) html = html.replace(/&lt;div id="root"&gt;[\s\S]*?&lt;\/div&gt;/, &#96;&lt;div id="root"&gt;${statusPageBody(404)}&lt;/div&gt;&#96;); | if (meta.status === 404) html = html.replace(/&lt;div id="root"&gt;[\s\S]*?&lt;\/div&gt;/, &#96;&lt;div id="root"&gt;${statusPageBody(404, requestLanguage(req))}&lt;/div&gt;&#96;); |
| 39 | 45 | if (meta.status === 500) html = html.replace('&lt;/body&gt;', &#96;${statusPageBody(500)}&lt;/body&gt;&#96;); | if (meta.status === 500) html = html.replace('&lt;/body&gt;', &#96;${statusPageBody(500, requestLanguage(req))}&lt;/body&gt;&#96;); |
| 50 | 56 | const html = injectPageMetadata(&#96;&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;/head&gt;&lt;body&gt;${statusPageBody(500)}&lt;/body&gt;&lt;/html&gt;&#96;, '/500', requestLanguage(req), originForRequest(req)); | const html = injectPageMetadata(&#96;&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;/head&gt;&lt;body&gt;${statusPageBody(500, requestLanguage(req))}&lt;/body&gt;&lt;/html&gt;&#96;, '/500', requestLanguage(req), originForRequest(req)); |

## server/payments.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { formatDuration } from '../src/lib/catalog'; |
| 31 | 32 | return { amountPaise: paise(plan.amount), packName: plan.plan_name, validity: &#96;${plan.duration_months} months&#96; }; | return { amountPaise: paise(plan.amount), packName: plan.plan_name, validity: formatDuration(plan.duration_months) }; |

## src/App.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 247 | 247 | if (!user) throw new Error('You must be signed in to edit your profile.'); | if (!user) throw new Error(t.uiSignInEdit); |
| 422 | 422 | &lt;a href="#main-content" className="skip-link"&gt;{currentLang === 'ta' ? 'உள்ளடக்கத்திற்குச் செல்' : 'Skip to content'}&lt;/a&gt; | &lt;a href="#main-content" className="skip-link"&gt;{t.uiSkipContent}&lt;/a&gt; |
| 500 | 500 | &lt;Route path="/security" element={&lt;SecurityNotice currentTheme={currentTheme} /&gt;} /&gt; | &lt;Route path="/security" element={&lt;SecurityNotice currentTheme={currentTheme} currentLang={currentLang} /&gt;} /&gt; |
| 541 | 541 | &lt;p className="footer-disclaimer"&gt;{t.footerDisclaimer}&lt;/p&gt; | &lt;p className="footer-disclaimer"&gt;{t.madeWithLove} {t.footerDisclaimer}&lt;/p&gt; |

## src/components/AccountPage.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { translations } from '../lib/translations'; |
| 7 | 8 | &lt;h1 className="text-2xl font-bold"&gt;{ta ? 'உங்கள் கணக்கு' : 'Your account'}&lt;/h1&gt; | &lt;h1 className="text-2xl font-bold"&gt;{translations[currentLang].uiYourAccount}&lt;/h1&gt; |
| 8 | 9 | {user ? &lt;&gt;&lt;p&gt;{user.displayName \|\| user.email}&lt;/p&gt;&lt;Link to="/connections" className="underline"&gt;{ta ? 'சேமித்த பெட்டிகளைப் பார்க்கவும்' : 'View saved set-top boxes'}&lt;/Link&gt;&lt;/&gt; : &lt;&gt;&lt;p&gt;{ta ? 'சேமித்த இணைப்புகளை அணுக உள்நுழையுங்கள்.' : 'Sign in to access your saved connections.'}&lt;/p&gt;&lt;button type="button" onClick={onOpenAuth} className="dialog-primary px-4 py-2 rounded-lg"&gt;{ta ? 'உள்நுழையுங்கள்' : 'Sign in'}&lt;/button&gt;&lt;/&gt;} | {user ? &lt;&gt;&lt;p&gt;{user.displayName \|\| user.email}&lt;/p&gt;&lt;Link to="/connections" className="underline"&gt;{translations[currentLang].uiViewSavedSetTopBoxes}&lt;/Link&gt;&lt;/&gt; : &lt;&gt;&lt;p&gt;{translations[currentLang].uiSignInToAccessYourSavedConnections}&lt;/p&gt;&lt;button type="button" onClick={onOpenAuth} className="dialog-primary px-4 py-2 rounded-lg"&gt;{translations[currentLang].uiSignIn}&lt;/button&gt;&lt;/&gt;} |

## src/components/Admin/tabs/PacksTab.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 499 | 499 | &lt;label className="font-medium block mb-1 text-ink "&gt;Amount in INR (₹)&lt;/label&gt; | &lt;label className="font-medium block mb-1 text-ink "&gt;Amount (Rs.)&lt;/label&gt; |
| 618 | 618 | {t.confirmDeletePackDesc} &lt;strong&gt;{packToDelete.plan_name}&lt;/strong&gt; (₹{packToDelete.amount})? | {t.confirmDeletePackDesc} &lt;strong&gt;{packToDelete.plan_name}&lt;/strong&gt; (Rs. {packToDelete.amount})? |

## src/components/AuthModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { localizeCustomerError } from '../lib/customerMessages'; |
| 22 | 23 | function formatNameFromEmail(email?: string): string { | function formatNameFromEmail(email?: string, lang: Language = 'en'): string { |
| 23 | 24 | if (!email) return 'Subscriber'; | if (!email) return translations[lang].customer; |
| 24 | -- | if (isSuperAdminEmail(email)) return 'Professor Pradeep S'; | -- |
| 65 | 65 | const finalDisplayName = fbUser.displayName \|\| (isSuperAdmin ? 'Professor Pradeep S' : formatNameFromEmail(userEmail)); | const finalDisplayName = fbUser.displayName \|\| formatNameFromEmail(userEmail, currentLang); |
| 96 | 96 | setErrorMsg(currentLang === 'ta' ? 'அங்கீகார சேவை தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.' : 'Authentication is currently not available. Please try again later.'); | setErrorMsg(translations[currentLang].uiAuthenticationIsCurrentlyNotAvailablePleaseTryAgainLater); |
| 106 | 106 | setErrorMsg(currentLang === 'ta' | setErrorMsg(translations[currentLang].uiTheSignInWindowClosedBeforeAuthenticationCompletedTryAgainIfItKeepsHap); |
| 107 | -- | ? 'உள்நுழைவு முடிவதற்கு முன் சாளரம் மூடப்பட்டது. மீண்டும் முயற்சிக்கவும்; தொடர்ந்தால் Firebase அங்கீகரிக்கப்பட்ட டொமைனைச் சரிபார்க்கவும்.' | -- |
| 108 | -- | : 'The sign-in window closed before authentication completed. Try again; if it keeps happening, check the Firebase authorized domain.'); | -- |
| 112 | 110 | setErrorMsg(err?.message \|\| (currentLang === 'ta' ? 'உள்நுழைவு நிறைவடையவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Google Sign-In was not completed. Please try again.')); | setErrorMsg(err?.message \|\| (translations[currentLang].uiGoogleSignInWasNotCompletedPleaseTryAgain)); |
| 160 | 158 | &lt;span&gt;{errorMsg}&lt;/span&gt; | &lt;span&gt;{localizeCustomerError(errorMsg, currentLang)}&lt;/span&gt; |
| 190 | 188 | &lt;span&gt;{isLoading ? (currentLang === 'ta' ? 'சரிபார்க்கப்படுகிறது...' : 'Connecting...') : t.googleOption}&lt;/span&gt; | &lt;span&gt;{isLoading ? (translations[currentLang].uiConnecting) : t.googleOption}&lt;/span&gt; |

## src/components/BrandAssets.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import type { Language } from '../types'; |
| -- | 2 | -- | import { translations } from '../lib/translations'; |
| 144 | 146 | alt={&#96;${operatorId} logo&#96;} | alt="" aria-hidden="true" |
| 194 | 196 | export const SunDirectHeroBannerGraphic: React.FC = () =&gt; { | export const SunDirectHeroBannerGraphic: React.FC&lt;{ currentLang?: Language }&gt; = ({ currentLang = 'en' }) =&gt; { |
| 198 | 200 | alt="Sun Direct HD Dish, Set-Top Box & Remote" | alt={translations[currentLang].uiSunSetup} |
| 253 | 255 | export const AirtelHeroBannerGraphic: React.FC = () =&gt; { | export const AirtelHeroBannerGraphic: React.FC&lt;{ currentLang?: Language }&gt; = ({ currentLang = 'en' }) =&gt; { |
| 257 | 259 | alt="Airtel Digital TV Setup" | alt={translations[currentLang].uiAirtelSetup} |
| 277 | 279 | export const TataPlayHeroBannerGraphic: React.FC = () =&gt; { | export const TataPlayHeroBannerGraphic: React.FC&lt;{ currentLang?: Language }&gt; = ({ currentLang = 'en' }) =&gt; { |
| 281 | 283 | alt="Tata Play Setup" | alt={translations[currentLang].uiTataSetup} |
| 298 | 300 | export const DishTvHeroBannerGraphic: React.FC = () =&gt; { | export const DishTvHeroBannerGraphic: React.FC&lt;{ currentLang?: Language }&gt; = ({ currentLang = 'en' }) =&gt; { |
| 302 | 304 | alt="Dish TV & d2h Setup" | alt={translations[currentLang].uiDishSetup} |
| 314 | 316 | export const HeroIllustrativeGraphic: React.FC&lt;{ theme: OperatorTheme }&gt; = ({ theme }) =&gt; { | export const HeroIllustrativeGraphic: React.FC&lt;{ theme: OperatorTheme; currentLang?: Language }&gt; = ({ theme, currentLang = 'en' }) =&gt; { |
| 316 | 318 | return &lt;AirtelHeroBannerGraphic /&gt;; | return &lt;AirtelHeroBannerGraphic currentLang={currentLang} /&gt;; |
| 320 | 322 | return &lt;TataPlayHeroBannerGraphic /&gt;; | return &lt;TataPlayHeroBannerGraphic currentLang={currentLang} /&gt;; |
| 324 | 326 | return &lt;DishTvHeroBannerGraphic /&gt;; | return &lt;DishTvHeroBannerGraphic currentLang={currentLang} /&gt;; |
| 327 | 329 | return &lt;SunDirectHeroBannerGraphic /&gt;; | return &lt;SunDirectHeroBannerGraphic currentLang={currentLang} /&gt;; |

## src/components/BrowsePlans/ApplyPlanModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { localizeCustomerError } from '../../lib/customerMessages'; |
| 2 | 3 | import { subscriberError, subscriberHelp, subscriberRule, normalizeSubscriberId } from '../../lib/subscriberValidation'; | import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../../lib/subscriberValidation'; |
| 98 | 99 | }), cardName: subscriberRule(plan.operator, true).label, hint: subscriberHelp(plan.operator, true, currentLang) }; | }), cardName: subscriberLabel(plan.operator, true, currentLang), hint: subscriberHelp(plan.operator, true, currentLang) }; |
| 107 | 108 | setFormError(currentLang === 'ta' ? 'பொருத்தமான செட்-டாப் பாக்ஸைத் தேர்ந்தெடுக்கவும்' : 'Please select a compatible Set-Top Box.'); | setFormError(translations[currentLang].uiPleaseSelectACompatibleSetTopBox); |
| 132 | 133 | nickname: nicknameInput.trim() \|\| &#96;${opMeta.name} Box&#96;, | nickname: nicknameInput.trim() \|\| &#96;${opMeta.name} ${t.uiSetTopBox}&#96;, |
| 133 | 134 | customerName: customerNameInput.trim() \|\| user?.displayName \|\| 'Subscriber', | customerName: customerNameInput.trim() \|\| user?.displayName \|\| t.customer, |
| 220 | 221 | &lt;span&gt;{formError}&lt;/span&gt; | &lt;span&gt;{localizeCustomerError(formError, currentLang)}&lt;/span&gt; |
| 258 | 259 | {currentLang === 'ta' ? 'சேமிக்கப்பட்ட பாக்ஸைத் தேர்ந்தெடுக்கவும்:' : 'Select Saved Box:'} | {translations[currentLang].uiSelectSavedBox} |
| 333 | 334 | placeholder={subscriberRule(plan.operator, true).placeholder} | placeholder={subscriberPlaceholder(plan.operator, true, currentLang)} |
| 338 | 339 | &lt;p id="apply-id-help" role={formError ? "alert" : undefined} className={formError ? "text-error" : ""}&gt;{formError \|\| opMeta.hint}&lt;/p&gt; | &lt;p id="apply-id-help" role={formError ? "alert" : undefined} className={formError ? "text-error" : ""}&gt;{formError ? localizeCustomerError(formError, currentLang) : opMeta.hint}&lt;/p&gt; |
| 347 | 348 | placeholder="e.g. Living Room TV" | placeholder={translations[currentLang].uiEnterABoxNickname} |

## src/components/BrowsePlans/BrowsePlansView.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { localizeCustomerError } from '../../lib/customerMessages'; |
| 310 | 311 | {fetchError} | {localizeCustomerError(fetchError, currentLang)} |
| 342 | 343 | &lt;span className="font-medium"&gt;{fetchError}&lt;/span&gt; | &lt;span className="font-medium"&gt;{localizeCustomerError(fetchError, currentLang)}&lt;/span&gt; |
| 430 | 431 | {currentLang === 'ta' ? '\u0baa\u0bca\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1\u0bae\u0bcd \u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bc1\u0b95\u0bb3\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8.' : 'No matching packs.'} | {translations[currentLang].uiNoMatchingPacks} |
| 433 | 434 | {currentLang === 'ta' | {translations[currentLang].uiTryAnotherSearchOrClearYourFilters} |
| 434 | -- | ? 'விலை வரம்பை மாற்றவும் அல்லது அனைத்து வடிகட்டல்களையும் நீக்கி மீண்டும் முயற்சிக்கவும்.' | -- |
| 435 | -- | : 'Try another search or clear your filters.'} | -- |
| 447 | 446 | &lt;span&gt;{currentLang === 'ta' ? t.resetFilters : 'Clear filters'}&lt;/span&gt; | &lt;span&gt;{currentLang === 'ta' ? t.resetFilters : translations[currentLang].uiClearFilters}&lt;/span&gt; |

## src/components/BrowsePlans/CompareDrawer.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { formatMessage } from '../../lib/customerMessages'; |
| 89 | 90 | title="Remove from comparison" | title={translations[currentLang].uiRemoveFromComparison} |
| 90 | 91 | aria-label={&#96;Remove ${plan.name} from comparison&#96;} | aria-label={formatMessage(t.uiRemoveNamedPlan, { name: plan.name })} |

## src/components/BrowsePlans/ComparisonTable.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { formatMessage } from '../../lib/customerMessages'; |
| 119 | 120 | aria-label={&#96;Remove ${plan.name} from comparison&#96;} | aria-label={formatMessage(t.uiRemoveNamedPlan, { name: plan.name })} |
| 176 | 177 | title="Remove from compare" | title={translations[currentLang].uiRemoveFromCompare} |
| 177 | 178 | aria-label={&#96;Remove ${p.name} from comparison&#96;} | aria-label={formatMessage(t.uiRemoveNamedPlan, { name: p.name })} |

## src/components/BrowsePlans/PlanCard.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 1 | 1 | import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, validateCatalogPack } from '../../lib/catalog'; | import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, formatCatalogIssues, validateCatalogPack } from '../../lib/catalog'; |
| 55 | 55 | const channelListLabel = currentLang === 'ta' ? '\u0b9a\u0bc7\u0ba9\u0bb2\u0bcd \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bcd' : 'Channel list'; | const channelListLabel = translations[currentLang].uiChannelList; |
| 86 | 86 | &lt;h3 className="font-bold break-words"&gt;{planName}&lt;/h3&gt; | &lt;h3 className="font-bold wrap-break-word"&gt;{planName}&lt;/h3&gt; |
| 90 | 90 | {validateCatalogPack(plan).length &gt; 0 && &lt;p role="status" className="text-error text-xs"&gt;Catalog details need review: {validateCatalogPack(plan).map(issue =&gt; issue.message).join(" ")}&lt;/p&gt;} | {validateCatalogPack(plan).length &gt; 0 && &lt;p role="status" className="text-error text-xs"&gt;{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(plan, currentLang)}&lt;/p&gt;} |

## src/components/BrowsePlans/PlanFilterSidebar.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 231 | 231 | ₹{filters.priceRange[0]} - ₹{Math.min(filters.priceRange[1], priceMaximum)} | Rs. {filters.priceRange[0]} - Rs. {Math.min(filters.priceRange[1], priceMaximum)} |

## src/components/ErrorPages.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { translations } from '../lib/translations'; |
| 7 | 8 | &lt;h1 tabIndex={-1} className="text-2xl font-bold"&gt;{status} — {status === 404 ? (ta ? 'பக்கம் கிடைக்கவில்லை' : 'Page not found') : (ta ? 'பக்கத்தை ஏற்ற முடியவில்லை' : 'We could not load this page')}&lt;/h1&gt; | &lt;h1 tabIndex={-1} className="text-2xl font-bold"&gt;{status} — {status === 404 ? (translations[currentLang].uiPageNotFound) : (translations[currentLang].uiWeCouldNotLoadThisPage)}&lt;/h1&gt; |
| 8 | 9 | &lt;p&gt;{status === 404 ? (ta ? 'இந்த முகவரி கிடைக்கவில்லை. இணைப்பைச் சரிபார்க்கவும் அல்லது முகப்புக்குச் செல்லவும்.' : 'This address does not exist. Check the link or return home.') : (ta ? 'மீண்டும் முயற்சிக்க முகப்புப் பக்கத்திற்குச் செல்லவும். இந்தப் பிழை கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது.' : 'Return home to try again. This error is not confirmation that a payment succeeded.')}&lt;/p&gt; | &lt;p&gt;{status === 404 ? (translations[currentLang].uiThisAddressDoesNotExistCheckTheLinkOrReturnHome) : (translations[currentLang].uiReturnHomeToTryAgainThisErrorIsNotConfirmationThatAPaymentSucceeded)}&lt;/p&gt; |
| 9 | 10 | &lt;a href="/" className="underline underline-offset-4"&gt;{ta ? 'முகப்புப் பக்கத்திற்குத் திரும்பவும்' : 'Back to home'}&lt;/a&gt; | &lt;a href="/" className="underline underline-offset-4"&gt;{translations[currentLang].uiBackToHome}&lt;/a&gt; |

## src/components/ExcelPlanImportExportModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 606 | 606 | ₹{row.amount} | Rs. {row.amount} |
| 610 | 610 | &lt;span className="tabular-nums font-bold"&gt;₹{row.amount}&lt;/span&gt; | &lt;span className="tabular-nums font-bold"&gt;Rs. {row.amount}&lt;/span&gt; |
| 790 | 790 | Update prices (e.g. ₹299 to ₹319) or add new packs in Excel / Numbers / Sheets. | Update prices (e.g. Rs. 299 to Rs. 319) or add new packs in Excel / Numbers / Sheets. |
| 862 | 862 | &lt;td className="p-2.5 tabular-nums font-bold"&gt;Price (INR)&lt;/td&gt; | &lt;td className="p-2.5 tabular-nums font-bold"&gt;Price (Rs.)&lt;/td&gt; |

## src/components/Header.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { localizeCustomerError } from '../lib/customerMessages'; |
| 100 | 101 | setProfileError(currentLang === 'ta' ? 'பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்.' : 'Name must be at least 2 characters.'); | setProfileError(translations[currentLang].uiNameMustBeAtLeast2Characters); |
| 110 | 111 | setProfileError(error instanceof Error ? error.message : 'Unable to save profile. Please try again.'); | setProfileError(error instanceof Error ? error.message : translations[currentLang].uiUnableToSaveProfilePleaseTryAgain); |
| 126 | 127 | aria-label="DTH Tamizhan home" | aria-label={translations[currentLang].uiDTHTamizhanHome} |
| 154 | 155 | &lt;nav aria-label="Main navigation" className={&#96;desktop-navigation&#96;}&gt; | &lt;nav aria-label={translations[currentLang].uiMainNavigation} className={&#96;desktop-navigation&#96;}&gt; |
| 202 | 203 | aria-label={currentLang === 'ta' ? (user ? &#96;கணக்கு: ${user.displayName \|\| user.email \|\| ''}&#96; : 'கணக்கு') : (user ? &#96;Account: ${user.displayName \|\| user.email \|\| ''}&#96; : 'Account')} | aria-label={[t.uiAccount, user?.displayName \|\| user?.email].filter(Boolean).join(': ')} |
| 234 | 235 | {user ? (user.displayName \|\| (user.email ? user.email.split('@')[0] : t.customer)) : (currentLang === 'ta' ? 'கணக்கு' : 'Account')} | {user ? (user.displayName \|\| (user.email ? user.email.split('@')[0] : t.customer)) : (translations[currentLang].uiAccount)} |
| 265 | 266 | {user ? (user.email \|\| 'DTH Account Verified') : t.signInPrompt} | {user ? (user.email \|\| translations[currentLang].uiDTHAccountVerified) : t.signInPrompt} |
| 272 | 273 | &lt;User className="w-4 h-4" aria-hidden="true" /&gt;&lt;span&gt;{currentLang === 'ta' ? 'உங்கள் கணக்கு' : 'Your account'}&lt;/span&gt; | &lt;User className="w-4 h-4" aria-hidden="true" /&gt;&lt;span&gt;{translations[currentLang].uiYourAccount}&lt;/span&gt; |
| 304 | 305 | &lt;span&gt;{user ? t.editProfile : (currentLang === 'ta' ? 'கூகிள் மூலம் உள்நுழைக' : 'Sign in with Google')}&lt;/span&gt; | &lt;span&gt;{user ? t.editProfile : (translations[currentLang].uiSignInWithGoogle)}&lt;/span&gt; |
| 313 | 314 | &lt;span className="text-sm text-ink-2"&gt;{currentLang === 'ta' ? 'மொழி' : 'Language'}&lt;/span&gt; | &lt;span className="text-sm text-ink-2"&gt;{translations[currentLang].uiLanguage}&lt;/span&gt; |
| 315 | 316 | &lt;button type="button" onClick={() =&gt; onLanguageChange('en')} aria-pressed={currentLang === 'en'}&gt;English&lt;/button&gt; | &lt;button type="button" onClick={() =&gt; onLanguageChange('en')} aria-pressed={currentLang === 'en'}&gt;{translations[currentLang].uiEnglish}&lt;/button&gt; |
| 322 | 323 | &lt;p role="status" className="px-4 py-2 text-muted"&gt;{currentLang === 'ta' ? 'நிர்வாக அணுகலைச் சரிபார்க்கிறது…' : 'Checking admin access…'}&lt;/p&gt; | &lt;p role="status" className="px-4 py-2 text-muted"&gt;{translations[currentLang].uiCheckingAdminAccess}&lt;/p&gt; |
| 326 | 327 | &lt;p role="alert"&gt;{currentLang === 'ta' ? 'நிர்வாக அணுகலைச் சரிபார்க்க முடியவில்லை.' : 'Unable to verify admin access.'}&lt;/p&gt; | &lt;p role="alert"&gt;{translations[currentLang].uiUnableToVerifyAdminAccess}&lt;/p&gt; |
| 327 | 328 | &lt;button type="button" onClick={() =&gt; setAdminAccessRetry(value =&gt; value + 1)}&gt;{currentLang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry access check'}&lt;/button&gt; | &lt;button type="button" onClick={() =&gt; setAdminAccessRetry(value =&gt; value + 1)}&gt;{translations[currentLang].uiRetryAccessCheck}&lt;/button&gt; |
| 354 | 355 | Admin | {t.adminBadge} |
| 371 | 372 | &lt;span&gt;Log Out&lt;/span&gt; | &lt;span&gt;{t.signOut}&lt;/span&gt; |
| 382 | 383 | &lt;nav aria-label="Main navigation" className={&#96;mobile-navigation ${currentTheme.statusStripBg}&#96;}&gt; | &lt;nav aria-label={translations[currentLang].uiMainNavigation} className={&#96;mobile-navigation ${currentTheme.statusStripBg}&#96;}&gt; |
| 471 | 472 | {profileError && &lt;p role="alert" className="text-sm text-error"&gt;{profileError}&lt;/p&gt;} | {profileError && &lt;p role="alert" className="text-sm text-error"&gt;{localizeCustomerError(profileError, currentLang)}&lt;/p&gt;} |
| 485 | 486 | {isSavingProfile ? (currentLang === 'ta' ? 'சேமிக்கிறது…' : 'Saving…') : t.save} | {isSavingProfile ? (translations[currentLang].uiSaving) : t.save} |

## src/components/NewConnectionModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { localizeCustomerError } from '../lib/customerMessages'; |
| 52 | 53 | throw new Error(result.error \|\| 'Unable to submit the installation request.'); | throw new Error(result.error \|\| translations[currentLang].uiUnableToSubmitTheInstallationRequest); |
| 60 | 61 | : error instanceof Error ? error.message : 'Unable to submit the request. Please try again.'); | : error instanceof Error ? error.message : translations[currentLang].uiUnableToSubmitTheRequestPleaseTryAgain); |
| 122 | 123 | { id: 'sun_direct', name: 'Sun Direct', price: BUSINESS_DETAILS.installation, highlight: 'Quotation required' }, | { id: 'sun_direct', name: 'Sun Direct', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired }, |
| 123 | 124 | { id: 'tata_play', name: 'Tata Play', price: BUSINESS_DETAILS.installation, highlight: 'Quotation required' }, | { id: 'tata_play', name: 'Tata Play', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired }, |
| 124 | 125 | { id: 'airtel_dth', name: 'Airtel DTH', price: BUSINESS_DETAILS.installation, highlight: 'Quotation required' }, | { id: 'airtel_dth', name: 'Airtel DTH', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired }, |
| 155 | 156 | &lt;span className="text-sm block font-medium"&gt;Equipment to be confirmed&lt;/span&gt; | &lt;span className="text-sm block font-medium"&gt;{translations[currentLang].uiEquipment}&lt;/span&gt; |
| 159 | 160 | &lt;span className="text-sm block font-medium"&gt;Cabling to be confirmed&lt;/span&gt; | &lt;span className="text-sm block font-medium"&gt;{translations[currentLang].uiCabling}&lt;/span&gt; |
| 163 | 164 | &lt;span className="text-sm block font-medium"&gt;Availability to be confirmed&lt;/span&gt; | &lt;span className="text-sm block font-medium"&gt;{translations[currentLang].uiAvailability}&lt;/span&gt; |
| 178 | 179 | placeholder="e.g. Senthil Kumar" | placeholder={translations[currentLang].uiEnterYourName} |
| 192 | 193 | placeholder="10-digit mobile" | placeholder={translations[currentLang].uiMobilePlaceholder} |
| 223 | 224 | placeholder="Door no, Street, Area" | placeholder={translations[currentLang].uiAddressPlaceholder} |
| 236 | 237 | ? (currentLang === 'ta' ? 'அனுப்புகிறது…' : 'Submitting request…') | ? (translations[currentLang].uiSubmittingRequest) |
| 237 | 238 | : (currentLang === 'ta' ? 'நிறுவல் கோரிக்கையை அனுப்பு' : 'Submit installation request')} | : (translations[currentLang].uiSubmitInstallationRequest)} |
| 239 | 240 | {submitError && &lt;p role="alert" className="text-sm text-error"&gt;{submitError}&lt;/p&gt;} | {submitError && &lt;p role="alert" className="text-sm text-error"&gt;{localizeCustomerError(submitError, currentLang)}&lt;/p&gt;} |
| 254 | 255 | {currentLang === 'ta' | {translations[currentLang].uiYourInstallationRequestHasBeenReceivedOurTeamWillContactYouToConfirmTh} |
| 255 | -- | ? 'உங்கள் நிறுவல் கோரிக்கை பெறப்பட்டது. விவரங்களை உறுதிப்படுத்த எங்கள் குழு உங்களைத் தொடர்புகொள்ளும்.' | -- |
| 256 | -- | : 'Your installation request has been received. Our team will contact you to confirm the details.'} | -- |

## src/components/OperatorCatalogNotice.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { translations } from '../lib/translations'; |
| 6 | 7 | const label = currentLang === 'ta' ? 'விருப்பத் தொகை ரீசார்ஜ்' : 'Choose custom top-up'; | const label = translations[currentLang].uiChooseCustomTopUp; |

## src/components/PackCard.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 4 | -- | import { Language } from '../types'; |
| -- | 5 | -- | import { translations } from '../lib/translations'; |
| -- | 11 | -- | currentLang?: Language; |
| -- | 34 | -- | currentLang = 'en', |
| 44 | 48 | label: 'Recommended HD', | label: translations[currentLang].recommendedHd, |
| 51 | 55 | label: 'Recommended SD', | label: translations[currentLang].recommendedSd, |
| 58 | 62 | label: 'Flexible top-up', | label: translations[currentLang].flexibleTopUp, |
| 95 | 99 | {isSelected && &lt;span className="pack-state-text"&gt;Selected&lt;/span&gt;} | {isSelected && &lt;span className="pack-state-text"&gt;{translations[currentLang].selectedAction}&lt;/span&gt;} |

## src/components/PaymentModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { formatPrice, formatStoredDuration } from '../lib/catalog'; |
| -- | 2 | -- | import { localizeCustomerText, localizeCustomerError } from '../lib/customerMessages'; |
| -- | 3 | -- | import { subscriberLabel } from '../lib/subscriberValidation'; |
| -- | 4 | -- | import { translations } from '../lib/translations'; |
| 24 | 28 | export function PaymentInstrument({ method, mode, session, expired, seconds }: { | export function PaymentInstrument({ method, mode, session, expired, seconds, currentLang = 'en' }: { |
| 26 | 30 | session: CheckoutSession \| null; expired: boolean; seconds: number; | session: CheckoutSession \| null; expired: boolean; seconds: number; currentLang?: Language; |
| 30 | 34 | {mode === 'sandbox' && session && session.status === 'ready' && !expired && &lt;&gt;&lt;QrCode aria-hidden="true" className="w-20 h-20 mx-auto text-muted" /&gt;&lt;p className="text-sm font-medium"&gt;Mock QR illustration - cannot be scanned or paid&lt;/p&gt;&lt;p className="text-sm tabular-nums"&gt;Test session: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}&lt;/p&gt;&lt;/&gt;} | {mode === 'sandbox' && session && session.status === 'ready' && !expired && &lt;&gt;&lt;QrCode aria-hidden="true" className="w-20 h-20 mx-auto text-muted" /&gt;&lt;p className="text-sm font-medium"&gt;{translations[currentLang].uiMockQRIllustrationCannotBeScannedOrPaid}&lt;/p&gt;&lt;p className="text-sm tabular-nums"&gt;{translations[currentLang].uiTestSession}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}&lt;/p&gt;&lt;/&gt;} |
| 31 | 35 | {mode === 'production' && &lt;p role="alert" className="text-error text-sm"&gt;Provider QR is unavailable. Retry checkout to request a provider order.&lt;/p&gt;} | {mode === 'production' && &lt;p role="alert" className="text-error text-sm"&gt;{translations[currentLang].uiProviderQRIsUnavailableRetryCheckoutToRequestAProviderOrder}&lt;/p&gt;} |
| 33 | 37 | {method === 'card' && &lt;div className="p-4 rounded-lg border border-rule text-sm space-y-2"&gt;&lt;CreditCard className="w-5 h-5" /&gt;&lt;p&gt;{mode === 'sandbox' ? 'Mock card payment. No card number, expiry or CVV is required. Use the test controls below.' : 'Card payments require the provider hosted checkout. Provider unavailable; no card details are collected.'}&lt;/p&gt;&lt;/div&gt;} | {method === 'card' && &lt;div className="p-4 rounded-lg border border-rule text-sm space-y-2"&gt;&lt;CreditCard className="w-5 h-5" /&gt;&lt;p&gt;{mode === 'sandbox' ? translations[currentLang].uiMockCardPaymentNoCardNumberExpiryOrCVVIsRequiredUseTheTestControlsBelo : translations[currentLang].uiCardPaymentsRequireTheProviderHostedCheckoutProviderUnavailableNoCardD}&lt;/p&gt;&lt;/div&gt;} |
| 34 | 38 | {method === 'netbanking' && &lt;p className="text-sm"&gt;{mode === 'sandbox' ? 'Mock net banking. No bank login is required.' : 'Net banking requires the provider hosted checkout. Provider unavailable.'}&lt;/p&gt;} | {method === 'netbanking' && &lt;p className="text-sm"&gt;{mode === 'sandbox' ? translations[currentLang].uiMockNetBankingNoBankLoginIsRequired : translations[currentLang].uiNetBankingRequiresTheProviderHostedCheckoutProviderUnavailable}&lt;/p&gt;} |
| 62 | 66 | if (!response.ok) throw new Error(data.error \|\| 'Checkout is unavailable. Please retry.'); | if (!response.ok) throw new Error(data.error \|\| translations[currentLang].uiCheckoutIsUnavailablePleaseRetry); |
| 65 | 69 | if (abort.signal.aborted) throw new Error('Request timed out. Retry to check the same test session; do not start another payment.'); | if (abort.signal.aborted) throw new Error(translations[currentLang].uiRequestTimedOutRetryToCheckTheSameTestSessionDoNotStartAnotherPayment); |
| 89 | 93 | if (confirmedMode !== 'sandbox' \|\| data.session?.mode !== 'sandbox') throw new Error('Provider order or QR is unavailable. No payment has been taken.'); | if (confirmedMode !== 'sandbox' \|\| data.session?.mode !== 'sandbox') throw new Error(translations[currentLang].uiProviderOrderOrQRIsUnavailableNoPaymentHasBeenTaken); |
| 92 | 96 | if (version === generation.current) setError(error instanceof Error ? error.message : 'Checkout unavailable. Please retry.'); | if (version === generation.current) setError(error instanceof Error ? error.message : translations[currentLang].uiCheckoutUnavailablePleaseRetry); |
| 121 | 125 | if (version === generation.current) setError(error instanceof Error ? error.message : 'Could not check the test payment.'); | if (version === generation.current) setError(error instanceof Error ? error.message : translations[currentLang].uiCouldNotCheckTheTestPayment); |
| 130 | 134 | const formatAmount = (paise: number) =&gt; new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100); | const formatAmount = (paise: number) =&gt; formatPrice(paise / 100, currentLang); |
| 135 | 139 | &lt;div&gt;&lt;h2 id="payment-modal-title" className="text-base font-bold"&gt;Complete DTH Recharge&lt;/h2&gt;&lt;p className="text-sm text-muted"&gt;{operator.name} / {smartCard}&lt;/p&gt;&lt;/div&gt; | &lt;div&gt;&lt;h2 id="payment-modal-title" className="text-base font-bold"&gt;{translations[currentLang].uiCompleteDTHRecharge}&lt;/h2&gt;&lt;p className="text-sm text-muted"&gt;{operator.name} / {subscriberLabel(operator.id, false, currentLang)}: {smartCard}&lt;/p&gt;&lt;/div&gt; |
| 136 | 140 | &lt;button type="button" onClick={onClose} aria-label="Close checkout" className="p-2 rounded-xl"&gt;&lt;X className="w-5 h-5" /&gt;&lt;/button&gt; | &lt;button type="button" onClick={onClose} aria-label={translations[currentLang].uiCloseCheckout} className="p-2 rounded-xl"&gt;&lt;X className="w-5 h-5" /&gt;&lt;/button&gt; |
| 138 | 142 | {mode === 'sandbox' && &lt;div role="status" className="px-6 py-3 bg-warning-soft text-ink border-b border-rule font-bold"&gt;Test mode - no real payment will be taken&lt;/div&gt;} | {mode === 'sandbox' && &lt;div role="status" className="px-6 py-3 bg-warning-soft text-ink border-b border-rule font-bold"&gt;{translations[currentLang].uiTestModeNoRealPaymentWillBeTaken}&lt;/div&gt;} |
| 140 | 144 | &lt;div&gt;&lt;p className="font-medium"&gt;{session?.packName \|\| plan.name}&lt;/p&gt;&lt;p className="text-sm text-muted"&gt;{session?.validity \|\| 'Awaiting server quote'}&lt;/p&gt;&lt;/div&gt; | &lt;div&gt;&lt;p className="font-medium"&gt;{localizeCustomerText(session?.packName \|\| plan.name, currentLang)}&lt;/p&gt;&lt;p className="text-sm text-muted"&gt;{session ? localizeCustomerText(formatStoredDuration(session.validity, currentLang), currentLang) : translations[currentLang].uiAwaitingServerQuote}&lt;/p&gt;&lt;/div&gt; |
| 141 | 145 | &lt;div className="text-right"&gt;&lt;span className="text-sm text-muted block"&gt;Total payable&lt;/span&gt;&lt;strong className="text-2xl tabular-nums"&gt;{session ? formatAmount(session.amountPaise) : 'Unavailable'}&lt;/strong&gt;&lt;/div&gt; | &lt;div className="text-right"&gt;&lt;span className="text-sm text-muted block"&gt;{translations[currentLang].uiTotalPayable}&lt;/span&gt;&lt;strong className="text-2xl tabular-nums"&gt;{session ? formatAmount(session.amountPaise) : translations[currentLang].uiUnavailable}&lt;/strong&gt;&lt;/div&gt; |
| 145 | 149 | &lt;div&gt;&lt;dt className="text-muted"&gt;Payment provider&lt;/dt&gt;&lt;dd&gt;{session?.provider \|\| (mode === 'production' ? 'Not configured' : 'Checking configuration...')}&lt;/dd&gt;&lt;/div&gt; | &lt;div&gt;&lt;dt className="text-muted"&gt;{translations[currentLang].uiPaymentProvider}&lt;/dt&gt;&lt;dd&gt;{session ? localizeCustomerText(session.provider, currentLang) : mode === 'production' ? translations[currentLang].uiNotConfigured : translations[currentLang].uiCheckingConfiguration}&lt;/dd&gt;&lt;/div&gt; |
| 146 | 150 | &lt;div&gt;&lt;dt className="text-muted"&gt;Order reference&lt;/dt&gt;&lt;dd className="break-all tabular-nums"&gt;{session?.id \|\| 'No provider order created'}&lt;/dd&gt;&lt;/div&gt; | &lt;div&gt;&lt;dt className="text-muted"&gt;{translations[currentLang].uiOrderReference}&lt;/dt&gt;&lt;dd className="break-all tabular-nums"&gt;{session?.id \|\| translations[currentLang].uiNoProviderOrder}&lt;/dd&gt;&lt;/div&gt; |
| 148 | 152 | &lt;p className="text-sm text-muted"&gt;{mode === 'sandbox' ? 'Test results stay in this dialog. No recharge, receipt, saved-box update or real order is created.' : 'Payment must be confirmed by the provider before recharge processing begins. Closing this dialog does not prove payment success.'}&lt;/p&gt; | &lt;p className="text-sm text-muted"&gt;{mode === 'sandbox' ? translations[currentLang].uiSandboxExplanation : translations[currentLang].uiPaymentExplanation}&lt;/p&gt; |
| 149 | 153 | {error && &lt;div role="alert" className="p-3 rounded-xl border border-rule bg-error-soft text-error text-sm"&gt;&lt;AlertCircle className="w-4 h-4 inline mr-2" /&gt;{error}&lt;/div&gt;} | {error && &lt;div role="alert" className="p-3 rounded-xl border border-rule bg-error-soft text-error text-sm"&gt;&lt;AlertCircle className="w-4 h-4 inline mr-2" /&gt;{localizeCustomerError(error, currentLang)}&lt;/div&gt;} |
| 150 | 154 | {busy && &lt;p role="status" className="text-sm flex items-center gap-2"&gt;&lt;RefreshCw className="w-4 h-4 animate-spin" /&gt;Checking checkout...&lt;/p&gt;} | {busy && &lt;p role="status" className="text-sm flex items-center gap-2"&gt;&lt;RefreshCw className="w-4 h-4 animate-spin" /&gt;{translations[currentLang].uiCheckingCheckout}&lt;/p&gt;} |
| 151 | 155 | {!session && !busy && &lt;button type="button" onClick={() =&gt; void prepare()} className="dialog-primary w-full py-3 rounded-lg"&gt;Retry checkout&lt;/button&gt;} | {!session && !busy && &lt;button type="button" onClick={() =&gt; void prepare()} className="dialog-primary w-full py-3 rounded-lg"&gt;{translations[currentLang].uiRetryCheckout}&lt;/button&gt;} |
| 152 | 156 | &lt;div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg border border-rule bg-paper-2" role="group" aria-label="Payment method"&gt; | &lt;div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg border border-rule bg-paper-2" role="group" aria-label={translations[currentLang].uiPaymentMethod}&gt; |
| 153 | 157 | {(['upi', 'card', 'netbanking'] as const).map(value =&gt; &lt;button key={value} type="button" onClick={() =&gt; setMethod(value)} aria-pressed={method === value} className={&#96;py-2 px-2 rounded-xl text-sm font-bold ${method === value ? 'bg-accent text-accent-ink' : 'text-muted'}&#96;}&gt;{value === 'upi' ? 'UPI' : value === 'card' ? 'Debit / Credit Card' : 'Net banking'}&lt;/button&gt;)} | {(['upi', 'card', 'netbanking'] as const).map(value =&gt; &lt;button key={value} type="button" onClick={() =&gt; setMethod(value)} aria-pressed={method === value} className={&#96;py-2 px-2 rounded-xl text-sm font-bold ${method === value ? 'bg-accent text-accent-ink' : 'text-muted'}&#96;}&gt;{value === 'upi' ? 'UPI' : value === 'card' ? translations[currentLang].uiDebitCreditCard : translations[currentLang].uiNetBanking}&lt;/button&gt;)} |
| 155 | 159 | &lt;PaymentInstrument method={method} mode={mode} session={session} expired={expired} seconds={seconds} /&gt; | &lt;PaymentInstrument method={method} mode={mode} session={session} expired={expired} seconds={seconds} currentLang={currentLang} /&gt; |
| 156 | 160 | {expired && &lt;div role="status" className="space-y-3"&gt;&lt;p&gt;Session expired, generate a new QR.&lt;/p&gt;&lt;button type="button" disabled={busy} onClick={() =&gt; void prepare(true)} className="dialog-primary w-full py-3 rounded-lg"&gt;Generate a new {mode === 'sandbox' ? 'mock ' : ''}QR&lt;/button&gt;&lt;/div&gt;} | {expired && &lt;div role="status" className="space-y-3"&gt;&lt;p&gt;{translations[currentLang].uiSessionExpiredGenerateANewQR}&lt;/p&gt;&lt;button type="button" disabled={busy} onClick={() =&gt; void prepare(true)} className="dialog-primary w-full py-3 rounded-lg"&gt;{mode === 'sandbox' ? translations[currentLang].uiGenerateANewMockQR : translations[currentLang].uiGenerateANewQR}&lt;/button&gt;&lt;/div&gt;} |
| -- | 161 | -- | &lt;p className="text-sm"&gt;{translations[currentLang].instantActivation}&lt;/p&gt; |
| -- | 162 | -- | &lt;p className="text-sm"&gt;{translations[currentLang].secureEncryption}&lt;/p&gt; |
| 159 | 165 | &lt;label className="text-sm block" htmlFor="sandbox-result"&gt;Test result&lt;/label&gt; | &lt;label className="text-sm block" htmlFor="sandbox-result"&gt;{translations[currentLang].uiTestResult}&lt;/label&gt; |
| 160 | 166 | &lt;select id="sandbox-result" value={outcome} disabled={busy} onChange={event =&gt; setOutcome(event.target.value as SandboxOutcome)} className="w-full p-2 border border-rule bg-paper rounded-lg"&gt;&lt;option value="success"&gt;Success&lt;/option&gt;&lt;option value="failed"&gt;Failure&lt;/option&gt;&lt;option value="pending"&gt;Pending&lt;/option&gt;&lt;/select&gt; | &lt;select id="sandbox-result" value={outcome} disabled={busy} onChange={event =&gt; setOutcome(event.target.value as SandboxOutcome)} className="w-full p-2 border border-rule bg-paper rounded-lg"&gt;&lt;option value="success"&gt;{translations[currentLang].uiSuccess}&lt;/option&gt;&lt;option value="failed"&gt;{translations[currentLang].uiFailure}&lt;/option&gt;&lt;option value="pending"&gt;{translations[currentLang].uiPending}&lt;/option&gt;&lt;/select&gt; |
| 161 | 167 | &lt;button type="button" onClick={() =&gt; void simulate()} disabled={busy} aria-busy={busy} className="dialog-primary w-full py-3 rounded-lg disabled:opacity-50"&gt;Simulate test payment ({formatAmount(session.amountPaise)})&lt;/button&gt; | &lt;button type="button" onClick={() =&gt; void simulate()} disabled={busy} aria-busy={busy} className="dialog-primary w-full py-3 rounded-lg disabled:opacity-50"&gt;{translations[currentLang].uiSimulateTestPayment} ({formatAmount(session.amountPaise)})&lt;/button&gt; |
| 164 | 170 | &lt;p&gt;{session.status === 'success' ? 'Test payment succeeded. No real payment or recharge was made.' : session.status === 'failed' ? 'Test payment failed. No money was taken.' : 'Test payment pending. This is not a success confirmation; no recharge has started.'}&lt;/p&gt; | &lt;p&gt;{session.status === 'success' ? translations[currentLang].uiTestPaymentSucceededNoRealPaymentOrRechargeWasMade : session.status === 'failed' ? translations[currentLang].uiTestPaymentFailedNoMoneyWasTaken : translations[currentLang].uiTestPaymentPendingThisIsNotASuccessConfirmationNoRechargeHasStarted}&lt;/p&gt; |
| 165 | 171 | &lt;button type="button" onClick={() =&gt; void prepare(true)} disabled={busy} className="dialog-primary w-full py-3 rounded-lg"&gt;Start a new test session&lt;/button&gt; | &lt;button type="button" onClick={() =&gt; void prepare(true)} disabled={busy} className="dialog-primary w-full py-3 rounded-lg"&gt;{translations[currentLang].uiStartANewTestSession}&lt;/button&gt; |

## src/components/PolicyPage.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 5 | -- | import { translations } from '../lib/translations'; |
| -- | 6 | -- | import { formatMessage } from '../lib/customerMessages'; |
| -- | 7 | -- | import { businessDetails, POLICY_CONTENT_TA } from '../lib/policyTranslations'; |
| 13 | 16 | &lt;p className="text-sm text-muted" lang="en"&gt;Draft — details marked [FILL IN] await confirmation. Effective date: {BUSINESS_DETAILS.policyDate}.&lt;/p&gt; | &lt;p className="text-sm text-muted" lang={currentLang}&gt;{formatMessage(translations[currentLang].uiPolicyDraft, { date: businessDetails(currentLang).policyDate })}&lt;/p&gt; |
| 16 | 19 | &lt;div lang="en" className="space-y-6"&gt;{POLICY_CONTENT[policy].map(section =&gt; &lt;section key={section.heading} className="space-y-2"&gt; | &lt;div lang={currentLang} className="space-y-6"&gt;{(currentLang === 'ta' ? POLICY_CONTENT_TA : POLICY_CONTENT)[policy].map(section =&gt; &lt;section key={section.heading} className="space-y-2"&gt; |

## src/components/ReceiptModal.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { businessDetails } from '../lib/policyTranslations'; |
| -- | 2 | -- | import { formatPrice, formatStoredDuration } from '../lib/catalog'; |
| -- | 3 | -- | import { subscriberLabel } from '../lib/subscriberValidation'; |
| -- | 4 | -- | import { localizeCustomerText, paymentMethodLabel } from '../lib/customerMessages'; |
| 36 | 40 | const text = &#96;*DTH Tamizhan Recharge Receipt*\n&#96; + | const text = &#96;${t.receiptTitle}\n&#96; + |
| 37 | 41 | &#96;Operator: ${order.operatorName}\n&#96; + | &#96;${t.dthOperatorLabel}: ${order.operatorName}\n&#96; + |
| 38 | 42 | &#96;Viewing Card: ${order.smartCardNumber}\n&#96; + | &#96;${subscriberLabel(order.operator, false, currentLang)}: ${order.smartCardNumber}\n&#96; + |
| 39 | 43 | &#96;Pack: ${order.packName}\n&#96; + | &#96;${t.packAppliedLabel}: ${order.packName}\n&#96; + |
| 40 | 44 | &#96;Amount Paid: ₹${order.amount}\n&#96; + | &#96;${t.rechargeAmountLabel}: ${formatPrice(order.amount, currentLang)}\n&#96; + |
| 41 | 45 | &#96;Order ID: ${order.orderId}\n&#96; + | &#96;${t.orderIdLabel}: ${order.orderId}\n&#96; + |
| 42 | 46 | &#96;Ref ID: ${order.operatorRefId}\n&#96; + | &#96;${t.operatorRefLabel}: ${order.operatorRefId}\n&#96; + |
| 43 | 47 | &#96;Date: ${new Date(order.createdAt).toLocaleDateString()}&#96;; | &#96;${t.dateLabel}: ${new Date(order.createdAt).toLocaleDateString(currentLang === 'ta' ? 'ta-IN' : 'en-IN')}&#96;; |
| 73 | 77 | {currentLang === 'ta' ? 'பதிவான நிலை' : 'Recorded status'}: {order.paymentStatus} / {order.rechargeStatus} | {translations[currentLang].uiRecordedStatus}: {localizeCustomerText(order.paymentStatus, currentLang)} / {localizeCustomerText(order.rechargeStatus, currentLang)} |
| 130 | 134 | &lt;span className="text-muted"&gt;DTH Operator&lt;/span&gt; | &lt;span className="text-muted"&gt;{translations[currentLang].uiDTHOperator}&lt;/span&gt; |
| 134 | 138 | &lt;span className="text-muted"&gt;{t.viewingCardLabel}&lt;/span&gt; | &lt;span className="text-muted"&gt;{subscriberLabel(order.operator, false, currentLang)}&lt;/span&gt; |
| 145 | 149 | &lt;span className="font-medium text-muted"&gt;{order.packValidity}&lt;/span&gt; | &lt;span className="font-medium text-muted"&gt;{localizeCustomerText(formatStoredDuration(order.packValidity, currentLang), currentLang)}&lt;/span&gt; |
| 148 | 152 | &lt;span className="text-muted"&gt;Payment Mode&lt;/span&gt; | &lt;span className="text-muted"&gt;{translations[currentLang].uiPaymentMode}&lt;/span&gt; |
| 149 | 153 | &lt;span className="font-medium text-muted"&gt;{order.paymentMethod}&lt;/span&gt; | &lt;span className="font-medium text-muted"&gt;{paymentMethodLabel(order.paymentMethod, currentLang)}&lt;/span&gt; |
| 155 | 159 | &lt;p className="text-muted"&gt;GSTIN: {BUSINESS_DETAILS.gstin}&lt;/p&gt; | &lt;p className="text-muted"&gt;{t.uiGSTIN}: {businessDetails(currentLang).gstin}&lt;/p&gt; |
| 156 | 160 | &lt;p className="text-muted"&gt;{BUSINESS_DETAILS.feesAndTaxes}&lt;/p&gt; | &lt;p className="text-muted"&gt;{businessDetails(currentLang).feesAndTaxes}&lt;/p&gt; |
| 159 | 163 | &lt;span className="tabular-nums text-accent"&gt;₹{order.amount}&lt;/span&gt; | &lt;span className="tabular-nums text-accent"&gt;{formatPrice(order.amount, currentLang)}&lt;/span&gt; |

## src/components/RechargeFlow.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { formatMessage, localizeCustomerError } from '../lib/customerMessages'; |
| 4 | 5 | import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, validateCatalogPack } from '../lib/catalog'; | import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, formatCatalogIssues, validateCatalogPack } from '../lib/catalog'; |
| 5 | 6 | import { subscriberError, subscriberHelp, subscriberRule, normalizeSubscriberId } from '../lib/subscriberValidation'; | import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../lib/subscriberValidation'; |
| 208 | -- | const handleQuickCardFill = (sampleId: string) =&gt; { | -- |
| 209 | -- | setSmartCardNumber(sampleId); | -- |
| 210 | -- | setValidationError(null); | -- |
| 211 | -- | }; | -- |
| 236 | 234 | const chooseDurationLabel = currentLang === 'ta' ? 'கிடைக்கும் காலத்தைத் தேர்ந்தெடுக்கவும்' : 'Choose an available duration'; | const chooseDurationLabel = translations[currentLang].uiChooseAnAvailableDuration; |
| 266 | 264 | currentLang === 'ta' | translations[currentLang].uiNoCatalogPackIsAvailableForThisOperatorChooseACustomTopUpInstead |
| 267 | -- | ? 'இந்த இயக்குநருக்கான திட்டம் இல்லை. விருப்பத் தொகை ரீசார்ஜைத் தேர்ந்தெடுக்கவும்.' | -- |
| 268 | -- | : 'No catalog pack is available for this operator. Choose a custom top-up instead.' | -- |
| 293 | 289 | name: &#96;${provider.name} Custom Top-Up ₹${amountNum}&#96;, | name: &#96;${provider.name} ${t.customPack} ${formatPrice(amountNum, currentLang)}&#96;, |
| 306 | 302 | name: &#96;${provider.name} ${activePlan.plan_name} (${activePlan.duration_months}M)&#96;, | name: &#96;${provider.name} ${activePlan.plan_name} (${formatDuration(activePlan.duration_months, currentLang)})&#96;, |
| 316 | 312 | description: &#96;${activePlan.pack_type} pack for ${activePlan.duration_months} Month(s)&#96;, | description: &#96;${activePlan.pack_type} pack for ${formatDuration(activePlan.duration_months, currentLang)}&#96;, |
| 344 | 340 | {currentLang === 'ta' ? ( | {t.heroHeading} |
| 345 | -- | &lt;&gt; | -- |
| 346 | -- | அனைத்து &lt;span className={currentTheme.heroTitleHighlight}&gt;டிடிஎச் ரீசார்ஜ்&lt;/span&gt; தளம் | -- |
| 347 | -- | &lt;/&gt; | -- |
| 348 | -- | ) : ( | -- |
| 349 | -- | &lt;&gt; | -- |
| 350 | -- | Recharge your DTH connection | -- |
| 351 | -- | &lt;/&gt; | -- |
| 352 | -- | )} | -- |
| 356 | 344 | {currentLang === 'ta' | {t.heroDescription} |
| 357 | -- | ? 'சன் டைரக்ட், டாடா பிளே, ஏர்டெல், டிஷ் டிவி மற்றும் டி2எச் பேக்குகளையும் சந்தாதாரர் விவரங்களையும் சரிபார்த்து கோரிக்கையைத் தொடருங்கள்.' | -- |
| 358 | -- | : 'Review operator packs and subscriber details before submitting a DTH recharge request.'} | -- |
| 364 | 350 | &lt;span className="font-medium"&gt;{currentLang === 'ta' ? 'பேக் விவரங்கள்' : 'Pack details'}&lt;/span&gt; | &lt;span className="font-medium"&gt;{t.instantActivation}&lt;/span&gt; |
| 368 | 354 | &lt;span className="font-medium"&gt;{currentLang === 'ta' ? 'எண் வடிவச் சரிபார்ப்பு' : 'ID format checks'}&lt;/span&gt; | &lt;span className="font-medium"&gt;{t.secureEncryption}&lt;/span&gt; |
| 375 | 361 | &lt;HeroIllustrativeGraphic theme={currentTheme} /&gt; | &lt;HeroIllustrativeGraphic theme={currentTheme} currentLang={currentLang} /&gt; |
| 472 | 458 | &lt;span&gt;{t.enterCardNumber.replace(/^\d+\.\s*/, '')}&lt;/span&gt; | &lt;span&gt;{subscriberLabel(selectedOpId, true, currentLang)}&lt;/span&gt; |
| 489 | 475 | placeholder={subscriberRule(selectedOpId, true).placeholder} | placeholder={subscriberPlaceholder(selectedOpId, true, currentLang)} |
| 492 | 478 | aria-label={&#96;${currentOp.name} ${currentOp.cardName}&#96;} | aria-label={&#96;${currentOp.name} ${subscriberLabel(selectedOpId, true, currentLang)}&#96;} |
| 495 | -- | &lt;/div&gt; | -- |
| 497 | -- | {/* Helper quick fill */} | -- |
| 498 | -- | &lt;div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1"&gt; | -- |
| 499 | -- | &lt;span className={&#96;flex items-center gap-1.5 ${currentTheme.subText}&#96;}&gt; | -- |
| 500 | -- | &lt;Info className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} /&gt; | -- |
| 501 | -- | &lt;span&gt;{t.sampleCard}&lt;/span&gt; | -- |
| 502 | -- | &lt;button | -- |
| 503 | -- | type="button" | -- |
| 504 | -- | onClick={() =&gt; handleQuickCardFill(currentOp.sampleId \|\| currentOp.sampleSmartCard \|\| '')} | -- |
| 505 | -- | className="hover:underline font-mono font-bold" | -- |
| 506 | -- | style={{ color: currentTheme.primaryColor }} | -- |
| 507 | -- | &gt; | -- |
| 508 | -- | {currentOp.sampleId \|\| currentOp.sampleSmartCard} | -- |
| 509 | -- | &lt;/button&gt; | -- |
| 510 | -- | &lt;/span&gt; | -- |
| 516 | 486 | &lt;span id="subscriber-error" role="alert" className="font-medium"&gt;{validationError}&lt;/span&gt; | &lt;span id="subscriber-error" role="alert" className="font-medium"&gt;{subscriberError(selectedOpId, smartCardNumber, true, currentLang) \|\| localizeCustomerError(validationError, currentLang)}&lt;/span&gt; |
| 536 | 506 | &lt;div className="pack-view-toggle" role="group" aria-label={currentLang === 'ta' ? '???? ??????' : 'Pack view'}&gt; | &lt;div className="pack-view-toggle" role="group" aria-label={translations[currentLang].uiPackView}&gt; |
| 565 | 535 | &lt;span className="font-medium"&gt;{catalogError}&lt;/span&gt; | &lt;span className="font-medium"&gt;{localizeCustomerError(catalogError, currentLang)}&lt;/span&gt; |
| -- | 593 | -- | currentLang={currentLang} |
| 640 | 611 | (currentLang === 'ta' ? 'எச்டி பேக் கிடைக்கவில்லை' : 'HD pack unavailable'))} | (translations[currentLang].uiHDPackUnavailable))} |
| 643 | 614 | {recHDPlan && validateCatalogPack(recHDPlan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;Catalog details need review: {validateCatalogPack(recHDPlan).map(issue =&gt; issue.message).join(" ")}&lt;/p&gt;} | {recHDPlan && validateCatalogPack(recHDPlan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(recHDPlan, currentLang)}&lt;/p&gt;} |
| 651 | 622 | aria-label="Select HD duration" | aria-label={translations[currentLang].uiSelectHDDuration} |
| 682 | 653 | {recHDPlan ? formatDuration(recHDPlan.duration_months, currentLang) : (currentLang === 'ta' ? 'இந்த காலத்திற்கு திட்டம் இல்லை' : &#96;No ${hdDuration}-month plan available&#96;)} | {recHDPlan ? formatDuration(recHDPlan.duration_months, currentLang) : &#96;${t.uiUnavailable}: ${formatDuration(hdDuration, currentLang)}&#96;} |
| 687 | 658 | : hasHDOptions ? '' : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')} | : hasHDOptions ? '' : (translations[currentLang].uiUnavailable)} |
| 745 | 716 | ? (selectedPackType === 'HD' ? 'Selected' : t.selectThisPack) | ? (selectedPackType === 'HD' ? t.selectedAction : t.selectThisPack) |
| 746 | 717 | : hasHDOptions ? chooseDurationLabel : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')} | : hasHDOptions ? chooseDurationLabel : (translations[currentLang].uiUnavailable)} |
| -- | 725 | -- | currentLang={currentLang} |
| 771 | 743 | (currentLang === 'ta' ? 'எஸ்டி பேக் கிடைக்கவில்லை' : 'SD pack unavailable'))} | (translations[currentLang].uiSDPackUnavailable))} |
| 774 | 746 | {recSDPlan && validateCatalogPack(recSDPlan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;Catalog details need review: {validateCatalogPack(recSDPlan).map(issue =&gt; issue.message).join(" ")}&lt;/p&gt;} | {recSDPlan && validateCatalogPack(recSDPlan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(recSDPlan, currentLang)}&lt;/p&gt;} |
| 782 | 754 | aria-label="Select SD duration" | aria-label={translations[currentLang].uiSelectSDDuration} |
| 816 | 788 | {recSDPlan ? formatDuration(recSDPlan.duration_months, currentLang) : (currentLang === 'ta' ? 'இந்த காலத்திற்கு திட்டம் இல்லை' : &#96;No ${sdDuration}-month plan available&#96;)} | {recSDPlan ? formatDuration(recSDPlan.duration_months, currentLang) : &#96;${t.uiUnavailable}: ${formatDuration(sdDuration, currentLang)}&#96;} |
| 821 | 793 | : hasSDOptions ? '' : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')} | : hasSDOptions ? '' : (translations[currentLang].uiUnavailable)} |
| 879 | 851 | ? (selectedPackType === 'SD' ? 'Selected' : t.selectThisPack) | ? (selectedPackType === 'SD' ? t.selectedAction : t.selectThisPack) |
| 880 | 852 | : hasSDOptions ? chooseDurationLabel : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')} | : hasSDOptions ? chooseDurationLabel : (translations[currentLang].uiUnavailable)} |
| -- | 860 | -- | currentLang={currentLang} |
| 903 | 876 | {currentLang === 'ta' ? 'விருப்பத் தொகைக்கான நேரடி வாலட் ரீசார்ஜ்.' : 'Direct balance credit for any custom amount.'} | {t.customDescription} |
| 910 | 883 | &lt;span className="absolute left-3.5 top-2.5 font-bold text-base" style={{ color: currentTheme.packFlexibleBandBg }}&gt;₹&lt;/span&gt; | &lt;span className="absolute left-3.5 top-2.5 font-bold text-base" style={{ color: currentTheme.packFlexibleBandBg }}&gt;Rs. &lt;/span&gt; |
| 928 | 901 | className={&#96;w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl pl-9 pr-3 py-2 font-mono text-base font-bold border-2 focus:outline-none transition-colors shadow-inner&#96;} | className={&#96;w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl pl-14 pr-3 py-2 font-mono text-base font-bold border-2 focus:outline-none transition-colors shadow-inner&#96;} |
| 935 | 908 | &lt;p id="custom-amount-help" className="text-xs"&gt;{TOP_UP_LIMITS.min}–{TOP_UP_LIMITS.max.toLocaleString('en-IN')} INR; {TOP_UP_LIMITS.decimalPlaces} decimal places maximum.&lt;/p&gt; | &lt;p id="custom-amount-help" className="text-xs"&gt;{formatMessage(t.uiAmountHelp, { min: TOP_UP_LIMITS.min, max: TOP_UP_LIMITS.max.toLocaleString('en-IN'), decimals: TOP_UP_LIMITS.decimalPlaces })}&lt;/p&gt; |
| 938 | 911 | &lt;div className="grid grid-cols-5 gap-1.5" aria-label="Quick amount choices"&gt; | &lt;div className="grid grid-cols-5 gap-1.5" aria-label={translations[currentLang].uiQuickAmountChoices}&gt; |
| 959 | 932 | ₹{quick} | Rs. {quick} |
| 1005 | 978 | &lt;span&gt;{selectedPackType === 'CUSTOM' ? 'Selected' : t.customPack}&lt;/span&gt; | &lt;span&gt;{selectedPackType === 'CUSTOM' ? t.selectedAction : t.customPack}&lt;/span&gt; |
| 1020 | 993 | : &#96;${visibleBouquets.length} of ${operatorCatalog.length} packs&#96;} | : &#96;${formatMessage(t.uiPackCount, { shown: visibleBouquets.length, total: operatorCatalog.length })}&#96;} |
| 1022 | 995 | &lt;div className="bouquet-filters" aria-label="Pack filters"&gt; | &lt;div className="bouquet-filters" aria-label={translations[currentLang].uiPackFilters}&gt; |
| 1025 | 998 | &lt;div className="bouquet-filter-group" role="group" aria-label="Picture quality"&gt; | &lt;div className="bouquet-filter-group" role="group" aria-label={translations[currentLang].uiPictureQuality}&gt; |
| 1026 | 999 | {([['all', currentLang === 'ta' ? '?????????' : 'All'], ['HD', 'HD'], ['SD', 'SD']] as const).map(([value, label]) =&gt; ( | {([['all', translations[currentLang].uiAll], ['HD', 'HD'], ['SD', 'SD']] as const).map(([value, label]) =&gt; ( |
| 1073 | 1046 | {validateCatalogPack(plan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;Catalog details need review: {validateCatalogPack(plan).map(issue =&gt; issue.message).join(" ")}&lt;/p&gt;} | {validateCatalogPack(plan).length &gt; 0 && &lt;p className="text-error text-xs"&gt;{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(plan, currentLang)}&lt;/p&gt;} |
| 1080 | 1053 | &lt;button type="button" className="all-packs-select" aria-pressed={isSelected} aria-label={&#96;${isSelected ? 'Selected' : 'Select'} ${plan.plan_name}, ${plan.duration_months} months&#96;} | &lt;button type="button" className="all-packs-select" aria-pressed={isSelected} aria-label={&#96;${isSelected ? t.selectedAction : t.selectAction} ${currentLang === 'ta' ? plan.tamilName \|\| plan.plan_name : plan.plan_name}, ${formatDuration(plan.duration_months, currentLang)}&#96;} |
| 1082 | 1055 | {isSelected && &lt;CheckCircle2 className="w-4 h-4" /&gt;}{isSelected ? (currentLang === 'ta' ? t.selectThisPack : 'Selected') : t.selectThisPack} | {isSelected && &lt;CheckCircle2 className="w-4 h-4" /&gt;}{isSelected ? t.selectedAction : t.selectThisPack} |
| 1118 | 1091 | ({selectedPackType === 'CUSTOM' ? t.customPack : &#96;${activePlan?.pack_type \|\| selectedPackType} Pack • ${activePlan?.duration_months \|\| (selectedPackType === 'HD' ? hdDuration : sdDuration)}M&#96;}) | ({selectedPackType === 'CUSTOM' ? t.customPack : &#96;${activePlan?.pack_type \|\| selectedPackType} Pack • ${formatDuration(activePlan?.duration_months \|\| (selectedPackType === 'HD' ? hdDuration : sdDuration), currentLang)}&#96;}) |

## src/components/SavedConnections.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 1 | 1 | import { subscriberError, subscriberHelp, subscriberRule, normalizeSubscriberId } from '../lib/subscriberValidation'; | import { formatMessage } from '../lib/customerMessages'; |
| -- | 2 | -- | import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../lib/subscriberValidation'; |
| 83 | 84 | nickname: nickname \|\| 'Living Room DTH', | nickname: nickname \|\| t.uiSetTopBox, |
| 111 | 112 | {currentLang === 'ta' | {translations[currentLang].uiManageYourSavedSetTopBoxesAndRechargeThemQuickly} |
| 112 | -- | ? 'உங்கள் வீட்டில் உள்ள அனைத்து செட்-டாப் பாக்ஸ்களையும் நிர்வகிக்கவும் மற்றும் 1-கிளிக் ரீசார்ஜ் செய்யவும்.' | -- |
| 113 | -- | : 'Manage your saved Set-Top Boxes and recharge them quickly.'} | -- |
| 173 | 172 | if (window.confirm(&#96;Remove \u201c${conn.nickname}\u201d from your saved boxes?&#96;)) onDeleteConnection(conn.id); | if (window.confirm(formatMessage(t.uiConfirmRemoveBox, { name: conn.nickname }))) onDeleteConnection(conn.id); |
| 175 | 174 | aria-label={&#96;Remove ${conn.nickname}&#96;} | aria-label={formatMessage(t.uiRemoveNamedBox, { name: conn.nickname })} |
| 177 | 176 | title="Remove Connection" | title={translations[currentLang].uiRemoveConnection} |
| 186 | 185 | &lt;span className={&#96;text-xs font-medium block ${currentTheme.mutedText}&#96;}&gt;Balance&lt;/span&gt; | &lt;span className={&#96;text-xs font-medium block ${currentTheme.mutedText}&#96;}&gt;{translations[currentLang].uiBalance}&lt;/span&gt; |
| 188 | 187 | {typeof conn.balance === 'number' ? &#96;₹${conn.balance.toFixed(2)}&#96; : 'Not available'} | {typeof conn.balance === 'number' ? &#96;Rs. ${conn.balance.toFixed(2)}&#96; : translations[currentLang].uiNotAvailable} |
| 193 | 192 | &lt;span className={&#96;text-xs font-medium block ${currentTheme.mutedText}&#96;}&gt;Expiry&lt;/span&gt; | &lt;span className={&#96;text-xs font-medium block ${currentTheme.mutedText}&#96;}&gt;{translations[currentLang].uiExpiry}&lt;/span&gt; |
| 195 | 194 | {expiryDate!.toLocaleDateString(currentLang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} | {expiryDate!.toLocaleDateString(translations[currentLang].uiEnIN, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} |
| 197 | 196 | &lt;span className={&#96;text-xs font-semibold ${expired ? 'text-error' : 'text-success'}&#96;}&gt;{expired ? 'Expired' : 'Active'}&lt;/span&gt; | &lt;span className={&#96;text-xs font-semibold ${expired ? 'text-error' : 'text-success'}&#96;}&gt;{expired ? translations[currentLang].uiExpired : translations[currentLang].uiActive}&lt;/span&gt; |
| 205 | 204 | &lt;span className={currentTheme.mutedText}&gt;Current pack&lt;/span&gt; | &lt;span className={currentTheme.mutedText}&gt;{translations[currentLang].uiCurrentPack}&lt;/span&gt; |
| 218 | 217 | }}&gt;Edit&lt;/button&gt; | }}&gt;{translations[currentLang].uiEdit}&lt;/button&gt; |
| 245 | 244 | {currentLang === 'ta' ? 'சேமிக்கப்பட்ட செட்-டாப் பாக்ஸ்கள் இல்லை' : 'No Saved Set-Top Boxes'} | {translations[currentLang].uiNoSavedSetTopBoxes} |
| 311 | 310 | &lt;option value="sun_direct"&gt;Sun Direct (சன் டைரக்ட்)&lt;/option&gt; | &lt;option value="sun_direct"&gt;{t.uiSunDirect}&lt;/option&gt; |
| 312 | 311 | &lt;option value="tata_play"&gt;Tata Play (டாடா பிளே)&lt;/option&gt; | &lt;option value="tata_play"&gt;{t.uiTataPlay}&lt;/option&gt; |
| 313 | 312 | &lt;option value="airtel_dth"&gt;Airtel Digital TV (ஏர்டெல்)&lt;/option&gt; | &lt;option value="airtel_dth"&gt;{t.uiAirtel}&lt;/option&gt; |
| 314 | 313 | &lt;option value="dish_tv"&gt;Dish TV & D2H (டிஷ் டிவி)&lt;/option&gt; | &lt;option value="dish_tv"&gt;{t.uiDishD2h}&lt;/option&gt; |
| 320 | 319 | {subscriberRule(operator, true).label} | {subscriberLabel(operator, true, currentLang)} |
| 329 | 328 | placeholder={subscriberRule(operator, true).placeholder} | placeholder={subscriberPlaceholder(operator, true, currentLang)} |

## src/components/SecurityNotice.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { translations } from '../lib/translations'; |
| -- | 2 | -- | import type { Language } from '../types'; |
| -- | 9 | -- | currentLang?: Language; |
| 9 | 12 | const THREAT_ROWS = [ | const THREAT_ROWS = (t: typeof translations.en) =&gt; [ |
| 11 | 14 | zone: 'Input surfaces', | zone: t.uiSecurityInputSurfaces, |
| 12 | 15 | vectors: 'Invalid smart-card characters, injection attempts, oversized uploads', | vectors: t.uiSecurityInvalidSmartCardCharactersInjectionAttemptsOversizedUploads, |
| 13 | 16 | controls: 'Operator-specific input validation, request schemas, and upload limits', | controls: t.uiSecurityOperatorSpecificInputValidationRequestSchemasAndUploadLimits, |
| 17 | 20 | zone: 'Planning and reasoning', | zone: t.uiSecurityPlanningAndReasoning, |
| 18 | 21 | vectors: 'Instruction override and indirect injection from external inputs', | vectors: t.uiSecurityInstructionOverrideAndIndirectInjectionFromExternalInputs, |
| 19 | 22 | controls: 'Data-only deserialization, contextual state validation, and fixed allowed operators', | controls: t.uiSecurityDataOnlyDeserializationContextualStateValidationAndFixedAllowedOp, |
| 23 | 26 | zone: 'Tool execution', | zone: t.uiSecurityToolExecution, |
| 24 | 27 | vectors: 'Privilege escalation, unauthorized order updates, transponder flooding', | vectors: t.uiSecurityPrivilegeEscalationUnauthorizedOrderUpdatesTransponderFlooding, |
| 25 | 28 | controls: 'Rate limits on sensitive operations and verified Firebase ID tokens', | controls: t.uiSecurityRateLimitsOnSensitiveOperationsAndVerifiedFirebaseIDTokens, |
| 29 | 32 | zone: 'Memory and state', | zone: t.uiSecurityMemoryAndState, |
| 30 | 33 | vectors: 'Cross-tenant data access, unauthorized overwrites, undefined values', | vectors: t.uiSecurityCrossTenantDataAccessUnauthorizedOverwritesUndefinedValues, |
| 31 | 34 | controls: 'Owner-bound Firestore paths, access rules, and payload sanitization', | controls: t.uiSecurityOwnerBoundFirestorePathsAccessRulesAndPayloadSanitization, |
| 32 | 35 | standard: 'Firestore rules', | standard: t.uiSecurityFirestoreRules, |
| 35 | 38 | zone: 'Inter-system communication', | zone: t.uiSecurityInterSystemCommunication, |
| 36 | 39 | vectors: 'API-key leakage and hardcoded credentials', | vectors: t.uiSecurityAPIKeyLeakageAndHardcodedCredentials, |
| 37 | 40 | controls: 'Server-side API proxies and environment-based secret injection', | controls: t.uiSecurityServerSideAPIProxiesAndEnvironmentBasedSecretInjection, |
| 42 | 45 | export const SecurityNotice: React.FC&lt;SecurityNoticeProps&gt; = ({ currentTheme }) =&gt; { | export const SecurityNotice: React.FC&lt;SecurityNoticeProps&gt; = ({ currentTheme, currentLang = 'en' }) =&gt; { |
| -- | 46 | -- | const t = translations[currentLang]; |
| 61 | 65 | &lt;h1 className={&#96;text-lg sm:text-xl font-bold ${primaryText}&#96;}&gt;Security controls overview&lt;/h1&gt; | &lt;h1 className={&#96;text-lg sm:text-xl font-bold ${primaryText}&#96;}&gt;{t.uiSecuritySecurityControlsOverview}&lt;/h1&gt; |
| 63 | 67 | A summary of security controls described for this application. | {t.uiSecurityASummaryOfSecurityControlsDescribedForThisApplication} |
| 71 | 75 | 5 control areas | {t.uiSecurity5ControlAreas} |
| 76 | 80 | {THREAT_ROWS.map((row) =&gt; ( | {THREAT_ROWS(t).map((row) =&gt; ( |
| 84 | 88 | &lt;p className={&#96;text-sm leading-relaxed ${mutedText}&#96;}&gt;&lt;strong&gt;Risk:&lt;/strong&gt; {row.vectors}&lt;/p&gt; | &lt;p className={&#96;text-sm leading-relaxed ${mutedText}&#96;}&gt;&lt;strong&gt;{t.uiSecurityRisk}&lt;/strong&gt; {row.vectors}&lt;/p&gt; |
| 85 | 89 | &lt;p className={&#96;text-sm leading-relaxed ${mutedText}&#96;}&gt;&lt;strong&gt;Controls:&lt;/strong&gt; {row.controls}&lt;/p&gt; | &lt;p className={&#96;text-sm leading-relaxed ${mutedText}&#96;}&gt;&lt;strong&gt;{t.uiSecurityControls}&lt;/strong&gt; {row.controls}&lt;/p&gt; |
| 94 | 98 | &lt;th className="px-4 py-3 font-medium"&gt;Control area&lt;/th&gt; | &lt;th className="px-4 py-3 font-medium"&gt;{t.uiSecurityControlArea}&lt;/th&gt; |
| 95 | 99 | &lt;th className="px-4 py-3 font-medium"&gt;Example risks&lt;/th&gt; | &lt;th className="px-4 py-3 font-medium"&gt;{t.uiSecurityExampleRisks}&lt;/th&gt; |
| 96 | 100 | &lt;th className="px-4 py-3 font-medium"&gt;Described controls&lt;/th&gt; | &lt;th className="px-4 py-3 font-medium"&gt;{t.uiSecurityDescribedControls}&lt;/th&gt; |
| 97 | 101 | &lt;th className="px-4 py-3 font-medium"&gt;Reference&lt;/th&gt; | &lt;th className="px-4 py-3 font-medium"&gt;{t.uiSecurityReference}&lt;/th&gt; |
| 101 | 105 | {THREAT_ROWS.map((row) =&gt; ( | {THREAT_ROWS(t).map((row) =&gt; ( |
| 119 | 123 | Credential handling | {t.uiSecurityCredentialHandling} |
| 122 | 126 | The project describes server-side environment configuration for sensitive credentials. | {t.uiSecurityTheProjectDescribesServerSideEnvironmentConfigurationForSensitive} |
| 128 | 132 | Data access | {t.uiSecurityDataAccess} |
| 131 | 135 | Firestore rules define access for customer connections and administrative data. | {t.uiSecurityFirestoreRulesDefineAccessForCustomerConnectionsAndAdministrative} |
| 137 | 141 | Server requests | {t.uiSecurityServerRequests} |
| 140 | 144 | Server routes validate request bodies and sanitize selected Firestore payloads. | {t.uiSecurityServerRoutesValidateRequestBodiesAndSanitizeSelectedFirestorePayl} |
| 146 | 150 | This page summarizes project documentation; it is not an independent security assessment. Effective protection depends on deployment and configuration. | {t.uiSecurityThisPageSummarizesProjectDocumentationItIsNotAnIndependentSecurit} |

## src/components/TrustContent.tsx

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { businessDetails } from '../lib/policyTranslations'; |
| -- | 2 | -- | import { translations } from '../lib/translations'; |
| 7 | 9 | return &lt;nav aria-label={currentLang === 'ta' ? 'உதவி மற்றும் கொள்கைகள்' : 'Support and policies'} className="flex flex-wrap gap-x-5 gap-y-3 text-sm"&gt; | return &lt;nav aria-label={translations[currentLang].uiSupportAndPolicies} className="flex flex-wrap gap-x-5 gap-y-3 text-sm"&gt; |
| -- | 16 | -- | const details = businessDetails(currentLang); |
| 15 | 18 | [ta ? 'வணிகப் பெயர்' : 'Business name', BUSINESS_DETAILS.legalName], | [translations[currentLang].uiBusinessName, details.legalName], |
| 16 | 19 | [ta ? 'உதவி தொலைபேசி' : 'Support phone', BUSINESS_DETAILS.phone], | [translations[currentLang].uiSupportPhone, details.phone], |
| 17 | 20 | [ta ? 'உதவி மின்னஞ்சல்' : 'Support email', BUSINESS_DETAILS.email], | [translations[currentLang].uiSupportEmail, details.email], |
| 18 | 21 | [ta ? 'உதவி நேரம்' : 'Support hours', BUSINESS_DETAILS.supportHours], | [translations[currentLang].uiSupportHours, details.supportHours], |
| 19 | 22 | ...(full ? [[ta ? 'முகவரி' : 'Address', BUSINESS_DETAILS.address], ['GSTIN', BUSINESS_DETAILS.gstin], | ...(full ? [[translations[currentLang].uiAddress, details.address], [translations[currentLang].uiGSTIN, details.gstin], |
| 20 | 23 | [ta ? 'குறைதீர் அதிகாரி' : 'Grievance officer', BUSINESS_DETAILS.grievanceOfficer], | [translations[currentLang].uiGrievanceOfficer, details.grievanceOfficer], |
| 21 | 24 | [ta ? 'குறைதீர் மின்னஞ்சல்' : 'Grievance email', BUSINESS_DETAILS.grievanceEmail], | [translations[currentLang].uiGrievanceEmail, details.grievanceEmail], |
| 22 | 25 | [ta ? 'குறைதீர் முகவரி' : 'Grievance address', BUSINESS_DETAILS.grievanceAddress]] : []), | [translations[currentLang].uiGrievanceAddress, details.grievanceAddress]] : []), |
| 28 | 31 | return &lt;section aria-label={currentLang === 'ta' ? 'கட்டண விதிமுறைகள் மற்றும் உதவி' : 'Payment terms and support'} className="space-y-3 border-t border-rule pt-4 text-sm"&gt; | return &lt;section aria-label={translations[currentLang].uiPaymentTermsAndSupport} className="space-y-3 border-t border-rule pt-4 text-sm"&gt; |
| 29 | 32 | &lt;p&gt;{currentLang === 'ta' ? 'பணம் செலுத்துவதன் மூலம் பயன்பாட்டு விதிமுறைகளையும் பணத்திருப்பல் கொள்கையையும் ஏற்கிறீர்கள். தனியுரிமைக் கொள்கையையும் படிக்கவும்.' : 'By paying you agree to the Terms of Use and Refund & Cancellation Policy. Please also read the Privacy Policy.'}&lt;/p&gt; | &lt;p&gt;{translations[currentLang].uiByPayingYouAgreeToTheTermsOfUseAndRefundCancellationPolicyPleaseAlsoRe}&lt;/p&gt; |

## src/lib/catalog.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 38 | 38 | if (/\b\d+\b/.test(unlabeled)) add('plan_name', 'Unlabelled number in pack name needs review; specify HD/channels, months/years or INR so it can be checked.'); | if (/\b\d+\b/.test(unlabeled)) add('plan_name', 'Unlabelled number in pack name needs review; specify HD/channels, months/years or Rs. so it can be checked.'); |
| 50 | 50 | return Number.isFinite(amount) && amount &gt; 0 ? new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount) : 'Price needs review'; | return Number.isFinite(amount) && amount &gt; 0 ? &#96;Rs. ${new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}&#96; : translations[lang].uiPriceNeedsReview; |
| 54 | 54 | return Number.isFinite(value) ? &#96;${formatPrice(value, lang)} ${translations[lang].perMonth}&#96; : 'Monthly price needs review'; | return Number.isFinite(value) ? &#96;${formatPrice(value, lang)} ${translations[lang].perMonth}&#96; : translations[lang].uiMonthlyPriceNeedsReview; |
| 57 | 57 | return (VALID_DURATIONS as readonly number[]).includes(duration) ? &#96;${duration} ${duration === 1 ? translations[lang].month : translations[lang].months}&#96; : 'Duration needs review'; | return (VALID_DURATIONS as readonly number[]).includes(duration) ? &#96;${duration} ${duration === 1 ? translations[lang].month : translations[lang].months}&#96; : translations[lang].uiDurationNeedsReview; |
| -- | 58 | -- | } |
| -- | 59 | -- | export function formatStoredDuration(value: string, lang: Language = 'en'): string { |
| -- | 60 | -- | const match = /^(\d+)\s*(?:m\|months?)$/i.exec(value.trim()); |
| -- | 61 | -- | return match && (VALID_DURATIONS as readonly number[]).includes(Number(match[1])) ? formatDuration(Number(match[1]), lang) : value; |
| -- | 62 | -- | } |
| -- | 63 | -- | export function formatCatalogIssues(pack: PackFields, lang: Language = 'en'): string { |
| -- | 64 | -- | const issues = validateCatalogPack(pack); |
| -- | 65 | -- | if (lang === 'en') return issues.map(issue =&gt; issue.message).join(' '); |
| -- | 66 | -- | const t = translations[lang]; |
| -- | 67 | -- | const messages: Record&lt;string, string&gt; = { channel_count: t.uiCatalogTotalError, hd_channel_count: t.uiCatalogHdError, plan_name: t.uiCatalogNameError, amount: t.uiCatalogPriceError, price: t.uiCatalogPriceError, duration_months: t.uiCatalogDurationError }; |
| -- | 68 | -- | return [...new Set(issues.map(issue =&gt; messages[issue.field] \|\| t.uiCatalogReview))].join(' '); |
| 61 | 72 | if (issues.length) return 'Channel details need review'; | if (issues.length) return translations[lang].uiChannelDetailsNeedReview; |
| 62 | 73 | if (pack.channel_counts_unavailable) return lang === 'ta' ? 'சேனல் விவரங்கள் வழங்கப்படவில்லை' : 'Channel details not provided'; | if (pack.channel_counts_unavailable) return translations[lang].uiChannelDetailsNotProvided; |

## src/lib/catalogAvailability.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { customerMessages, formatMessage } from './customerMessages'; |
| 8 | 9 | const range = &#96;₹${TOP_UP_LIMITS.min}–₹${TOP_UP_LIMITS.max.toLocaleString('en-IN')}&#96;; | const range = &#96;Rs. ${TOP_UP_LIMITS.min}–Rs. ${TOP_UP_LIMITS.max.toLocaleString('en-IN')}&#96;; |
| 9 | 10 | return lang === 'ta' ? &#96;${names[operator]} பேக்குகள் இங்கு இல்லை. ${range} வரம்பில் விருப்பத் தொகையைத் தேர்ந்தெடுக்கலாம்.&#96; : &#96;${names[operator]} ${operator === 'dish_tv' \|\| operator === 'd2h' ? "don't" : "doesn't"} have catalog packs here. You can choose a custom top-up from ${range} instead.&#96;; | return formatMessage(customerMessages[lang].uiNoCatalogPacks, { operator: names[operator], range }); |

## src/lib/customerMessages.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | // Customer copy. All Tamil values below are drafts requiring native-speaker review. |
| -- | 2 | -- | const pairs = { |
| -- | 3 | -- | uiPackView: ["Pack view", "பேக்குகளைக் காணும் முறை"], // Native Tamil review required. |
| -- | 4 | -- | uiAll: ["All", "அனைத்தும்"], // Native Tamil review required. |
| -- | 5 | -- | uiSelectHDDuration: ["Select HD duration", "HD பேக்கின் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required. |
| -- | 6 | -- | uiSelectSDDuration: ["Select SD duration", "SD பேக்கின் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required. |
| -- | 7 | -- | uiQuickAmountChoices: ["Quick amount choices", "தொகையைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required. |
| -- | 8 | -- | uiPackFilters: ["Pack filters", "பேக் வடிகட்டல்கள்"], // Native Tamil review required. |
| -- | 9 | -- | uiPictureQuality: ["Picture quality", "படத் தரம்"], // Native Tamil review required. |
| -- | 10 | -- | uiChooseAnAvailableDuration: ["Choose an available duration", "கிடைக்கும் காலத்தைத் தேர்ந்தெடுக்கவும்"], // Native Tamil review required. |
| -- | 11 | -- | uiHDPackUnavailable: ["HD pack unavailable", "HD பேக் தற்போது கிடைக்கவில்லை"], // Native Tamil review required. |
| -- | 12 | -- | uiSDPackUnavailable: ["SD pack unavailable", "SD பேக் தற்போது கிடைக்கவில்லை"], // Native Tamil review required. |
| -- | 13 | -- | uiNoCatalogPackIsAvailableForThisOperatorChooseACustomTopUpInstead: ["No catalog pack is available for this operator. Choose a custom top-up instead.", "இந்த ஆபரேட்டருக்கான பேக்குகள் இங்கு இல்லை. உங்கள் விருப்பத் தொகையில் ரீசார்ஜ் செய்யலாம்."], // Native Tamil review required. |
| -- | 14 | -- | uiClearFilters: ["Clear filters", "வடிகட்டல்களை நீக்கவும்"], // Native Tamil review required. |
| -- | 15 | -- | uiHighDefinitionPacks: ["High Definition packs", "உயர் படத் தர பேக்குகள்"], // Native Tamil review required. |
| -- | 16 | -- | uiStandardDefinitionPacks: ["Standard Definition packs", "சாதாரண படத் தர பேக்குகள்"], // Native Tamil review required. |
| -- | 17 | -- | uiSaveThisConnectionForFasterRecharges: ["Save this connection for faster recharges", "அடுத்த முறை ரீசார்ஜ் செய்ய இந்த இணைப்பைச் சேமிக்கவும்"], // Native Tamil review required. |
| -- | 18 | -- | uiRemoveFromCompare: ["Remove from compare", "ஒப்பீட்டிலிருந்து நீக்கவும்"], // Native Tamil review required. |
| -- | 19 | -- | uiRemoveFromComparison: ["Remove from comparison", "ஒப்பீட்டிலிருந்து நீக்கவும்"], // Native Tamil review required. |
| -- | 20 | -- | uiPleaseSelectACompatibleSetTopBox: ["Please select a compatible Set-Top Box.", "இந்த ஆபரேட்டருக்கான செட்-டாப் பாக்ஸைத் தேர்ந்தெடுக்கவும்."], // Native Tamil review required. |
| -- | 21 | -- | uiSelectSavedBox: ["Select Saved Box:", "சேமித்த பெட்டியைத் தேர்ந்தெடுக்கவும்:"], // Native Tamil review required. |
| -- | 22 | -- | uiMockQRIllustrationCannotBeScannedOrPaid: ["Mock QR illustration - cannot be scanned or paid", "இது சோதனை QR படம் மட்டுமே. இதை ஸ்கேன் செய்து பணம் செலுத்த முடியாது."], // Native Tamil review required. |
| -- | 23 | -- | uiProviderQRIsUnavailableRetryCheckoutToRequestAProviderOrder: ["Provider QR is unavailable. Retry checkout to request a provider order.", "கட்டணச் சேவையின் QR தற்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 24 | -- | uiMockCardPaymentNoCardNumberExpiryOrCVVIsRequiredUseTheTestControlsBelo: ["Mock card payment. No card number, expiry or CVV is required. Use the test controls below.", "இது சோதனைக் கார்டு கட்டணம் மட்டுமே. கார்டு எண், காலாவதி தேதி அல்லது CVV தேவையில்லை. கீழே உள்ள சோதனை வசதிகளைப் பயன்படுத்தவும்."], // Native Tamil review required. |
| -- | 25 | -- | uiCardPaymentsRequireTheProviderHostedCheckoutProviderUnavailableNoCardD: ["Card payments require the provider hosted checkout. Provider unavailable; no card details are collected.", "கார்டு கட்டணம் கட்டணச் சேவையின் பக்கத்தில் மட்டுமே நடைபெறும். அந்தச் சேவை தற்போது கிடைக்கவில்லை; கார்டு விவரங்கள் எதுவும் பெறப்படாது."], // Native Tamil review required. |
| -- | 26 | -- | uiMockNetBankingNoBankLoginIsRequired: ["Mock net banking. No bank login is required.", "இது இணைய வங்கிச் சோதனை மட்டுமே. வங்கிக் கணக்கில் உள்நுழையத் தேவையில்லை."], // Native Tamil review required. |
| -- | 27 | -- | uiNetBankingRequiresTheProviderHostedCheckoutProviderUnavailable: ["Net banking requires the provider hosted checkout. Provider unavailable.", "இணைய வங்கிக் கட்டணத்திற்கான சேவைப் பக்கம் தற்போது கிடைக்கவில்லை."], // Native Tamil review required. |
| -- | 28 | -- | uiCheckoutIsUnavailablePleaseRetry: ["Checkout is unavailable. Please retry.", "கட்டணப் பக்கம் தற்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 29 | -- | uiRequestTimedOutRetryToCheckTheSameTestSessionDoNotStartAnotherPayment: ["Request timed out. Retry to check the same test session; do not start another payment.", "கோரிக்கைக்கான நேரம் முடிந்துவிட்டது. இதே சோதனை அமர்வைச் சரிபார்க்க மீண்டும் முயற்சிக்கவும்; புதிய கட்டணம் தொடங்க வேண்டாம்."], // Native Tamil review required. |
| -- | 30 | -- | uiProviderOrderOrQRIsUnavailableNoPaymentHasBeenTaken: ["Provider order or QR is unavailable. No payment has been taken.", "கட்டண ஆர்டர் அல்லது QR கிடைக்கவில்லை. பணம் எதுவும் பெறப்படவில்லை."], // Native Tamil review required. |
| -- | 31 | -- | uiCheckoutUnavailablePleaseRetry: ["Checkout unavailable. Please retry.", "கட்டணப் பக்கம் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 32 | -- | uiCouldNotCheckTheTestPayment: ["Could not check the test payment.", "சோதனைக் கட்டணத்தின் நிலையைச் சரிபார்க்க முடியவில்லை."], // Native Tamil review required. |
| -- | 33 | -- | uiCompleteDTHRecharge: ["Complete DTH Recharge", "டிடிஎச் ரீசார்ஜைத் தொடரவும்"], // Native Tamil review required. |
| -- | 34 | -- | uiCloseCheckout: ["Close checkout", "கட்டணப் பக்கத்தை மூடவும்"], // Native Tamil review required. |
| -- | 35 | -- | uiTestModeNoRealPaymentWillBeTaken: ["Test mode - no real payment will be taken", "சோதனை முறை — உண்மையான பணம் எதுவும் பெறப்படாது"], // Native Tamil review required. |
| -- | 36 | -- | uiAwaitingServerQuote: ["Awaiting server quote", "சேவையகத்தின் கட்டண விவரங்களுக்காகக் காத்திருக்கிறது"], // Native Tamil review required. |
| -- | 37 | -- | uiTotalPayable: ["Total payable", "செலுத்த வேண்டிய மொத்தத் தொகை"], // Native Tamil review required. |
| -- | 38 | -- | uiPaymentProvider: ["Payment provider", "கட்டணச் சேவை"], // Native Tamil review required. |
| -- | 39 | -- | uiOrderReference: ["Order reference", "ஆர்டர் எண்"], // Native Tamil review required. |
| -- | 40 | -- | uiNoRealPaymentProviderConfigured: ["No real payment provider configured", "உண்மையான கட்டணச் சேவை இன்னும் அமைக்கப்படவில்லை"], // Native Tamil review required. |
| -- | 41 | -- | uiNotCreated: ["Not created", "இன்னும் உருவாக்கப்படவில்லை"], // Native Tamil review required. |
| -- | 42 | -- | uiCheckingCheckout: ["Checking checkout...", "கட்டண விவரங்கள் சரிபார்க்கப்படுகின்றன…"], // Native Tamil review required. |
| -- | 43 | -- | uiRetryCheckout: ["Retry checkout", "மீண்டும் முயற்சிக்கவும்"], // Native Tamil review required. |
| -- | 44 | -- | uiPaymentMethod: ["Payment method", "கட்டணம் செலுத்தும் முறை"], // Native Tamil review required. |
| -- | 45 | -- | uiDebitCreditCard: ["Debit / Credit Card", "டெபிட் / கிரெடிட் கார்டு"], // Native Tamil review required. |
| -- | 46 | -- | uiNetBanking: ["Net banking", "இணைய வங்கி"], // Native Tamil review required. |
| -- | 47 | -- | uiSessionExpiredGenerateANewQR: ["Session expired, generate a new QR.", "இந்த அமர்வின் நேரம் முடிந்துவிட்டது. புதிய QR உருவாக்கவும்."], // Native Tamil review required. |
| -- | 48 | -- | uiGenerateANewMockQR: ["Generate a new mock QR", "புதிய சோதனை QR உருவாக்கவும்"], // Native Tamil review required. |
| -- | 49 | -- | uiGenerateANewQR: ["Generate a new QR", "புதிய QR உருவாக்கவும்"], // Native Tamil review required. |
| -- | 50 | -- | uiTestSession: ["Test session", "சோதனை அமர்வு"], // Native Tamil review required. |
| -- | 51 | -- | uiTestResult: ["Test result", "சோதனை முடிவு"], // Native Tamil review required. |
| -- | 52 | -- | uiSuccess: ["Success", "வெற்றி"], // Native Tamil review required. |
| -- | 53 | -- | uiFailure: ["Failure", "தோல்வி"], // Native Tamil review required. |
| -- | 54 | -- | uiPending: ["Pending", "நிலுவையில் உள்ளது"], // Native Tamil review required. |
| -- | 55 | -- | uiSimulateTestPayment: ["Simulate test payment", "சோதனைக் கட்டணத்தை இயக்கவும்"], // Native Tamil review required. |
| -- | 56 | -- | uiTestPaymentSucceededNoRealPaymentOrRechargeWasMade: ["Test payment succeeded. No real payment or recharge was made.", "சோதனைக் கட்டணம் வெற்றியடைந்தது. உண்மையான கட்டணமோ ரீசார்ஜோ நடைபெறவில்லை."], // Native Tamil review required. |
| -- | 57 | -- | uiTestPaymentFailedNoMoneyWasTaken: ["Test payment failed. No money was taken.", "சோதனைக் கட்டணம் தோல்வியடைந்தது. பணம் எதுவும் பெறப்படவில்லை."], // Native Tamil review required. |
| -- | 58 | -- | uiTestPaymentPendingThisIsNotASuccessConfirmationNoRechargeHasStarted: ["Test payment pending. This is not a success confirmation; no recharge has started.", "சோதனைக் கட்டணம் நிலுவையில் உள்ளது. இது வெற்றி உறுதிப்படுத்தல் அல்ல; ரீசார்ஜ் தொடங்கப்படவில்லை."], // Native Tamil review required. |
| -- | 59 | -- | uiStartANewTestSession: ["Start a new test session", "புதிய சோதனை அமர்வைத் தொடங்கவும்"], // Native Tamil review required. |
| -- | 60 | -- | uiRemoveConnection: ["Remove Connection", "இணைப்பை நீக்கவும்"], // Native Tamil review required. |
| -- | 61 | -- | uiBalance: ["Balance", "இருப்பு"], // Native Tamil review required. |
| -- | 62 | -- | uiExpiry: ["Expiry", "முடிவுத் தேதி"], // Native Tamil review required. |
| -- | 63 | -- | uiNotAvailable: ["Not available", "விவரம் கிடைக்கவில்லை"], // Native Tamil review required. |
| -- | 64 | -- | uiExpired: ["Expired", "காலாவதியானது"], // Native Tamil review required. |
| -- | 65 | -- | uiActive: ["Active", "செயலில் உள்ளது"], // Native Tamil review required. |
| -- | 66 | -- | uiCurrentPack: ["Current pack", "தற்போதைய பேக்"], // Native Tamil review required. |
| -- | 67 | -- | uiEdit: ["Edit", "திருத்தவும்"], // Native Tamil review required. |
| -- | 68 | -- | uiManageYourSavedSetTopBoxesAndRechargeThemQuickly: ["Manage your saved Set-Top Boxes and recharge them quickly.", "சேமித்த செட்-டாப் பாக்ஸ்களை நிர்வகித்து ரீசார்ஜ் செய்யுங்கள்."], // Native Tamil review required. |
| -- | 69 | -- | uiNoSavedSetTopBoxes: ["No Saved Set-Top Boxes", "செட்-டாப் பாக்ஸ்கள் இன்னும் சேமிக்கப்படவில்லை"], // Native Tamil review required. |
| -- | 70 | -- | uiDTHTamizhanHome: ["DTH Tamizhan home", "டிடிஎச் தமிழன் முகப்பு"], // Native Tamil review required. |
| -- | 71 | -- | uiMainNavigation: ["Main navigation", "முதன்மை வழிசெலுத்தல்"], // Native Tamil review required. |
| -- | 72 | -- | uiEnglish: ["English", "English"], // Native Tamil review required. |
| -- | 73 | -- | uiDTHAccountVerified: ["DTH account", "டிடிஎச் கணக்கு"], // Native Tamil review required. |
| -- | 74 | -- | uiNameMustBeAtLeast2Characters: ["Name must be at least 2 characters.", "பெயரில் குறைந்தது இரண்டு எழுத்துகள் இருக்க வேண்டும்."], // Native Tamil review required. |
| -- | 75 | -- | uiUnableToSaveProfilePleaseTryAgain: ["Unable to save profile. Please try again.", "கணக்கு விவரங்களைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 76 | -- | uiUnableToVerifyAdminAccess: ["Unable to verify admin access.", "நிர்வாக அணுகலைச் சரிபார்க்க முடியவில்லை."], // Native Tamil review required. |
| -- | 77 | -- | uiRetryAccessCheck: ["Retry access check", "அணுகலை மீண்டும் சரிபார்க்கவும்"], // Native Tamil review required. |
| -- | 78 | -- | uiSaving: ["Saving…", "சேமிக்கப்படுகிறது…"], // Native Tamil review required. |
| -- | 79 | -- | uiRecordedStatus: ["Recorded status", "பதிவான நிலை"], // Native Tamil review required. |
| -- | 80 | -- | uiDTHOperator: ["DTH Operator", "டிடிஎச் ஆபரேட்டர்"], // Native Tamil review required. |
| -- | 81 | -- | uiPaymentMode: ["Payment Mode", "கட்டணம் செலுத்திய முறை"], // Native Tamil review required. |
| -- | 82 | -- | uiNoChannelsAreListedForThisPack: ["No channels are listed for this pack.", "இந்தப் பேக்கின் சேனல் விவரங்கள் வழங்கப்படவில்லை."], // Native Tamil review required. |
| -- | 83 | -- | uiCloseComparison: ["Close comparison", "ஒப்பீட்டை மூடவும்"], // Native Tamil review required. |
| -- | 84 | -- | uiCompareSelectedPacks: ["Compare selected packs", "தேர்ந்தெடுத்த பேக்குகளை ஒப்பிடவும்"], // Native Tamil review required. |
| -- | 85 | -- | uiClearComparison: ["Clear comparison", "ஒப்பீட்டை நீக்கவும்"], // Native Tamil review required. |
| -- | 86 | -- | uiChannelDetailsNeedReview: ["Channel details need review", "சேனல் விவரங்களைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required. |
| -- | 87 | -- | uiChannelDetailsNotProvided: ["Channel details not provided", "சேனல் விவரங்கள் வழங்கப்படவில்லை"], // Native Tamil review required. |
| -- | 88 | -- | uiPriceNeedsReview: ["Price needs review", "விலையைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required. |
| -- | 89 | -- | uiMonthlyPriceNeedsReview: ["Monthly price needs review", "மாதக் கட்டணத்தைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required. |
| -- | 90 | -- | uiDurationNeedsReview: ["Duration needs review", "பேக்கின் காலத்தைச் சரிபார்க்க வேண்டும்"], // Native Tamil review required. |
| -- | 91 | -- | uiEnterYourName: ["Enter your name", "உங்கள் பெயரை உள்ளிடவும்"], // Native Tamil review required. |
| -- | 92 | -- | uiEnterABoxNickname: ["Enter a box nickname", "பெட்டிக்கு ஒரு பெயர் உள்ளிடவும்"], // Native Tamil review required. |
| -- | 93 | -- | uiUnableToSubmitTheInstallationRequest: ["Unable to submit the installation request.", "நிறுவல் கோரிக்கையை அனுப்ப முடியவில்லை."], // Native Tamil review required. |
| -- | 94 | -- | uiUnableToSubmitTheRequestPleaseTryAgain: ["Unable to submit the request. Please try again.", "கோரிக்கையை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 95 | -- | uiQuotationRequired: ["Quotation required", "கட்டண மதிப்பீட்டைக் கேட்கவும்"], // Native Tamil review required. |
| -- | 96 | -- | uiSubmittingRequest: ["Submitting request…", "கோரிக்கை அனுப்பப்படுகிறது…"], // Native Tamil review required. |
| -- | 97 | -- | uiSubmitInstallationRequest: ["Submit installation request", "நிறுவல் கோரிக்கையை அனுப்பவும்"], // Native Tamil review required. |
| -- | 98 | -- | uiYourInstallationRequestHasBeenReceivedOurTeamWillContactYouToConfirmTh: ["Your installation request has been received. Our team will contact you to confirm the details.", "உங்கள் நிறுவல் கோரிக்கை பெறப்பட்டது. விவரங்களை உறுதிசெய்ய எங்கள் குழு உங்களைத் தொடர்புகொள்ளும்."], // Native Tamil review required. |
| -- | 99 | -- | uiAuthenticationIsCurrentlyNotAvailablePleaseTryAgainLater: ["Authentication is currently not available. Please try again later.", "இப்போது உள்நுழைய முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 100 | -- | uiGoogleSignInWasNotCompletedPleaseTryAgain: ["Google Sign-In was not completed. Please try again.", "Google உள்நுழைவு நிறைவடையவில்லை. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 101 | -- | uiSomethingWentWrongPleaseTryAgain: ["Something went wrong. Please try again.", "ஏதோ சிக்கல் ஏற்பட்டுள்ளது. மீண்டும் முயற்சிக்கவும்."], // Native Tamil review required. |
| -- | 102 | -- | uiOperatorTermsApply: ["Operator terms apply", "ஆபரேட்டரின் விதிமுறைகள் பொருந்தும்"], // Native Tamil review required. |
| -- | 103 | -- | uiCustomTopUp: ["Custom top-up", "விருப்பத் தொகை ரீசார்ஜ்"], // Native Tamil review required. |
| -- | 104 | -- | uiLocalSandboxSimulator: ["Local sandbox simulator", "உள்ளூர் சோதனைச் சேவை"], // Native Tamil review required. |
| -- | 105 | -- | uiSuccess2: ["success", "வெற்றி"], // Native Tamil review required. |
| -- | 106 | -- | uiFailed: ["failed", "தோல்வி"], // Native Tamil review required. |
| -- | 107 | -- | uiPending2: ["pending", "நிலுவையில் உள்ளது"], // Native Tamil review required. |
| -- | 108 | -- | uiPaid: ["paid", "பணம் செலுத்தப்பட்டது"], // Native Tamil review required. |
| -- | 109 | -- | uiInitiated: ["initiated", "தொடங்கப்பட்டது"], // Native Tamil review required. |
| -- | 110 | -- | uiProcessing: ["processing", "செயலாக்கத்தில் உள்ளது"], // Native Tamil review required. |
| -- | 111 | -- | uiCompleted: ["completed", "நிறைவடைந்தது"], // Native Tamil review required. |
| -- | 112 | -- | uiReady: ["ready", "தயாராக உள்ளது"], // Native Tamil review required. |
| -- | 113 | -- | uiGSTIN: ["GSTIN", "சரக்கு மற்றும் சேவை வரி எண் (GSTIN)"], // Native Tamil review required. |
| -- | 114 | -- | uiNoGSTBreakdownIsAvailableForThisRecord: ["No GST breakdown is available for this record.", "இந்தப் பதிவிற்கான GST விவரங்கள் வழங்கப்படவில்லை."], // Native Tamil review required. |
| -- | 115 | -- | uiUnavailable: ["Unavailable", "கிடைக்கவில்லை"], // Native Tamil review required. |
| -- | 116 | -- | uiNoMatchingPacks: ["No matching packs.", "பொருந்தும் பேக்குகள் இல்லை."], // Native Tamil review required. |
| -- | 117 | -- | uiTryAnotherSearchOrClearYourFilters: ["Try another search or clear your filters.", "வேறு சொற்களைத் தேடவும் அல்லது வடிகட்டல்களை நீக்கவும்."], // Native Tamil review required. |
| -- | 118 | -- | uiChannelList: ["Channel list", "சேனல் பட்டியல்"], // Native Tamil review required. |
| -- | 119 | -- | uiEnIN: ["en-IN", "ta-IN"], // Native Tamil review required. |
| -- | 120 | -- | uiAccount: ["Account", "கணக்கு"], // Native Tamil review required. |
| -- | 121 | -- | uiYourAccount: ["Your account", "உங்கள் கணக்கு"], // Native Tamil review required. |
| -- | 122 | -- | uiSignInWithGoogle: ["Sign in with Google", "கூகிள் மூலம் உள்நுழைக"], // Native Tamil review required. |
| -- | 123 | -- | uiLanguage: ["Language", "மொழி"], // Native Tamil review required. |
| -- | 124 | -- | uiCheckingAdminAccess: ["Checking admin access…", "நிர்வாக அணுகலைச் சரிபார்க்கிறது…"], // Native Tamil review required. |
| -- | 125 | -- | uiTheSignInWindowClosedBeforeAuthenticationCompletedTryAgainIfItKeepsHap: ["The sign-in window closed before authentication completed. Try again; if it keeps happening, check the Firebase authorized domain.", "உள்நுழைவு முடிவதற்கு முன் சாளரம் மூடப்பட்டது. மீண்டும் முயற்சிக்கவும்; தொடர்ந்தால் Firebase அங்கீகரிக்கப்பட்ட டொமைனைச் சரிபார்க்கவும்."], // Native Tamil review required. |
| -- | 126 | -- | uiConnecting: ["Connecting...", "சரிபார்க்கப்படுகிறது..."], // Native Tamil review required. |
| -- | 127 | -- | uiViewSavedSetTopBoxes: ["View saved set-top boxes", "சேமித்த பெட்டிகளைப் பார்க்கவும்"], // Native Tamil review required. |
| -- | 128 | -- | uiSignInToAccessYourSavedConnections: ["Sign in to access your saved connections.", "சேமித்த இணைப்புகளை அணுக உள்நுழையுங்கள்."], // Native Tamil review required. |
| -- | 129 | -- | uiSignIn: ["Sign in", "உள்நுழையுங்கள்"], // Native Tamil review required. |
| -- | 130 | -- | uiPageNotFound: ["Page not found", "பக்கம் கிடைக்கவில்லை"], // Native Tamil review required. |
| -- | 131 | -- | uiWeCouldNotLoadThisPage: ["We could not load this page", "பக்கத்தை ஏற்ற முடியவில்லை"], // Native Tamil review required. |
| -- | 132 | -- | uiThisAddressDoesNotExistCheckTheLinkOrReturnHome: ["This address does not exist. Check the link or return home.", "இந்த முகவரி கிடைக்கவில்லை. இணைப்பைச் சரிபார்க்கவும் அல்லது முகப்புக்குச் செல்லவும்."], // Native Tamil review required. |
| -- | 133 | -- | uiReturnHomeToTryAgainThisErrorIsNotConfirmationThatAPaymentSucceeded: ["Return home to try again. This error is not confirmation that a payment succeeded.", "மீண்டும் முயற்சிக்க முகப்புப் பக்கத்திற்குச் செல்லவும். இந்தப் பிழை கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது."], // Native Tamil review required. |
| -- | 134 | -- | uiBackToHome: ["Back to home", "முகப்புப் பக்கத்திற்குத் திரும்பவும்"], // Native Tamil review required. |
| -- | 135 | -- | uiSupportAndPolicies: ["Support and policies", "உதவி மற்றும் கொள்கைகள்"], // Native Tamil review required. |
| -- | 136 | -- | uiBusinessName: ["Business name", "வணிகப் பெயர்"], // Native Tamil review required. |
| -- | 137 | -- | uiSupportPhone: ["Support phone", "உதவி தொலைபேசி"], // Native Tamil review required. |
| -- | 138 | -- | uiSupportEmail: ["Support email", "உதவி மின்னஞ்சல்"], // Native Tamil review required. |
| -- | 139 | -- | uiSupportHours: ["Support hours", "உதவி நேரம்"], // Native Tamil review required. |
| -- | 140 | -- | uiAddress: ["Address", "முகவரி"], // Native Tamil review required. |
| -- | 141 | -- | uiGrievanceOfficer: ["Grievance officer", "குறைதீர் அதிகாரி"], // Native Tamil review required. |
| -- | 142 | -- | uiGrievanceEmail: ["Grievance email", "குறைதீர் மின்னஞ்சல்"], // Native Tamil review required. |
| -- | 143 | -- | uiGrievanceAddress: ["Grievance address", "குறைதீர் முகவரி"], // Native Tamil review required. |
| -- | 144 | -- | uiPaymentTermsAndSupport: ["Payment terms and support", "கட்டண விதிமுறைகள் மற்றும் உதவி"], // Native Tamil review required. |
| -- | 145 | -- | uiByPayingYouAgreeToTheTermsOfUseAndRefundCancellationPolicyPleaseAlsoRe: ["By paying you agree to the Terms of Use and Refund & Cancellation Policy. Please also read the Privacy Policy.", "பணம் செலுத்துவதன் மூலம் பயன்பாட்டு விதிமுறைகளையும் பணத்திருப்பல் கொள்கையையும் ஏற்கிறீர்கள். தனியுரிமைக் கொள்கையையும் படிக்கவும்."], // Native Tamil review required. |
| -- | 146 | -- | uiChooseCustomTopUp: ["Choose custom top-up", "விருப்பத் தொகை ரீசார்ஜ்"], // Native Tamil review required. |
| -- | 147 | -- | uiNotConfigured: ['Not configured', 'இன்னும் அமைக்கப்படவில்லை'], // Native Tamil review required. |
| -- | 148 | -- | uiCheckingConfiguration: ['Checking configuration...', 'சேவை அமைப்புகள் சரிபார்க்கப்படுகின்றன…'], // Native Tamil review required. |
| -- | 149 | -- | uiRemoveNamedPlan: ['Remove {name} from comparison', '{name} பேக்கை ஒப்பீட்டிலிருந்து நீக்கவும்'], // Native Tamil review required. |
| -- | 150 | -- | uiPackCount: ['{shown} of {total} packs', 'மொத்தம் {total} பேக்குகளில் {shown}'], // Native Tamil review required. |
| -- | 151 | -- | uiEquipment: ['Equipment to be confirmed', 'சாதன விவரங்கள் உறுதிசெய்யப்பட வேண்டும்'], // Native Tamil review required. |
| -- | 152 | -- | uiCabling: ['Cabling to be confirmed', 'கேபிள் விவரங்கள் உறுதிசெய்யப்பட வேண்டும்'], // Native Tamil review required. |
| -- | 153 | -- | uiAvailability: ['Availability to be confirmed', 'சேவை கிடைக்குமா என்பதை உறுதிசெய்ய வேண்டும்'], // Native Tamil review required. |
| -- | 154 | -- | uiMobilePlaceholder: ['Enter a 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'], // Native Tamil review required. |
| -- | 155 | -- | uiAddressPlaceholder: ['Door number, street and area', 'கதவு எண், தெரு மற்றும் பகுதி'], // Native Tamil review required. |
| -- | 156 | -- | uiGSTPlaceholder: ['[FILL IN] GSTIN, or confirm not applicable', '[FILL IN] GSTIN எண்ணை நிரப்பவும் அல்லது பொருந்தாது என்பதை உறுதிசெய்யவும்'], // Native Tamil review required. |
| -- | 157 | -- | uiEnterOperatorId: ['Enter your {label}', '{label} உள்ளிடவும்'], // Native Tamil review required. |
| -- | 158 | -- | uiIdHelp: ['{label}: {lengths} digits{prefix}', '{label}: {lengths} இலக்கங்கள்{prefix}'], // Native Tamil review required. |
| -- | 159 | -- | uiIdPrefix: ['; starts with {prefixes}', '; {prefixes} என்று தொடங்க வேண்டும்'], // Native Tamil review required. |
| -- | 160 | -- | uiUpdateId: ['Please update this ID. {help}.', 'இந்த எண்ணைத் திருத்தவும். {help}.'], // Native Tamil review required. |
| -- | 161 | -- | uiSupportedOperator: ['Select a supported operator', 'ஆதரிக்கப்படும் ஆபரேட்டரைத் தேர்ந்தெடுக்கவும்'], // Native Tamil review required. |
| -- | 162 | -- | uiAmountBounds: ['Enter an amount from Rs. {min} to Rs. {max} with no more than {decimals} decimal places.', 'Rs. {min} முதல் Rs. {max} வரை, அதிகபட்சம் {decimals} தசம இடங்களுடன் தொகையை உள்ளிடவும்.'], // Native Tamil review required. |
| -- | 163 | -- | uiAmountHelp: ['Rs. {min}–Rs. {max}; up to {decimals} decimal places.', 'Rs. {min} முதல் Rs. {max} வரை; அதிகபட்சம் {decimals} தசம இடங்கள்.'], // Native Tamil review required. |
| -- | 164 | -- | uiPolicyDraft: ['Draft — details marked [FILL IN] await confirmation. Effective date: {date}.', 'வரைவு — [FILL IN] எனக் குறிக்கப்பட்ட விவரங்கள் உறுதிசெய்யப்பட வேண்டும். நடைமுறைக்கு வரும் தேதி: {date}.'], // Native Tamil review required. |
| -- | 165 | -- | uiSetTopBox: ['Set-top box', 'செட்-டாப் பாக்ஸ்'], // Native Tamil review required. |
| -- | 166 | -- | uiNoCatalogPacks: ['{operator} has no catalog packs here. You can choose a custom top-up from {range} instead.', '{operator} பேக்குகள் இங்கு இல்லை. {range} வரம்பில் உங்கள் விருப்பத் தொகையில் ரீசார்ஜ் செய்யலாம்.'], // Native Tamil review required. |
| -- | 167 | -- | uiNoProviderOrder: ['No provider order created', 'கட்டணச் சேவை ஆர்டர் இன்னும் உருவாக்கப்படவில்லை'], // Native Tamil review required. |
| -- | 168 | -- | uiSandboxExplanation: ['Test results stay in this dialog. No recharge, receipt, saved-box update or real order is created.', 'சோதனை முடிவுகள் இந்தப் பக்கத்தில் மட்டுமே இருக்கும். ரீசார்ஜ், ரசீது, சேமித்த பெட்டி மாற்றம் அல்லது உண்மையான ஆர்டர் எதுவும் உருவாக்கப்படாது.'], // Native Tamil review required. |
| -- | 169 | -- | uiPaymentExplanation: ['Payment must be confirmed by the provider before recharge processing begins. Closing this dialog does not prove payment success.', 'ரீசார்ஜ் தொடங்கும் முன் கட்டணச் சேவை பணம் செலுத்தப்பட்டதை உறுதிசெய்ய வேண்டும். இந்தப் பக்கத்தை மூடுவது கட்டண வெற்றிக்கான சான்று அல்ல.'], // Native Tamil review required. |
| -- | 170 | -- | uiProviderUnavailable: ['Payment provider is not configured. No payment has been taken. Please retry later.', 'கட்டணச் சேவை இன்னும் அமைக்கப்படவில்லை. பணம் எதுவும் பெறப்படவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'], // Native Tamil review required. |
| -- | 171 | -- | uiSessionBusy: ['Test checkout is busy. Please retry later.', 'சோதனைக் கட்டணச் சேவை தற்போது பிஸியாக உள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'], // Native Tamil review required. |
| -- | 172 | -- | uiSessionConflict: ['Idempotency key already used for another checkout.', 'இந்தக் கட்டணக் கோரிக்கை எண் ஏற்கெனவே பயன்படுத்தப்பட்டுள்ளது. புதிய அமர்வைத் தொடங்கவும்.'], // Native Tamil review required. |
| -- | 173 | -- | uiSessionComplete: ['This test payment already has a result. Generate a new session.', 'இந்தச் சோதனைக்கு ஏற்கெனவே முடிவு உள்ளது. புதிய அமர்வைத் தொடங்கவும்.'], // Native Tamil review required. |
| -- | 174 | -- | uiRemoveNamedBox: ['Remove {name}', '{name} பெட்டியை நீக்கவும்'], // Native Tamil review required. |
| -- | 175 | -- | uiConfirmRemoveBox: ['Remove “{name}” from your saved boxes?', 'சேமித்த பெட்டிகளிலிருந்து “{name}” பெட்டியை நீக்கவா?'], // Native Tamil review required. |
| -- | 176 | -- | uiCatalogReview: ['Catalog details need review', 'பேக் விவரங்களைச் சரிபார்க்க வேண்டும்'], // Native Tamil review required. |
| -- | 177 | -- | uiCatalogTotalError: ['Check the total channel count.', 'மொத்தச் சேனல் எண்ணிக்கையைச் சரிபார்க்கவும்.'], // Native Tamil review required. |
| -- | 178 | -- | uiCatalogHdError: ['Check the HD channel count; it must not exceed the total.', 'HD சேனல் எண்ணிக்கை மொத்தத்தைவிட அதிகமாக இருக்கக்கூடாது. சரிபார்க்கவும்.'], // Native Tamil review required. |
| -- | 179 | -- | uiCatalogNameError: ['Check that the pack name matches its details.', 'பேக்கின் பெயரும் விவரங்களும் பொருந்துகின்றனவா என்று சரிபார்க்கவும்.'], // Native Tamil review required. |
| -- | 180 | -- | uiCatalogPriceError: ['Check that the price is greater than zero.', 'விலை பூஜ்ஜியத்தைவிட அதிகமாக இருக்க வேண்டும். சரிபார்க்கவும்.'], // Native Tamil review required. |
| -- | 181 | -- | uiCatalogDurationError: ['Choose 1, 3, 6 or 12 months.', '1, 3, 6 அல்லது 12 மாதங்களைத் தேர்ந்தெடுக்கவும்.'], // Native Tamil review required. |
| -- | 182 | -- | uiSunDirect: ['Sun Direct', 'சன் டைரக்ட்'], // Native Tamil review required. |
| -- | 183 | -- | uiTataPlay: ['Tata Play', 'டாடா பிளே'], // Native Tamil review required. |
| -- | 184 | -- | uiAirtel: ['Airtel Digital TV', 'ஏர்டெல் டிஜிட்டல் டிவி'], // Native Tamil review required. |
| -- | 185 | -- | uiDishD2h: ['Dish TV & D2H', 'டிஷ் டிவி மற்றும் டி2எச்'], // Native Tamil review required. |
| -- | 186 | -- | uiAiUnavailable: ['Pack suggestions are unavailable. Browse the available packs instead.', 'பேக் பரிந்துரைகள் தற்போது கிடைக்கவில்லை. கிடைக்கும் பேக்குகளைப் பார்த்துத் தேர்ந்தெடுக்கவும்.'], // Native Tamil review required. |
| -- | 187 | -- | uiSkipContent: ['Skip to content', 'உள்ளடக்கத்திற்குச் செல்'], // Native Tamil review required. |
| -- | 188 | -- | uiSignInEdit: ['You must be signed in to edit your profile.', 'கணக்கு விவரங்களைத் திருத்த முதலில் உள்நுழையவும்.'], // Native Tamil review required. |
| -- | 189 | -- | uiSecurityInputSurfaces: ["Input surfaces", "தகவல் உள்ளிடும் இடங்கள்"], // Native Tamil review required. |
| -- | 190 | -- | uiSecurityInvalidSmartCardCharactersInjectionAttemptsOversizedUploads: ["Invalid smart-card characters, injection attempts, oversized uploads", "தவறான கணக்கு எண்கள், தீங்கிழைக்கும் உள்ளீடுகள் மற்றும் அளவுக்கு மீறிய பதிவேற்றங்கள்"], // Native Tamil review required. |
| -- | 191 | -- | uiSecurityOperatorSpecificInputValidationRequestSchemasAndUploadLimits: ["Operator-specific input validation, request schemas, and upload limits", "ஆபரேட்டருக்கான எண் சரிபார்ப்பு, கோரிக்கை வடிவங்கள் மற்றும் பதிவேற்ற வரம்புகள்"], // Native Tamil review required. |
| -- | 192 | -- | uiSecurityPlanningAndReasoning: ["Planning and reasoning", "கோரிக்கையைப் புரிந்துகொள்ளுதல்"], // Native Tamil review required. |
| -- | 193 | -- | uiSecurityInstructionOverrideAndIndirectInjectionFromExternalInputs: ["Instruction override and indirect injection from external inputs", "வெளித் தகவல்கள் மூலம் அறிவுறுத்தல்களை மாற்றும் முயற்சிகள்"], // Native Tamil review required. |
| -- | 194 | -- | uiSecurityDataOnlyDeserializationContextualStateValidationAndFixedAllowedOp: ["Data-only deserialization, contextual state validation, and fixed allowed operators", "தகவலை மட்டும் படித்தல், செயல்நிலையைச் சரிபார்த்தல் மற்றும் அனுமதிக்கப்பட்ட ஆபரேட்டர்களை மட்டுமே பயன்படுத்துதல்"], // Native Tamil review required. |
| -- | 195 | -- | uiSecurityToolExecution: ["Tool execution", "செயல்களை இயக்குதல்"], // Native Tamil review required. |
| -- | 196 | -- | uiSecurityPrivilegeEscalationUnauthorizedOrderUpdatesTransponderFlooding: ["Privilege escalation, unauthorized order updates, transponder flooding", "அனுமதியற்ற அணுகல், ஆர்டர் மாற்றங்கள் மற்றும் மிகுதியான கோரிக்கைகள்"], // Native Tamil review required. |
| -- | 197 | -- | uiSecurityRateLimitsOnSensitiveOperationsAndVerifiedFirebaseIDTokens: ["Rate limits on sensitive operations and verified Firebase ID tokens", "முக்கியச் செயல்களுக்கு கோரிக்கை வரம்புகளும் சரிபார்க்கப்பட்ட Firebase அடையாளச் சான்றுகளும்"], // Native Tamil review required. |
| -- | 198 | -- | uiSecurityMemoryAndState: ["Memory and state", "தகவலும் செயல்நிலையும்"], // Native Tamil review required. |
| -- | 199 | -- | uiSecurityCrossTenantDataAccessUnauthorizedOverwritesUndefinedValues: ["Cross-tenant data access, unauthorized overwrites, undefined values", "பிறரின் தகவலை அணுகுதல், அனுமதியின்றி மாற்றுதல் மற்றும் முழுமையற்ற மதிப்புகள்"], // Native Tamil review required. |
| -- | 200 | -- | uiSecurityOwnerBoundFirestorePathsAccessRulesAndPayloadSanitization: ["Owner-bound Firestore paths, access rules, and payload sanitization", "உரிமையாளருக்கான Firestore அணுகல் விதிகளும் அனுப்பும் தகவலைச் சீராக்குதலும்"], // Native Tamil review required. |
| -- | 201 | -- | uiSecurityFirestoreRules: ["Firestore rules", "Firestore அணுகல் விதிகள்"], // Native Tamil review required. |
| -- | 202 | -- | uiSecurityInterSystemCommunication: ["Inter-system communication", "சேவைகளுக்கு இடையிலான தொடர்பு"], // Native Tamil review required. |
| -- | 203 | -- | uiSecurityAPIKeyLeakageAndHardcodedCredentials: ["API-key leakage and hardcoded credentials", "API சாவிகள் வெளியாவதும் குறியீட்டில் ரகசியங்களை நேரடியாகச் சேமிப்பதும்"], // Native Tamil review required. |
| -- | 204 | -- | uiSecurityServerSideAPIProxiesAndEnvironmentBasedSecretInjection: ["Server-side API proxies and environment-based secret injection", "சேவையக API இடைமுகங்களும் சூழல் அமைப்புகள் வழியாக ரகசியங்களைப் பெறுதலும்"], // Native Tamil review required. |
| -- | 205 | -- | uiSecuritySecurityControlsOverview: ["Security controls overview", "பாதுகாப்பு ஏற்பாடுகளின் சுருக்கம்"], // Native Tamil review required. |
| -- | 206 | -- | uiSecurityASummaryOfSecurityControlsDescribedForThisApplication: ["A summary of security controls described for this application.", "இந்தச் செயலிக்காக விவரிக்கப்பட்டுள்ள பாதுகாப்பு ஏற்பாடுகளின் சுருக்கம்."], // Native Tamil review required. |
| -- | 207 | -- | uiSecurity5ControlAreas: ["5 control areas", "5 பாதுகாப்புப் பகுதிகள்"], // Native Tamil review required. |
| -- | 208 | -- | uiSecurityRisk: ["Risk:", "ஆபத்து:"], // Native Tamil review required. |
| -- | 209 | -- | uiSecurityControls: ["Controls:", "ஏற்பாடுகள்:"], // Native Tamil review required. |
| -- | 210 | -- | uiSecurityControlArea: ["Control area", "பாதுகாப்புப் பகுதி"], // Native Tamil review required. |
| -- | 211 | -- | uiSecurityExampleRisks: ["Example risks", "ஆபத்து எடுத்துக்காட்டுகள்"], // Native Tamil review required. |
| -- | 212 | -- | uiSecurityDescribedControls: ["Described controls", "விவரிக்கப்பட்ட ஏற்பாடுகள்"], // Native Tamil review required. |
| -- | 213 | -- | uiSecurityReference: ["Reference", "குறிப்பு"], // Native Tamil review required. |
| -- | 214 | -- | uiSecurityCredentialHandling: ["Credential handling", "ரகசிய விவரங்களைக் கையாளுதல்"], // Native Tamil review required. |
| -- | 215 | -- | uiSecurityTheProjectDescribesServerSideEnvironmentConfigurationForSensitive: ["The project describes server-side environment configuration for sensitive credentials.", "முக்கிய ரகசிய விவரங்களை சேவையகச் சூழல் அமைப்புகள் வழியாகப் பெறும் முறை இந்தத் திட்டத்தில் விவரிக்கப்பட்டுள்ளது."], // Native Tamil review required. |
| -- | 216 | -- | uiSecurityDataAccess: ["Data access", "தகவல் அணுகல்"], // Native Tamil review required. |
| -- | 217 | -- | uiSecurityFirestoreRulesDefineAccessForCustomerConnectionsAndAdministrative: ["Firestore rules define access for customer connections and administrative data.", "வாடிக்கையாளர் இணைப்புகள் மற்றும் நிர்வாகத் தகவல்களுக்கான அணுகலை Firestore விதிகள் வரையறுக்கின்றன."], // Native Tamil review required. |
| -- | 218 | -- | uiSecurityServerRequests: ["Server requests", "சேவையகக் கோரிக்கைகள்"], // Native Tamil review required. |
| -- | 219 | -- | uiSecurityServerRoutesValidateRequestBodiesAndSanitizeSelectedFirestorePayl: ["Server routes validate request bodies and sanitize selected Firestore payloads.", "சேவையக வழிகள் கோரிக்கைகளின் வடிவத்தைச் சரிபார்த்து, குறிப்பிட்ட Firestore தகவல்களைச் சீராக்குகின்றன."], // Native Tamil review required. |
| -- | 220 | -- | uiSecurityThisPageSummarizesProjectDocumentationItIsNotAnIndependentSecurit: ["This page summarizes project documentation; it is not an independent security assessment. Effective protection depends on deployment and configuration.", "இந்தப் பக்கம் திட்ட ஆவணங்களின் சுருக்கம் மட்டுமே; தனியான பாதுகாப்பு ஆய்வு அல்ல. பாதுகாப்பின் செயல்திறன் நிறுவல் மற்றும் அமைப்புகளைப் பொறுத்தது."], // Native Tamil review required. |
| -- | 221 | -- | uiOffline: ['Offline', 'சேவை கிடைக்கவில்லை'], // Native Tamil review required. |
| -- | 222 | -- | uiMaintenance: ['Maintenance', 'பராமரிப்பு'], // Native Tamil review required. |
| -- | 223 | -- | uiFlexible: ['Flexible', 'விருப்பத் தொகை'], // Native Tamil review required. |
| -- | 224 | -- | uiSunSetup: ['Sun Direct HD dish, set-top box and remote', 'சன் டைரக்ட் HD டிஷ், செட்-டாப் பாக்ஸ் மற்றும் ரிமோட்'], // Native Tamil review required. |
| -- | 225 | -- | uiAirtelSetup: ['Airtel Digital TV setup', 'ஏர்டெல் டிஜிட்டல் டிவி அமைப்பு'], // Native Tamil review required. |
| -- | 226 | -- | uiTataSetup: ['Tata Play setup', 'டாடா பிளே அமைப்பு'], // Native Tamil review required. |
| -- | 227 | -- | uiDishSetup: ['Dish TV and D2H setup', 'டிஷ் டிவி மற்றும் டி2எச் அமைப்பு'], // Native Tamil review required. |
| -- | 228 | -- | } as const satisfies Record&lt;string, readonly [string, string]&gt;; |
| -- | 229 | -- | type Messages = { [Key in keyof typeof pairs]: string }; |
| -- | 230 | -- | export const customerMessages = { |
| -- | 231 | -- | en: Object.fromEntries(Object.entries(pairs).map(([key, value]) =&gt; [key, value[0]])) as Messages, |
| -- | 232 | -- | ta: Object.fromEntries(Object.entries(pairs).map(([key, value]) =&gt; [key, value[1]])) as Messages, |
| -- | 233 | -- | }; |
| -- | 234 | -- | const byEnglish = new Map&lt;string, string&gt;(Object.values(pairs).map(([en, ta]) =&gt; [en, ta])); |
| -- | 235 | -- | const byTamil = new Map&lt;string, string&gt;(Object.values(pairs).map(([en, ta]) =&gt; [ta, en])); |
| -- | 236 | -- | export function localizeCustomerText(text: string, lang: 'en' \| 'ta'): string { return (lang === 'ta' ? byEnglish : byTamil).get(text) \|\| text; } |
| -- | 237 | -- | export function localizeCustomerError(text: string, lang: 'en' \| 'ta'): string { |
| -- | 238 | -- | if (lang === 'en') return byTamil.get(text) \|\| text; |
| -- | 239 | -- | return /[\u0b80-\u0bff]/.test(text) ? text : byEnglish.get(text) \|\| customerMessages.ta.uiSomethingWentWrongPleaseTryAgain; |
| -- | 240 | -- | } |
| -- | 241 | -- | export function formatMessage(template: string, values: Record&lt;string, string \| number&gt;): string { |
| -- | 242 | -- | return template.replace(/\{(\w+)\}/g, (match, key) =&gt; key in values ? String(values[key]) : match); |
| -- | 243 | -- | } |
| -- | 244 | -- | export function paymentMethodLabel(method: string, lang: 'en' \| 'ta'): string { |
| -- | 245 | -- | return ({ upi: 'UPI', card: customerMessages[lang].uiDebitCreditCard, netbanking: customerMessages[lang].uiNetBanking } as Record&lt;string, string&gt;)[method] \|\| method; |
| -- | 246 | -- | } |

## src/lib/excelPlanService.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 181 | 181 | { header: 'Price (INR)', key: 'amount', width: 14 }, | { header: 'Price (Rs.)', key: 'amount', width: 14 }, |
| 239 | 239 | { section: 'Price (INR)', guide: 'Must be a positive number (e.g. 299, 1650, 3100)' }, | { section: 'Price (Rs.)', guide: 'Must be a positive number (e.g. 299, 1650, 3100)' }, |
| 275 | 275 | { header: 'Price (INR)', key: 'amount', width: 14 }, | { header: 'Price (Rs.)', key: 'amount', width: 14 }, |
| 372 | 372 | { field: 'Price (INR)', required: 'Mandatory', desc: 'Positive price amount in rupees (e.g. 299, 1650)' }, | { field: 'Price (Rs.)', required: 'Mandatory', desc: 'Positive price amount in Rs. (e.g. 299, 1650)' }, |
| 491 | 491 | const rawAmount = normalizedRow['price_inr'] \|\| normalizedRow['price'] \|\| normalizedRow['amount'] \|\| normalizedRow['cost'] \|\| ''; | const rawAmount = normalizedRow['price_rs'] \|\| normalizedRow['price_inr'] \|\| normalizedRow['price'] \|\| normalizedRow['amount'] \|\| normalizedRow['cost'] \|\| ''; |
| 500 | 500 | const cleanAmountStr = trimmed.replace(/^₹\s*/, '').replace(/,/g, ''); | const cleanAmountStr = trimmed.replace(/^(?:₹\|Rs\.?\|INR)\s*/i, '').replace(/,/g, ''); |
| 505 | 505 | errors.push(&#96;Invalid Price Amount "${rawAmount}". Must be a positive number greater than ₹0.&#96;); | errors.push(&#96;Invalid Price Amount "${rawAmount}". Must be a positive number greater than Rs. 0.&#96;); |
| 560 | 560 | diffs.push({ field: 'amount', label: 'Price (INR)', oldVal: &#96;₹${originalPlan.amount}&#96;, newVal: &#96;₹${amount}&#96; }); | diffs.push({ field: 'amount', label: 'Price (Rs.)', oldVal: &#96;Rs. ${originalPlan.amount}&#96;, newVal: &#96;Rs. ${amount}&#96; }); |

## src/lib/planCatalogService.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 224 | 224 | description: 'Full 365 days of nonstop Tamil family television at less than ₹188 per month.', | description: 'Full 365 days of nonstop Tamil family television at less than Rs. 188 per month.', |
| 689 | 689 | description: '6 Months saver pack with ₹30 per month discount for Dish TV HD customers.', | description: '6 Months saver pack with Rs. 30 per month discount for Dish TV HD customers.', |
| 757 | 757 | description: '6 Months pack saving ₹20 every month on standard definition television.', | description: '6 Months pack saving Rs. 20 every month on standard definition television.', |
| 774 | 774 | description: 'Full year of nonstop Tamil family television for just ₹175 per month.', | description: 'Full year of nonstop Tamil family television for just Rs. 175 per month.', |
| 897 | 897 | description: '6 Months SD advance recharge pack saving ₹20 per month.', | description: '6 Months SD advance recharge pack saving Rs. 20 per month.', |
| 1136 | 1136 | details: &#96;Saved ${finalPlan.pack_type} pack for ${finalPlan.duration_months}M (₹${finalPlan.amount}) in the server catalog&#96;, | details: &#96;Saved ${finalPlan.pack_type} pack for ${finalPlan.duration_months}M (Rs. ${finalPlan.amount}) in the server catalog&#96;, |

## src/lib/policyTranslations.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { BUSINESS_DETAILS, type PolicyKey, type PolicySection } from './trustContent'; |
| -- | 2 | -- | import type { Language } from '../types'; |
| -- | 4 | -- | // Draft Tamil for every value and paragraph in this file: native Tamil and legal review required. |
| -- | 5 | -- | export const BUSINESS_DETAILS_TA: Record&lt;keyof typeof BUSINESS_DETAILS, string&gt; = { |
| -- | 6 | -- | legalName: '[FILL IN] பதிவு செய்யப்பட்ட வணிகப் பெயர்', |
| -- | 7 | -- | address: '[FILL IN] பதிவு செய்யப்பட்ட அல்லது தொடர்பு முகவரி', |
| -- | 8 | -- | phone: '[FILL IN] வாடிக்கையாளர் உதவி தொலைபேசி எண்', |
| -- | 9 | -- | email: '[FILL IN] வாடிக்கையாளர் உதவி மின்னஞ்சல்', |
| -- | 10 | -- | supportHours: '[FILL IN] உதவி கிடைக்கும் நாட்கள், நேரம் மற்றும் நேர மண்டலம்', |
| -- | 11 | -- | gstin: '[FILL IN] GSTIN எண்ணை நிரப்பவும் அல்லது பொருந்தாது என்பதை உறுதிசெய்யவும்', |
| -- | 12 | -- | grievanceOfficer: '[FILL IN] குறைதீர்ப்பு அதிகாரியின் பெயர் மற்றும் பதவி', |
| -- | 13 | -- | grievanceEmail: '[FILL IN] குறைதீர்ப்பு மின்னஞ்சல்', |
| -- | 14 | -- | grievanceAddress: '[FILL IN] குறைதீர்ப்பு தொடர்பு முகவரி', |
| -- | 15 | -- | acknowledgement: '[FILL IN] புகார் பெறப்பட்டதை உறுதிசெய்யும் கால அளவு', |
| -- | 16 | -- | resolution: '[FILL IN] சட்டத்திற்கு உட்பட்ட குறைதீர்ப்பு கால அளவு', |
| -- | 17 | -- | refundReview: '[FILL IN] பணத்தைத் திருப்பித் தரும் தகுதியைச் சரிபார்க்கும் கால அளவு', |
| -- | 18 | -- | refundProcessing: '[FILL IN] ஒப்புதல் பெற்ற பணத்திருப்பலைத் தொடங்கும் கால அளவு', |
| -- | 19 | -- | bankCredit: '[FILL IN] வங்கி அல்லது கட்டணச் சேவையில் பணம் வரவு வைக்கப்படும் எதிர்பார்க்கப்படும் கால அளவு', |
| -- | 20 | -- | reconciliation: '[FILL IN] நிலுவைக் கட்டணத்தைச் சரிபார்க்கும் கால அளவு', |
| -- | 21 | -- | feesAndTaxes: '[FILL IN] பொருந்தும் கட்டணங்கள், வரிகள் மற்றும் ரசீது விவரங்கள்', |
| -- | 22 | -- | policyDate: '[FILL IN] கொள்கை நடைமுறைக்கு வரும் தேதி', |
| -- | 23 | -- | retention: '[FILL IN] கணக்கு, ரீசார்ஜ், உதவி மற்றும் நிதிப் பதிவுகளை வைத்திருக்கும் கால அளவுகள்', |
| -- | 24 | -- | processors: '[FILL IN] ஹோஸ்டிங், கட்டணம் மற்றும் பிற சேவை வழங்குநர்கள், பயன்பாட்டு நோக்கங்கள் மற்றும் தரவு செயலாக்க இடங்கள்', |
| -- | 25 | -- | installation: '[FILL IN] நிறுவல் சேவை கிடைக்கும் விவரம் மற்றும் எழுத்துப்பூர்வக் கட்டண மதிப்பீடு', |
| -- | 26 | -- | }; |
| -- | 27 | -- | export const businessDetails = (lang: Language) =&gt; lang === 'ta' ? BUSINESS_DETAILS_TA : BUSINESS_DETAILS; |
| -- | 28 | -- | const b = BUSINESS_DETAILS_TA; |
| -- | 29 | -- | export const POLICY_CONTENT_TA: Record&lt;PolicyKey, PolicySection[]&gt; = { |
| -- | 30 | -- | contact: [ |
| -- | 31 | -- | { heading: 'உதவி பெறுவது எப்படி?', paragraphs: [ |
| -- | 32 | -- | 'ரீசார்ஜ், கட்டணம், ரத்து அல்லது தனியுரிமை குறித்த கேள்விகளுக்கு கீழே உள்ள உதவி விவரங்களைப் பயன்படுத்தவும். [FILL IN] எனக் குறிக்கப்பட்ட விவரங்கள் இன்னும் உறுதிசெய்யப்படவில்லை; அவை செயல்படும் தொடர்பு வழிகள் அல்ல.', |
| -- | 33 | -- | 'ஆர்டர் எண், ஆபரேட்டர், தொகை, தேதி மற்றும் சிக்கலின் சுருக்கத்தைத் தெரிவிக்கவும். திரைப்பிடிப்புகளில் தேவையற்ற தனிப்பட்ட அல்லது வங்கி விவரங்களை மறைக்கவும். OTP, UPI PIN, கடவுச்சொல், முழுக் கார்டு எண் அல்லது CVV ஆகியவற்றைப் பகிர வேண்டாம்.', |
| -- | 34 | -- | 'பணம் பிடிக்கப்பட்டும் ரீசார்ஜ் உறுதியாகவில்லை என்றால், பரிவர்த்தனை எண்ணை வைத்துக்கொண்டு உதவிக் குழுவிடம் நிலையைச் சரிபார்க்கச் சொல்லவும். முதல் கட்டணத்தின் முடிவு தெரியும்வரை மீண்டும் பணம் செலுத்த வேண்டாம்.', |
| -- | 35 | -- | ] }, |
| -- | 36 | -- | { heading: 'புகார்களும் மேல்முறையீடும்', paragraphs: [ |
| -- | 37 | -- | &#96;உதவிக் குழுவால் சிக்கல் தீர்க்கப்படவில்லை என்றால் ${b.grievanceOfficer} அவர்களை ${b.grievanceEmail} மூலம் தொடர்புகொள்ளவும். அஞ்சல் முகவரி: ${b.grievanceAddress}. முந்தைய உதவிக் கோரிக்கை எண்ணையும் சேர்க்கவும்.&#96;, |
| -- | 38 | -- | &#96;புகார் பெறப்பட்டதை உறுதிசெய்யும் காலம்: ${b.acknowledgement}. தீர்வுக்கான காலம்: ${b.resolution}. பொருந்தும் நுகர்வோர் சட்டத்திற்கு ஏற்ப இவ்விவரங்கள் நிரப்பப்பட வேண்டும். சட்டப்படி புகார் அளிக்கும் மற்றும் நுகர்வோர் மன்றத்தை அணுகும் உரிமைகள் பாதிக்கப்படாது.&#96;, |
| -- | 39 | -- | ] }, |
| -- | 40 | -- | ], |
| -- | 41 | -- | refund: [ |
| -- | 42 | -- | { heading: 'ரீசார்ஜை உறுதிசெய்யும் முன்', paragraphs: [ |
| -- | 43 | -- | 'பணம் செலுத்தும் முன் ஆபரேட்டர், கணக்கு எண், தேர்ந்தெடுத்த பேக், காலம் மற்றும் மொத்தத் தொகையைச் சரிபார்க்கவும். கட்டணம் உறுதியாவதும் ஆபரேட்டரிடம் ரீசார்ஜ் உறுதியாவதும் வெவ்வேறு நிகழ்வுகள். நிலுவைக் கட்டணம் ரீசார்ஜ் வெற்றியடைந்ததற்கான சான்று அல்ல.', |
| -- | 44 | -- | &#96;உறுதிசெய்யும் முன் கூடுதல் கட்டணங்கள், வரிகள் மற்றும் திருப்பித் தர முடியாத தொகைகள் இருந்தால் அவை காட்டப்பட வேண்டும்: ${b.feesAndTaxes}.&#96;, |
| -- | 45 | -- | ] }, |
| -- | 46 | -- | { heading: 'ரத்து செய்யும் கோரிக்கைகள்', paragraphs: [ |
| -- | 47 | -- | 'கோரிக்கையை ரத்து செய்ய உதவிக் குழுவிடம் கேட்கலாம். அது ஏற்கெனவே ஆபரேட்டருக்கு அனுப்பப்பட்டதா அல்லது ஏற்கப்பட்டதா என்பதைப் பொறுத்தே ரத்து செய்ய முடியும். அனுப்பிய பிறகு ரத்து செய்ய முடியும் என்று உறுதியளிக்க முடியாது.', |
| -- | 48 | -- | 'சரியான கணக்கில் ஏற்கெனவே வரவு வைக்கப்பட்ட ரீசார்ஜை மீட்டெடுக்க முடியாமல் இருக்கலாம். தவறான எண்ணை உள்ளிட்டால், கிடைக்கும் வழிகளைச் சரிபார்க்க உடனே உதவிக் குழுவைத் தொடர்புகொள்ளவும். சேவைத் தவறு உட்பட சட்டப்படி கிடைக்கும் பணத்திருப்பல் மற்றும் தீர்வுகளை இந்தக் கொள்கை மறுக்காது.', |
| -- | 49 | -- | ] }, |
| -- | 50 | -- | { heading: 'தோல்வி, இரட்டைக் கட்டணம் மற்றும் நிலுவை', paragraphs: [ |
| -- | 51 | -- | 'பணம் பிடிக்கப்பட்டும் ரீசார்ஜ் தோல்வியடைந்தால், இருமுறை பணம் செலுத்தப்பட்டால் அல்லது முடிவு தெளிவாக இல்லாவிட்டால் உதவிக் குழுவைத் தொடர்புகொள்ளவும். ஆர்டர் மற்றும் கட்டண எண்களைத் தெரிவிக்கவும். இறுதி நிலையை உறுதிசெய்யும் முன் கட்டணச் சேவையிடமும் ஆபரேட்டரிடமும் சரிபார்க்க வேண்டும்.', |
| -- | 52 | -- | 'இரண்டாவது கட்டணம் முதல் கட்டணத்திலிருந்து தனியாகச் சரிபார்க்கப்படும். தெளிவில்லாத அல்லது நிலுவையில் உள்ள பரிவர்த்தனை தோல்வியடைந்ததாகக் கருத வேண்டாம். சரிபார்ப்பு நடக்கும்போது மீண்டும் மீண்டும் பணம் செலுத்த வேண்டாம்.', |
| -- | 53 | -- | &#96;நிலுவையைச் சரிபார்க்கும் காலம்: ${b.reconciliation}. பணத்திருப்பல் தகுதியைச் சரிபார்க்கும் காலம்: ${b.refundReview}.&#96;, |
| -- | 54 | -- | ] }, |
| -- | 55 | -- | { heading: 'ஒப்புதல் பெற்ற பணத்திருப்பல்கள்', paragraphs: [ |
| -- | 56 | -- | 'பணம் திருப்பித் தரப்பட வேண்டுமெனில், தொகையையும் குறிப்பு எண்ணையும் உதவிக் குழு உறுதிசெய்யும். வசதி இருந்தால் முதலில் பயன்படுத்திய கட்டண முறையிலேயே பணம் திருப்பித் தரப்படும். அது முடியாவிட்டால் ஆவணப்படுத்தப்பட்ட மாற்று முறையை உதவிக் குழு விளக்க வேண்டும். பணத்திருப்பலைப் பெற மேலும் பணம் அனுப்பவோ UPI PIN பகிரவோ வேண்டாம்.', |
| -- | 57 | -- | &#96;ஒப்புதலுக்குப் பிறகு பணத்திருப்பலைத் தொடங்கும் காலம்: ${b.refundProcessing}. அதன் பிறகு பணம் வரவு வைக்கப்படும் எதிர்பார்க்கப்படும் காலம்: ${b.bankCredit}. வங்கி மற்றும் சேவை வழங்குநரின் செயலாக்கத்தால் நேரம் மாறலாம். பொருந்தும் சட்டத் தேவைகளுக்கே இந்த வரைவுக் கொள்கையைவிட முன்னுரிமை உண்டு.&#96;, |
| -- | 58 | -- | ] }, |
| -- | 59 | -- | ], |
| -- | 60 | -- | privacy: [ |
| -- | 61 | -- | { heading: 'உங்கள் தகவலைக் கையாளுபவர்', paragraphs: [ |
| -- | 62 | -- | &#96;டிடிஎச் தமிழனை நடத்தும் வணிகம்: ${b.legalName}. முகவரி: ${b.address}. தனியுரிமை கேள்விகளையும் கோரிக்கைகளையும் ${b.email} முகவரிக்கு அனுப்பலாம். தீர்க்கப்படாத சிக்கல்களுக்கு ${b.grievanceEmail} முகவரியில் மேல்முறையீடு செய்யலாம்.&#96;, |
| -- | 63 | -- | ] }, |
| -- | 64 | -- | { heading: 'சேவை பயன்படுத்தும் தகவல்கள்', paragraphs: [ |
| -- | 65 | -- | 'கணக்குத் தகவல்களில் Google/Firebase பயனர் எண், பெயர், மின்னஞ்சல், சுயவிவரப் படம் மற்றும் நீங்கள் வழங்கும் தொலைபேசி எண் இருக்கலாம். சேமித்த பெட்டி மற்றும் ரீசார்ஜ் விவரங்களில் ஆபரேட்டர், கணக்கு எண், பெட்டியின் பெயர், பேக், தொகை, பரிவர்த்தனை எண்கள் மற்றும் நிலை இருக்கலாம். உதவிக்காக நீங்கள் அனுப்பும் தகவல்களும் பதிவாகலாம்.', |
| -- | 66 | -- | 'கணக்கைக் காட்டுவதற்கான விவரங்கள், மொழி, தேர்ந்தெடுத்த ஆபரேட்டர் மற்றும் சேமித்த பெட்டி விவரங்களுக்கு உலாவிச் சேமிப்பகம் பயன்படுத்தப்படுகிறது. அதை அழிப்பது உள்ளூர் நகல்களை மட்டுமே நீக்கும்; சேவையகப் பதிவுகள் தானாக நீங்காது, எல்லாச் சேவைகளிலிருந்தும் நீங்கள் வெளியேற்றப்படவும் மாட்டீர்கள்.', |
| -- | 67 | -- | 'இணையக் கோரிக்கைகள் மூலம் IP முகவரி, உலாவி அல்லது சாதன விவரங்கள் மற்றும் தொழில்நுட்பப் பதிவுகள் ஹோஸ்டிங் மற்றும் பிற சேவை வழங்குநர்களுக்குத் தெரியலாம். உள்நுழைவுக்கு Google/Firebase, எழுத்துருக்களுக்கு Google சேவைகள் பயன்படுத்தப்படுகின்றன. சேவை வழங்குநர்கள், விருப்ப வசதிகள் மற்றும் செயலாக்க இடங்கள் கீழே உறுதிசெய்யப்பட வேண்டும்.', |
| -- | 68 | -- | 'இந்தக் கட்டணப் பக்கம் கார்டு எண்கள், CVV அல்லது UPI PIN பெறுவதில்லை. பின்னர் கட்டணச் சேவை இயக்கப்பட்டால், அதன் பக்கமும் தனியுரிமை அறிவிப்பும் கட்டண விவரங்கள் எவ்வாறு கையாளப்படுகின்றன என்பதை விளக்க வேண்டும்.', |
| -- | 69 | -- | ] }, |
| -- | 70 | -- | { heading: 'பயன்பாடு, பகிர்வு மற்றும் சேமிப்புக் காலம்', paragraphs: [ |
| -- | 71 | -- | 'உள்நுழைவு, சேமித்த பெட்டிகளை நிர்வகித்தல், ரீசார்ஜ் கோரிக்கைகள், கட்டண நிலைச் சரிபார்ப்பு, வாடிக்கையாளர் உதவி, தவறான பயன்பாட்டைத் தடுத்தல் மற்றும் சட்டப்படி தேவையான பதிவுகளுக்குத் தகவல்கள் பயன்படுத்தப்படுகின்றன. கோரிய பரிவர்த்தனைக்குத் தேவையான தகவல்களை ஆபரேட்டர்களும் கட்டணச் சேவைகளும் பெறுவர். ஹோஸ்டிங் மற்றும் உள்நுழைவுச் சேவைகள் அவற்றின் பணிகளுக்கான தகவல்களைச் செயலாக்கும்.', |
| -- | 72 | -- | &#96;சேவை வழங்குநர்களும் செயலாக்க இடங்களும்: ${b.processors}. கூடுதல் பகுப்பாய்வு, விளம்பரம், சந்தைப்படுத்தல் அல்லது தரவுப் பகிர்வு தொடங்கும் முன் அவற்றைப் பற்றித் தெரிவிக்க வேண்டும்.&#96;, |
| -- | 73 | -- | &#96;தகவல் வைத்திருக்கும் காலம்: ${b.retention}. சட்டம், வரி, தகராறு அல்லது மோசடித் தடுப்புக்காக எது வைத்திருக்கப்படுகிறது, மற்ற தகவல் எப்போது நீக்கப்படும் என்பதை இறுதி அட்டவணை விளக்க வேண்டும்.&#96;, |
| -- | 74 | -- | ] }, |
| -- | 75 | -- | { heading: 'உங்கள் தேர்வுகளும் கோரிக்கைகளும்', paragraphs: [ |
| -- | 76 | -- | 'இந்தியச் சட்டத்திற்கு ஏற்ப தகவல் அணுகல், திருத்தம், நீக்கம், ஒப்புதலைத் திரும்பப் பெறுதல் அல்லது தனியுரிமைப் புகாருக்கு உதவிக் குழுவைத் தொடர்புகொள்ளவும். கணக்கைப் பாதுகாக்கச் சரிபார்ப்பு தேவைப்படலாம். சட்டப்படி தகவலை வைத்திருக்க வேண்டியதால் நீக்க முடியாவிட்டால் அதை விளக்குவோம். அடையாளச் சான்றாக கடவுச்சொல் அல்லது கட்டண ரகசியங்களை அனுப்ப வேண்டாம்.', |
| -- | 77 | -- | 'விருப்ப வசதிகளைப் பயன்படுத்துவது உங்கள் தேர்வு. இந்த வரைவு தனியான சந்தைப்படுத்தல் ஒப்புதலை ஏற்படுத்தாது. சேவையோ வழங்குநர்களோ மாறும்போது தனியுரிமை விவரங்களும் நடைமுறைத் தேதியும் புதுப்பிக்கப்பட வேண்டும்.', |
| -- | 78 | -- | ] }, |
| -- | 79 | -- | ], |
| -- | 80 | -- | terms: [ |
| -- | 81 | -- | { heading: 'வணிகமும் சேவையின் வரம்பும்', paragraphs: [ |
| -- | 82 | -- | &#96;டிடிஎச் தமிழனை நடத்துபவர்: ${b.legalName}. பதிவு முகவரி: ${b.address}. GST விவரம்: ${b.gstin}. இந்த வரைவு விதிமுறைகள் இந்தியாவில் இணையதளப் பயன்பாடு மற்றும் டிடிஎச் ரீசார்ஜ் அல்லது உதவிக் கோரிக்கைகளுக்குப் பொருந்தும்.&#96;, |
| -- | 83 | -- | 'ஆபரேட்டர் பெயர்களும் சின்னங்களும் சேவையை அடையாளம் காண உதவுகின்றன. அவை இடம்பெறுவது மட்டும் அங்கீகரிக்கப்பட்ட கூட்டாண்மை, ஆதரவு அல்லது தொடர்பைக் குறிக்காது.', |
| -- | 84 | -- | ] }, |
| -- | 85 | -- | { heading: 'உங்கள் கோரிக்கையும் இறுதித் தொகையும்', paragraphs: [ |
| -- | 86 | -- | 'சரியான கணக்கு மற்றும் தொடர்பு விவரங்களைப் பயன்படுத்தவும். ஆபரேட்டர், பேக், காலம் மற்றும் இறுதித் தொகையைச் சரிபார்க்கவும். அனுமதியின்றி பிறரின் கணக்கைப் பயன்படுத்தவோ ரீசார்ஜ் செய்யவோ வேண்டாம். உள்நுழைவு விவரங்களை ரகசியமாக வைத்திருக்கவும். மோசடி அல்லது சேவையைத் தடுக்கும் செயல்களுக்குத் தளத்தைப் பயன்படுத்த வேண்டாம்.', |
| -- | 87 | -- | &#96;விலைகள் Rs. என்று காட்டப்படும் இந்திய ரூபாய் தொகைகள். கட்டணங்கள், வரிகள் மற்றும் ரசீது விவரங்கள்: ${b.feesAndTaxes}. பட்டியலில் இருப்பதால் ஆபரேட்டர் ஏற்றுக்கொள்வார் என்றோ தவறான விவரப்படி சேவை வழங்கப்படும் என்றோ உறுதியளிக்கப்படாது. சட்ட உரிமைகளைப் பாதிக்காமல் தவறுகள் விளக்கப்பட்டுத் தீர்க்கப்பட வேண்டும்.&#96;, |
| -- | 88 | -- | ] }, |
| -- | 89 | -- | { heading: 'கட்டணம் மற்றும் ரீசார்ஜ் நிலை', paragraphs: [ |
| -- | 90 | -- | 'பொத்தானை அழுத்தியதாலோ வேறு பக்கத்திற்குச் சென்றதாலோ பணம் பிடிக்கப்பட்டதாலோ மட்டும் ரீசார்ஜ் நிறைவடைந்ததாகாது. கட்டணத்திற்கு சேவை வழங்குநரின் உறுதியும் ரீசார்ஜிற்கு ஆபரேட்டரின் உறுதியும் தேவை. செயலாக்கத்தால் தாமதம் ஏற்படலாம்; உடனடியாகச் செயல்படும் என்று உறுதியளிக்கப்படவில்லை.', |
| -- | 91 | -- | 'தெளிவாகச் சோதனை என்று குறிக்கப்பட்ட அமர்வு ஒரு முடிவை உருவகப்படுத்தும் வசதி மட்டுமே. உண்மையான கட்டணம், ரீசார்ஜ் அல்லது கணக்கில் வரவு எதுவும் நடைபெறாது. உண்மையான கட்டணச் சேவை அமைக்கப்படும் வரை நேரடிக் கட்டணம் கிடைக்காது.', |
| -- | 92 | -- | ] }, |
| -- | 93 | -- | { heading: 'பணத்திருப்பல், தனியுரிமை மற்றும் சிக்கல்கள்', paragraphs: [ |
| -- | 94 | -- | 'தோல்வி, இரட்டைக் கட்டணம், நிலுவைப் பரிவர்த்தனை மற்றும் ரத்துக் கோரிக்கைகளுக்குப் பணத்திருப்பல் மற்றும் ரத்துக் கொள்கையைப் படிக்கவும். தகவல் கையாளுதலுக்குத் தனியுரிமைக் கொள்கையைப் படிக்கவும். சேவையைப் பயன்படுத்தும் முன் கேள்விகள் இருந்தால் உதவிக் குழுவைத் தொடர்புகொள்ளவும்.', |
| -- | 95 | -- | 'சேவை கிடைக்கும் நிலை, சேனல் பட்டியல் மற்றும் ஆபரேட்டர் கொள்கைகள் மாறலாம். சேவையை வழங்க முடியாவிட்டாலோ தவறு ஏற்பட்டாலோ கிடைக்கும் தீர்வை உதவிக் குழு விளக்க வேண்டும். சட்டப்படி விலக்க முடியாத உரிமைகளையோ பொறுப்புகளையோ இந்த விதிமுறைகள் விலக்காது.', |
| -- | 96 | -- | ] }, |
| -- | 97 | -- | { heading: 'புகார்களும் பொருந்தும் சட்டமும்', paragraphs: [ |
| -- | 98 | -- | &#96;உதவி: ${b.email}. மேல்முறையீடு: ${b.grievanceOfficer}, ${b.grievanceEmail}. ஆர்டர் எண்ணையும் நீங்கள் எதிர்பார்க்கும் தீர்வையும் தெரிவிக்கவும்.&#96;, |
| -- | 99 | -- | 'பொருந்தும் இந்தியச் சட்டங்களே இந்த விதிமுறைகளை நிர்வகிக்கும். உரிய நுகர்வோர் மன்றம், ஒழுங்குமுறை அமைப்பு அல்லது நீதிமன்றத்தை அணுகும் உரிமை பாதுகாக்கப்படுகிறது; ஒரே தகராறு மன்றத்தை மட்டும் அணுக வேண்டும் என்று கட்டாயப்படுத்தப்படவில்லை. முக்கிய மாற்றங்கள் புதுப்பிக்கப்பட்ட நடைமுறைத் தேதியுடன் தெரிவிக்கப்பட வேண்டும்; பழைய பரிவர்த்தனையின் உரிமைகளைப் பின்னோக்கி நீக்கக் கூடாது.', |
| -- | 100 | -- | ] }, |
| -- | 101 | -- | ], |
| -- | 102 | -- | }; |

## src/lib/subscriberValidation.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 2 | -- | import { translations } from './translations'; |
| -- | 3 | -- | import { formatMessage } from './customerMessages'; |
| -- | 24 | -- | export function subscriberLabel(operator: DthOperatorId, combined = false, lang: Language = 'en'): string { |
| -- | 25 | -- | const t = translations[lang]; |
| -- | 26 | -- | if (combined && (operator === 'dish_tv' \|\| operator === 'd2h')) return t.combinedIdLabel; |
| -- | 27 | -- | return { sun_direct: t.sunIdLabel, tata_play: t.tataIdLabel, airtel_dth: t.customerIdLabel, dish_tv: t.dishIdLabel, d2h: t.customerIdLabel }[operator]; |
| -- | 28 | -- | } |
| -- | 29 | -- | export function subscriberPlaceholder(operator: DthOperatorId, combined = false, lang: Language = 'en'): string { |
| -- | 30 | -- | return formatMessage(translations[lang].uiEnterOperatorId, { label: subscriberLabel(operator, combined, lang) }); |
| -- | 31 | -- | } |
| 25 | 35 | if (lang === 'ta') { | return formatMessage(translations[lang].uiIdHelp, { label: subscriberLabel(operator, combined, lang), lengths: rule.lengths.join(' / '), prefix: rule.prefixes.length ? formatMessage(translations[lang].uiIdPrefix, { prefixes: rule.prefixes.join(' / ') }) : '' }); |
| 26 | -- | const labels = { sun_direct: 'ஸ்மார்ட் கார்டு எண்', tata_play: 'சந்தாதாரர் எண்', airtel_dth: 'வாடிக்கையாளர் எண்', dish_tv: 'வியூவிங் கார்டு எண்', d2h: 'வாடிக்கையாளர் எண்' }; | -- |
| 27 | -- | return &#96;${labels[operator]}: ${rule.lengths.join(' / ')} இலக்கங்கள்${rule.prefixes.length ? &#96;; ${rule.prefixes.join(' / ')} என்று தொடங்க வேண்டும்&#96; : ''}&#96;; | -- |
| 28 | -- | } | -- |
| 29 | -- | return &#96;${rule.label}: ${rule.lengths.join(' / ')} digits${rule.prefixes.length ? &#96;; starts with ${rule.prefixes.join(' / ')}&#96; : ''}&#96;; | -- |
| 37 | 43 | const help = rule ? subscriberHelp(resolved as DthOperatorId, false, lang) : lang === 'ta' ? 'ஆதரிக்கப்படும் ஆபரேட்டரைத் தேர்ந்தெடுக்கவும்' : 'Select a supported operator'; | const help = rule ? subscriberHelp(resolved as DthOperatorId, false, lang) : translations[lang].uiSupportedOperator; |
| 38 | 44 | return lang === 'ta' ? &#96;\u0b87\u0ba8\u0bcd\u0ba4 \u0b8e\u0ba3\u0bcd\u0ba3\u0bc8\u0ba4\u0bcd \u0ba4\u0bbf\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bb5\u0bc1\u0bae\u0bcd. ${help}.&#96; : &#96;Please update this ID. ${help}.&#96;; | return formatMessage(translations[lang].uiUpdateId, { help }); |

## src/lib/topUpAmount.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 2 | -- | import { customerMessages, formatMessage } from './customerMessages'; |
| 12 | 13 | return lang === 'ta' | return formatMessage(customerMessages[lang].uiAmountBounds, { min: TOP_UP_LIMITS.min, max: TOP_UP_LIMITS.max.toLocaleString('en-IN'), decimals: TOP_UP_LIMITS.decimalPlaces }); |
| 13 | -- | ? &#96;₹${TOP_UP_LIMITS.min} முதல் ₹${TOP_UP_LIMITS.max.toLocaleString('en-IN')} வரை, அதிகபட்சம் ${TOP_UP_LIMITS.decimalPlaces} தசம இடங்களுடன் தொகையை உள்ளிடவும்.&#96; | -- |
| 14 | -- | : &#96;Enter an amount from ₹${TOP_UP_LIMITS.min} to ₹${TOP_UP_LIMITS.max.toLocaleString('en-IN')} with no more than ${TOP_UP_LIMITS.decimalPlaces} decimal places.&#96;; | -- |

## src/lib/translations.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| -- | 1 | -- | import { customerMessages } from './customerMessages'; |
| -- | 6 | -- | ...customerMessages.en, |
| 6 | 8 | brandTagline: 'DTH recharge requests and support', | brandTagline: 'DTH recharge and support for Tamil Nadu.', |
| 7 | 9 | navRecharge: 'Quick Recharge', | heroDescription: 'Choose your DTH operator, enter your customer ID, and check the total before paying.', |
| -- | 10 | -- | heroHeading: 'Recharge your DTH connection', |
| -- | 11 | -- | customDescription: 'Enter a recharge amount of Rs. 10 or more.', |
| -- | 12 | -- | selectedAction: 'Selected', |
| -- | 13 | -- | selectAction: 'Select', |
| -- | 14 | -- | sunIdLabel: 'Smart Card Number', |
| -- | 15 | -- | tataIdLabel: 'Subscriber ID', |
| -- | 16 | -- | customerIdLabel: 'Customer ID', |
| -- | 17 | -- | dishIdLabel: 'Viewing Card (VC)', |
| -- | 18 | -- | combinedIdLabel: 'Viewing Card / Customer ID', |
| -- | 19 | -- | navRecharge: 'Recharge', |
| 28 | 40 | signOut: 'Sign Out', | signOut: 'Log out', |
| 46 | 58 | subscriberFound: 'Subscriber Found', | subscriberFound: 'Customer found', |
| 58 | 70 | customPack: 'Quick Custom Top-up', | customPack: 'Recharge with your own amount', |
| 60 | 72 | enterAmount: 'Enter Amount (₹)', | enterAmount: 'Enter Amount (Rs.)', |
| 65 | 77 | months: 'Months', | months: 'months', |
| 66 | 78 | month: 'Month', | month: 'month', |
| 95 | 107 | loadingCatalog: 'Loading live recharge packs...', | loadingCatalog: 'Loading available recharge packs…', |
| 96 | 108 | catalogLoadError: 'Unable to load real-time plan catalog. Please check network connection.', | catalogLoadError: 'Unable to load available packs. Check your connection and try again.', |
| 98 | 110 | noPlansMatch: 'No packs match your current filter criteria.', | noPlansMatch: 'No matching packs. Try another search or clear your filters.', |
| 112 | 124 | secureEncryption: 'Review the payment provider and order details before paying', | secureEncryption: 'Review your payment details before continuing.', |
| 121 | 133 | saveBoxPrompt: 'Save this Viewing Card for fast one-click recharges', | saveBoxPrompt: 'Save this connection for faster recharges', |
| 122 | 134 | subscriberName: 'Subscriber Name', | subscriberName: 'Customer name', |
| 124 | 136 | receiptConfirmation: 'Receipt & SMS Confirmation', | receiptConfirmation: 'Mobile number for your recharge receipt', |
| 125 | 137 | instantActivation: 'Activation requires operator confirmation', | instantActivation: 'Track your recharge status after payment.', |
| 126 | 138 | mobileNumberSms: 'Mobile Number (SMS Receipt) *', | mobileNumberSms: 'Mobile number for your recharge receipt', |
| 127 | 139 | enterValid10Digit: 'Please enter a valid 10-digit mobile number for receipt dispatch', | enterValid10Digit: 'Enter a valid 10-digit mobile number for your recharge receipt.', |
| 134 | 146 | rechargeAmountLabel: 'Amount Paid', | rechargeAmountLabel: 'Recharge amount', |
| 226 | 238 | boxNicknamePlaceholder: 'e.g. Living Room TV', | boxNicknamePlaceholder: 'Enter a box nickname', |
| 251 | 263 | priceInrLabel: 'Price (₹)', | priceInrLabel: 'Price (Rs.)', |
| 286 | 298 | recommendedHd: '👑 RECOMMENDED HD', | recommendedHd: 'Recommended HD', |
| 287 | 299 | recommendedSd: '📦 RECOMMENDED SD', | recommendedSd: 'Recommended SD', |
| 288 | 300 | flexibleTopUp: '⚡ FLEXIBLE TOP-UP', | flexibleTopUp: 'Flexible top-up', |
| 291 | 303 | loadingLiveCatalog: 'Loading live recharge packs from satellite...', | loadingLiveCatalog: 'Loading available recharge packs…', |
| 292 | 304 | failedToLoadCatalog: 'Unable to load real-time plan catalog', | failedToLoadCatalog: 'Unable to load available recharge packs.', |
| 299 | 311 | madeWithLove: 'Made with love for DTH Viewers Across Tamil Nadu', | madeWithLove: 'Helping Tamil Nadu households keep their favourite channels on.', |
| 350 | 362 | initialBalance: 'Initial Balance (₹)', | initialBalance: 'Initial Balance (Rs.)', |
| -- | 377 | -- | ...customerMessages.ta, |
| 366 | 379 | brandTagline: 'டிடிஎச் ரீசார்ஜ் கோரிக்கைகள் மற்றும் உதவி', | // Draft Tamil copy: native-speaker review required before publication. |
| 367 | 380 | navRecharge: 'உடனடி ரீசார்ஜ்', | brandTagline: 'தமிழ்நாட்டிற்கான டிடிஎச் ரீசார்ஜ் மற்றும் உதவி.', |
| 368 | 381 | navPlans: 'பேக்குகளை காண்க', | heroDescription: 'உங்கள் டிடிஎச் ஆபரேட்டரைத் தேர்ந்தெடுத்து, வாடிக்கையாளர் எண்ணை உள்ளிட்டு, பணம் செலுத்தும் முன் மொத்தத் தொகையைச் சரிபார்க்கவும்.', |
| 369 | 382 | navConnections: 'என் செட்-டாப் பாக்ஸ்கள்', | heroHeading: 'உங்கள் டிடிஎச் இணைப்பை ரீசார்ஜ் செய்யுங்கள்', |
| -- | 383 | -- | customDescription: 'Rs. 10 அல்லது அதற்கு மேற்பட்ட ரீசார்ஜ் தொகையை உள்ளிடவும்.', |
| -- | 384 | -- | selectedAction: 'தேர்ந்தெடுக்கப்பட்டது', |
| -- | 385 | -- | selectAction: 'தேர்ந்தெடு', |
| -- | 386 | -- | sunIdLabel: 'ஸ்மார்ட் கார்டு எண்', |
| -- | 387 | -- | tataIdLabel: 'சந்தாதாரர் எண்', |
| -- | 388 | -- | customerIdLabel: 'வாடிக்கையாளர் எண்', |
| -- | 389 | -- | dishIdLabel: 'வியூவிங் கார்டு எண்', |
| -- | 390 | -- | combinedIdLabel: 'வியூவிங் கார்டு / வாடிக்கையாளர் எண்', |
| -- | 391 | -- | navRecharge: 'ரீசார்ஜ்', |
| -- | 392 | -- | navPlans: 'பேக்குகள்', |
| -- | 393 | -- | navConnections: 'என் பெட்டிகள்', |
| 417 | 441 | changePacks: 'அனைத்து பேக்குகளையும் காண்க', | changePacks: '{brand} பேக்குகள் அனைத்தும்', |
| 418 | 442 | customPack: 'விருப்பத் தொகை ரீசார்ஜ்', | customPack: 'உங்கள் விருப்பத் தொகையில் ரீசார்ஜ் செய்யவும்', |
| 420 | 444 | enterAmount: 'தொகையை உள்ளிடவும் (₹)', | enterAmount: 'தொகையை உள்ளிடவும் (Rs.)', |
| 455 | 479 | loadingCatalog: 'ரீசார்ஜ் பேக்குகள் ஏற்றப்படுகின்றன...', | loadingCatalog: 'கிடைக்கும் ரீசார்ஜ் பேக்குகள் ஏற்றப்படுகின்றன…', |
| 458 | 482 | noPlansMatch: 'நீங்கள் தேர்ந்தெடுத்த வடிகட்டலுக்கு ஏற்ற பேக்குகள் இல்லை.', | noPlansMatch: 'பொருந்தும் பேக்குகள் இல்லை. வேறு சொற்களைத் தேடவும் அல்லது வடிகட்டல்களை நீக்கவும்.', |
| 472 | 496 | secureEncryption: 'பணம் செலுத்தும் முன் கட்டணச் சேவை மற்றும் ஆர்டர் விவரங்களைப் பார்க்கவும்', | secureEncryption: 'தொடர்வதற்கு முன் உங்கள் கட்டண விவரங்களைச் சரிபார்க்கவும்.', |
| 481 | 505 | saveBoxPrompt: 'விரைவு ரீசார்ஜிற்கு இந்த ஸ்மார்ட் கார்டு எண்ணை சேமிக்கவும்', | saveBoxPrompt: 'அடுத்த முறை ரீசார்ஜ் செய்ய இந்த இணைப்பைச் சேமிக்கவும்', |
| 484 | 508 | receiptConfirmation: 'ரசீது மற்றும் SMS உறுதிப்படுத்தல்', | receiptConfirmation: 'உங்கள் ரீசார்ஜ் ரசீதுக்கான மொபைல் எண்', |
| 485 | 509 | instantActivation: 'செயல்படுத்த ஆபரேட்டரின் உறுதிப்படுத்தல் தேவை', | instantActivation: 'பணம் செலுத்திய பிறகு உங்கள் ரீசார்ஜ் நிலையைப் பார்க்கவும்.', |
| 486 | 510 | mobileNumberSms: 'மொபைல் எண் (SMS ரசீது) *', | mobileNumberSms: 'உங்கள் ரீசார்ஜ் ரசீதுக்கான மொபைல் எண்', |
| 494 | 518 | rechargeAmountLabel: 'செலுத்திய தொகை', | rechargeAmountLabel: 'ரீசார்ஜ் தொகை', |
| 586 | 610 | boxNicknamePlaceholder: 'எ.கா: ஹால் டிவி', | boxNicknamePlaceholder: 'பெட்டிக்கு ஒரு பெயர் உள்ளிடவும்', |
| 611 | 635 | priceInrLabel: 'விலை (₹)', | priceInrLabel: 'விலை (Rs.)', |
| 646 | 670 | recommendedHd: '👑 பரிந்துரைக்கப்பட்ட HD', | recommendedHd: 'பரிந்துரைக்கப்படும் HD', |
| 647 | 671 | recommendedSd: '📦 பரிந்துரைக்கப்பட்ட SD', | recommendedSd: 'பரிந்துரைக்கப்படும் SD', |
| 648 | 672 | flexibleTopUp: '⚡ விருப்பத் தொகை ரீசார்ஜ்', | flexibleTopUp: 'விருப்பத் தொகை ரீசார்ஜ்', |
| 651 | 675 | loadingLiveCatalog: 'நேரலை ரீசார்ஜ் பேக்குகள் ஏற்றப்படுகின்றன...', | loadingLiveCatalog: 'கிடைக்கும் ரீசார்ஜ் பேக்குகள் ஏற்றப்படுகின்றன…', |
| 659 | 683 | madeWithLove: 'தமிழ்நாடு டிடிஎச் வாடிக்கையாளர்களுக்காக உருவாக்கப்பட்டது', | madeWithLove: 'தமிழ்நாட்டுக் குடும்பங்கள் தங்களுக்குப் பிடித்த சேனல்களைத் தொடர்ந்து பார்க்க உதவுகிறோம்.', |
| 710 | 734 | initialBalance: 'தொடக்க இருப்பு (₹)', | initialBalance: 'தொடக்க இருப்பு (Rs.)', |

## src/lib/trustContent.ts

| Before line | Current line | Previous source / string | Current source / string |
| ---: | ---: | --- | --- |
| 91 | 91 | &#96;Prices are in Indian rupees. Applicable charges, tax treatment and invoice details: ${b.feesAndTaxes}. A catalog listing is not a guarantee of operator acceptance or a promise that an incorrect listing will be supplied. Errors must be explained and resolved without removing your statutory rights.&#96;, | &#96;Prices are shown as Rs. Applicable charges, tax treatment and invoice details: ${b.feesAndTaxes}. A catalog listing is not a guarantee of operator acceptance or a promise that an incorrect listing will be supplied. Errors must be explained and resolved without removing your statutory rights.&#96;, |

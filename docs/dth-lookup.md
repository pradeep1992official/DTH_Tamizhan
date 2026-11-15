# DTH lookup providers

Customer forms use this priority: Way2API, EzyTM / PlanAPI, then DataYuge.
Providers with incomplete configuration are skipped. Admin > API test shows
readiness and supports testing one provider or the automatic fallback chain.
All endpoints fetch account details only; none submit recharges.

## Server configuration

- Way2API: `WAY2API_API_KEY`.
- PlanAPI: `PLANAPI_MEMBER_ID` and `PLANAPI_API_PASSWORD`.
- DataYuge: `DATAYUGE_API_KEY` and `DATAYUGE_DTH_RESPONSE_MAP`.

Restart the server after environment changes. Do not use VITE_ variables for
credentials. PlanAPI and DataYuge document credentials in GET parameters; calls
are server-side over HTTPS, redirects are rejected, and request URLs are never
logged or returned to browsers.

## DataYuge response mapping

The official Postman reference publishes the GET endpoint and operator codes,
but provides no response body. Ask DataYuge for a current successful JSON response
and its success indicator before enabling this provider. A key alone does not
make DataYuge ready.

Set `DATAYUGE_DTH_RESPONSE_MAP` to JSON with:

- `successPath`: dot-separated path to the verified success indicator.
- `successValue`: its exact boolean, string or numeric success value.
- `fields`: canonical field names mapped to dot-separated response paths.

For example, **only if a verified response matches this synthetic schema**:

```json
{"success":true,"account":{"name":"Demo customer","balance":"125.00"}}
```

the mapping is:

```json
{"successPath":"success","successValue":true,"fields":{"name":"account.name","balance":"account.balance"}}
```

Supported canonical fields: customer_id, name, registered_mobile, balance,
monthly_amount, status, plan, next_recharge_date, last_recharge_date,
last_recharge_amount, switch_off_date, address, city, district, state, pin_code.
Customer responses exclude address and registered mobile information.

## Fallback and billing

Automatic fallback follows explicit, unbilled Way2API service/account failures
(for example insufficient credit, invalid key, no API access or rate limiting).
PlanAPI's documented authentication failure can also advance to DataYuge.
No fallback occurs after a successful, charged, pending, invalid-account,
unreadable, or timed-out lookup. Unknown billing or processing status stops the
chain. Providers do not necessarily share trial credits; use their dashboards
to confirm pricing and allowances.

Customer budget reservations apply **per provider attempt**, including fallback
attempts. Existing short-lived per-user caching and concurrent-request deduplication
remain in effect. Admin tests expose the attempted provider list and billing
flags without exposing credentials or unfiltered provider responses.

## Sources

- https://app.way2api.com/documentation/dth-info/response
- https://planapi.in/ApiDocument.aspx
- https://planapi.in/OperatorList.aspx
- https://datayuge.com/products/dth-customer-info-api/
- https://documenter.getpostman.com/view/49007/RzfjknVp

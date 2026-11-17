import { setClientRechargeEnabled } from '../../src/lib/rechargeFeature';
// Preserve the historical contract deliberately; disabled-mode tests override both values.
process.env.RECHARGE_ENABLED = 'true';
setClientRechargeEnabled(true);

import { CustomerRecord, RechargeOrder, DthOperatorId } from '../../src/types';

const scenarios: Array<{ operator: DthOperatorId; name: string; card: string; pack: string; price: number; months: 1 | 6 | 12; quality: 'HD' | 'SD' }> = [
  { operator: 'sun_direct', name: 'Sun Direct', card: '40000000001', pack: 'Economy HD', price: 1399, months: 6, quality: 'HD' },
  { operator: 'tata_play', name: 'Tata Play', card: '1000000002', pack: 'Tamil Thalaiva HDs', price: 329, months: 1, quality: 'HD' },
  { operator: 'airtel_dth', name: 'Airtel DTH', card: '3000000003', pack: 'Tamil Super Star Pack', price: 2581, months: 12, quality: 'SD' },
  { operator: 'dish_tv', name: 'Dish TV', card: '02500000004', pack: 'Tamil Super SD', price: 210, months: 1, quality: 'SD' },
  { operator: 'd2h', name: 'D2H', card: '80000005', pack: 'Tamil Joy SD', price: 205, months: 1, quality: 'SD' },
];

export function createDemoAdminData(now = new Date()) {
  const names = ['Demo - Arun Kumar', 'Demo - Meena Ravi', 'Demo - Priya Selvam', 'Demo - Bala Murugan', 'Demo - Kavitha Raj'];
  const cities = ['Madurai', 'Chennai', 'Coimbatore', 'Trichy', 'Salem'];
  const customers: CustomerRecord[] = scenarios.map((item, index) => {
    const recharge = new Date(now.getTime() - (index === 2 ? 370 : index === 1 ? 29 : 5) * 86400000);
    return {
      id: `demo-customer-${index + 1}`, customerName: names[index], registeredMobile: `900000000${index + 1}`,
      smartCardNumber: item.card, operator: item.operator, operatorName: item.name, activePackName: item.pack,
      currentBalance: [150, 25, 0, 89.5, 210][index], expiryDate: new Date(recharge.getTime() + item.months * 30 * 86400000).toISOString().slice(0, 10),
      accountStatus: index === 2 ? 'Expired' : 'Active', planQuality: item.quality, registeredCity: cities[index],
      registeredPincode: ['625001', '600001', '641001', '620001', '636001'][index], lastRechargeAmount: item.price,
      lastRechargeDate: recharge.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
  });
  const orders: RechargeOrder[] = scenarios.map((item, index) => ({
    orderId: `DEMO-ORDER-${index + 1}`, user_id: `demo-customer-${index + 1}`, operator: item.operator, operatorName: item.name,
    smartCardNumber: item.card, customerName: names[index], registeredMobile: customers[index].registeredMobile,
    amount: item.price, packId: `demo-pack-${index + 1}`, packName: item.pack, packValidity: `${item.months * 30} Days`,
    paymentMethod: (['upi', 'qr_code', 'card', 'netbanking', 'wallet'] as const)[index], paymentStatus: 'initiated',
    rechargeStatus: 'pending', operatorRefId: '', workerNotes: 'DEMO DATA - synthetic order; do not dispatch a real recharge.',
    createdAt: new Date(now.getTime() - (index + 1) * 600000).toISOString(), updatedAt: now.toISOString(),
  }));
  return { customers, orders };
}

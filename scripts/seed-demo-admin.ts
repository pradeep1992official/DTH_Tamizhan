import { createDemoAdminData } from '../src/lib/demoAdminData';
import { initStoreFromDisk, MEMORY_CUSTOMERS, MEMORY_RECHARGE_ORDERS, saveCustomersToDisk, saveOrdersToDisk } from '../server/models/store';

initStoreFromDisk();
const { customers, orders } = createDemoAdminData();
for (const customer of customers) if (!MEMORY_CUSTOMERS.some((record) => record.id === customer.id)) MEMORY_CUSTOMERS.push(customer);
for (const order of orders) if (!MEMORY_RECHARGE_ORDERS.some((record) => record.orderId === order.orderId)) MEMORY_RECHARGE_ORDERS.push(order);
saveCustomersToDisk();
saveOrdersToDisk();
console.log(`Saved ${customers.length} demo customers and ${orders.length} demo pending/processing orders. Existing records preserved.`);

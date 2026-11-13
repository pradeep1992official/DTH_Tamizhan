import fs from 'node:fs';
import path from 'node:path';
import { collections, documentKey, mutateRecord, readCollection, setRecord, usesFirestore } from '../persistence';
import { getAdminFirestore } from '../middleware/auth';
import { MEMORY_CUSTOMERS, MEMORY_ADMIN_REQUESTS, OPERATORS, DATA_DIR, saveCustomersToDisk, saveOperatorSettingsToDisk, type AdminRequestRecord } from './store';
import type { CustomerRecord, DthOperator } from '../../src/types';

export async function readLookupCustomers(): Promise<CustomerRecord[]> {
  return usesFirestore() ? readCollection(collections.customers) : [...MEMORY_CUSTOMERS];
}
export async function saveLookupCustomer(customer: CustomerRecord) {
  if (usesFirestore()) return setRecord(collections.customers, documentKey(customer.id), customer);
  const index = MEMORY_CUSTOMERS.findIndex(item => item.id === customer.id);
  if (index < 0) MEMORY_CUSTOMERS.push(customer); else MEMORY_CUSTOMERS[index] = customer;
  saveCustomersToDisk();
}
export async function deleteLookupCustomer(id: string) {
  if (usesFirestore()) { await getAdminFirestore().collection(collections.customers).doc(documentKey(id)).delete(); return; }
  const index = MEMORY_CUSTOMERS.findIndex(item => item.id === id);
  if (index >= 0) { MEMORY_CUSTOMERS.splice(index, 1); saveCustomersToDisk(); }
}
export async function readOperators(): Promise<DthOperator[]> {
  if (!usesFirestore()) return OPERATORS.map(item => ({ ...item }));
  const settings = await readCollection<Partial<DthOperator>>(collections.operators);
  return OPERATORS.map(base => ({ ...base, ...settings.find(item => item.id === base.id), id: base.id }));
}
export async function saveOperator(operator: DthOperator) {
  if (usesFirestore()) { await setRecord(collections.operators, operator.id, operator); return; }
  Object.assign(OPERATORS.find(item => item.id === operator.id)!, operator); saveOperatorSettingsToDisk();
}
const requestsFile = () => path.join(DATA_DIR, 'admin_requests.json');
export async function readAdminRequests(): Promise<AdminRequestRecord[]> {
  if (usesFirestore()) return readCollection(collections.requests);
  if (fs.existsSync(requestsFile())) return JSON.parse(fs.readFileSync(requestsFile(), 'utf8'));
  return [...MEMORY_ADMIN_REQUESTS];
}
export async function saveAdminRequest(request: AdminRequestRecord) {
  if (usesFirestore()) return mutateRecord<AdminRequestRecord>(collections.requests, documentKey(request.userId), previous =>
    previous?.status === 'pending' && request.status === 'pending' ? previous : request);
  const requests = await readAdminRequests(); const index = requests.findIndex(item => item.userId === request.userId);
  if (index >= 0) requests[index] = request; else requests.push(request);
  fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(`${requestsFile()}.tmp`, JSON.stringify(requests, null, 2)); fs.renameSync(`${requestsFile()}.tmp`, requestsFile());
  return request;
}

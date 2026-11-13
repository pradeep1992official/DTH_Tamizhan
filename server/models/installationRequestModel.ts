import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './store';
import { setRecord, usesFirestore } from '../persistence';

export interface InstallationRequest {
  id: string;
  operator: 'sun_direct' | 'tata_play' | 'airtel_dth';
  name: string;
  mobile: string;
  district: string;
  address: string;
  status: 'received';
  createdAt: string;
}

const REQUESTS_FILE = path.join(DATA_DIR, 'installation_requests.json');

export async function createInstallationRequest(
  details: Omit<InstallationRequest, 'id' | 'status' | 'createdAt'>,
): Promise<InstallationRequest> {
  const request: InstallationRequest = {
    ...details,
    id: `INST-${randomUUID()}`,
    status: 'received',
    createdAt: new Date().toISOString(),
  };
  if (usesFirestore()) { await setRecord('server_installation_requests', request.id, request); return request; }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let requests: InstallationRequest[] = [];
  if (fs.existsSync(REQUESTS_FILE)) {
    const stored: unknown = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf-8'));
    if (!Array.isArray(stored)) throw new Error('Stored installation requests are not a list');
    requests = stored as InstallationRequest[];
  }
  requests.unshift(request);
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  return request;
}

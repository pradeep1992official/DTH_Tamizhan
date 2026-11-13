import { field, and, or } from '@google-cloud/firestore/pipelines';
import { getAdminFirestore } from './middleware/auth';

export type Filter = { field: string; op: 'eq' | 'lte' | 'gt' | 'in'; value: unknown };
export interface PageOptions { limit: number; cursor?: { time: string; id: string }; idField?: string }
// Enterprise-native pipelines apply filters and limits before returning records.
export async function queryRecords<T>(collection: string, filters: Filter[] = [], page?: PageOptions): Promise<T[]> {
  let query = getAdminFirestore().pipeline().collection(collection);
  for (const filter of filters) {
    const expression = field(filter.field);
    query = query.where(filter.op === 'eq' ? expression.equal(filter.value) : filter.op === 'lte' ? expression.lessThanOrEqual(filter.value) :
      filter.op === 'gt' ? expression.greaterThan(filter.value) : expression.equalAny(filter.value as unknown[]));
  }
  if (page) {
    const id = page.idField || 'id';
    if (page.cursor) query = query.where(or(field('createdAt').lessThan(page.cursor.time), and(field('createdAt').equal(page.cursor.time), field(id).lessThan(page.cursor.id))));
    query = query.sort(field('createdAt').descending(), field(id).descending()).limit(page.limit);
  }
  const snapshot = await query.execute();
  return snapshot.results.map(row => ({ id: row.id, ...row.data() }) as T);
}
export async function limitedRecords<T>(collection: string, filters: Filter[], limit: number): Promise<T[]> {
  let query = getAdminFirestore().pipeline().collection(collection);
  for (const f of filters) query = query.where(f.op === 'eq' ? field(f.field).equal(f.value) : f.op === 'lte' ? field(f.field).lessThanOrEqual(f.value) : f.op === 'gt' ? field(f.field).greaterThan(f.value) : field(f.field).equalAny(f.value as unknown[]));
  return (await query.limit(limit).execute()).results.map(row => row.data() as T);
}

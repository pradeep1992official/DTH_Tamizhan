import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ states: [] as any[], refs: [] as any[], stateIndex: 0, refIndex: 0, effects: [] as any[], effectIndex: 0, pending: [] as any[], snapshot: null as any, save: vi.fn(), remove: vi.fn(), navigate: vi.fn(), stop: vi.fn(), location: { pathname: '/connections', search: '' }, auth: { currentUser: { uid: 'owner' } as any } }));
vi.mock('react', async original => ({ ...await original<any>(),
 useState: (initial: any) => { const i=f.stateIndex++; if(!(i in f.states)) f.states[i]=typeof initial==='function'?initial():initial; return [f.states[i],(v:any)=>{f.states[i]=typeof v==='function'?v(f.states[i]):v}]; },
 useRef: (initial:any) => f.refs[f.refIndex++] ||= {current:initial},
 useEffect: (effect:any,deps:any[]) => {const i=f.effectIndex++;const previous=f.effects[i];if(!previous||deps.some((d,j)=>!Object.is(d,previous.deps[j]))){f.pending.push(()=>{previous?.cleanup?.();f.effects[i]={deps,cleanup:effect()}})}},
}));
vi.mock('react-router-dom', async original => ({...await original<any>(),useNavigate:()=>f.navigate,useLocation:()=>f.location}));
vi.mock('../src/lib/firebase',()=>({auth:f.auth,db:{},isFirebaseConfigured:true,sanitizePayload:(v:any)=>v}));
vi.mock('../src/lib/accountSession',()=>({observeAccountSession:()=>()=>{},signOutAccount:vi.fn()}));
vi.mock('firebase/firestore',()=>({collection:vi.fn(),doc:(_db:any,_name:string,id:string)=>id,query:vi.fn(),where:vi.fn(),onSnapshot:(_q:any,_options:any,callback:any)=>{f.snapshot=callback;return f.stop},setDoc:(...a:any[])=>f.save(...a),deleteDoc:(...a:any[])=>f.remove(...a)}));
import { MainApp } from '../src/App';
const box={id:'saved',user_id:'owner',operator:'tata_play',operatorName:'Tata Play',smartCardNumber:'1234567890',nickname:'Living room',createdAt:'2026-11-24'} as any;
const nodes=(tree:any):any[]=>Array.isArray(tree)?tree.flatMap(nodes):React.isValidElement(tree)?[tree,...nodes((tree.props as any).children)]:[];
function draw(){f.stateIndex=0;f.refIndex=0;f.effectIndex=0;return nodes(MainApp())}
function route(path:string){return draw().find(n=>n.props.path===path).props.element}
function emit(rows:any[]){f.snapshot({metadata:{fromCache:false,hasPendingWrites:false},forEach:(fn:any)=>rows.forEach(row=>fn({id:row.id,data:()=>row}))})}
beforeEach(()=>{f.states=[];f.refs=[];f.effects=[];f.pending=[];f.snapshot=null;f.location={pathname:'/connections',search:''};vi.clearAllMocks();f.auth.currentUser={uid:'owner'};
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({rechargeEnabled:true})})));
 localStorage.setItem('dth_tamizhan_connections:owner',JSON.stringify([box]));
 draw();f.states[2]={uid:'owner',displayName:'Customer'};f.states[7]='owner';f.states[8]=[box];f.pending=[];draw();for(const effect of f.pending.splice(0))effect();
});
afterEach(()=>vi.unstubAllGlobals());
it('replaces cached boxes with remote results including deletion of all boxes',()=>{emit([{...box,nickname:'Updated remotely'}]);expect(route('/connections').props.connections).toHaveLength(1);expect(route('/connections').props.connections[0].nickname).toBe('Updated remotely');emit([]);expect(route('/connections').props.connections).toEqual([])});
it('does not expose a previous owner snapshot after account changes',()=>{const callback=f.snapshot;f.auth.currentUser={uid:'other'};callback({metadata:{fromCache:false,hasPendingWrites:false},forEach:(fn:any)=>fn({id:box.id,data:()=>box})});expect(route('/connections').props.connections[0].nickname).toBe('Living room')});
it('keeps the existing box and shows an error when a delete fails',async()=>{f.remove.mockRejectedValueOnce(new Error('Permission denied'));expect(await route('/connections').props.onDeleteConnection(box.id)).toBe(false);expect(route('/connections').props.connections).toHaveLength(1);expect(draw().find(n=>n.props.role==='alert').props.children).toContain('could not be removed')});
it('keeps the old box after a failed edit and does not claim a new box was saved',async()=>{f.save.mockRejectedValue(new Error('Network'));const save=route('/connections').props.onAddConnection;expect(await save({...box,nickname:'Unsaved edit'})).toBe(false);expect(await save({...box,id:'new'})).toBe(false);expect(route('/connections').props.connections).toEqual([box]);expect(draw().find(n=>n.props.role==='alert').props.children).toContain('could not be saved')});
it('passes the chosen plan ID and subscriber to Recharge',()=>{route('/plans').props.onApplyPlanToBox({id:'sd-one-month',operator:'tata_play'},box);const props=route('/recharge').props;expect(props.initialPlanId).toBe('sd-one-month');expect(props.prefillConnection.smartCardNumber).toBe(box.smartCardNumber);expect(f.navigate).toHaveBeenCalledWith('/recharge')});
it('lets a guest choose a pack and carries it to Recharge without requiring a saved box', () => {
  f.states[2] = null; f.auth.currentUser = null;
  const browse = route('/plans'); expect(browse.props.user).toBeNull();
  browse.props.onChoosePlan({ id: 'airtel-one-month', operator: 'airtel_dth' });
  expect(f.navigate).toHaveBeenCalledWith('/recharge?operator=airtel_dth&plan=airtel-one-month');
  expect(route('/recharge').props.initialPlanId).toBe('airtel-one-month');
  expect(route('/recharge').props.prefillConnection).toBeNull();
  expect(f.save).not.toHaveBeenCalled();
});
it('restores a shared recharge plan URL without signing in or creating a connection', () => {
  f.states[2] = null; f.auth.currentUser = null; f.pending = [];
  f.location = { pathname: '/recharge', search: '?operator=airtel_dth&plan=shared-pack' };
  draw(); for (const effect of f.pending.splice(0)) effect();
  expect(route('/recharge').props.initialPlanId).toBe('shared-pack');
  expect(route('/recharge').props.selectedOpId).toBe('airtel_dth');
  expect(f.save).not.toHaveBeenCalled();
});
it('keeps a public pack choice through sign-in while clearing account-owned prefill', () => {
  f.location = { pathname: '/recharge', search: '?operator=tata_play&plan=public-pack' };
  f.pending = []; draw(); for (const effect of f.pending.splice(0)) effect();
  route('/plans').props.onApplyPlanToBox({ id: 'public-pack', operator: 'tata_play' }, box);
  f.states[2] = { uid: 'new-account', displayName: 'New customer' }; f.auth.currentUser = { uid: 'new-account' };
  f.pending = []; draw(); for (const effect of f.pending.splice(0)) effect();
  expect(route('/recharge').props.initialPlanId).toBe('public-pack');
  expect(route('/recharge').props.prefillConnection).toBeNull();
  expect(f.save).not.toHaveBeenCalled();
});

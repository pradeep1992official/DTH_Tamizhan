import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssistantAction } from '../lib/assistantActions';
type SupportAction = Extract<AssistantAction, { type: 'support_recommendation' | 'prefill_support' | 'prefill_service_request' }>;
export function AssistantSupportCard({ action }: { action: SupportAction }) {
  const navigate = useNavigate();
  const service = action.type === 'prefill_service_request' || (action.type === 'support_recommendation' && action.recommendation.option === 'service_request');
  const fields = action.type === 'support_recommendation' ? { description: action.recommendation.summary, issueCategory: action.recommendation.category } : action.fields;
  return <div className="rounded-lg border border-rule p-3 space-y-3">
    <p>{action.type === 'support_recommendation' ? 'Suggested option' : 'Form draft'}: {service ? 'DTH complaint assistance - Rs. 50 (test)' : 'Free support ticket'}</p>
    <p className="whitespace-pre-wrap">{fields.description}</p>
    <button className="recharge-chat-suggestion" onClick={() => navigate(service ? '/service-request' : '/support', { state: { ticketPrefill: fields } })}>Review {service ? 'service request' : 'free ticket'}</button>
    {service && <button className="recharge-chat-suggestion" onClick={() => navigate('/support', { state: { ticketPrefill: { description: fields.description, issueCategory: 'other' } } })}>Use free support instead</button>}
    <p className="text-xs text-muted">Nothing submitted or paid. You decide on the form.</p>
  </div>;
}

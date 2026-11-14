import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssistantAction } from '../lib/assistantActions';
type SupportAction = Extract<AssistantAction, { type: 'support_recommendation' | 'prefill_support' | 'prefill_service_request' }>;
export function AssistantSupportCard({ action }: { action: SupportAction }) {
  const navigate = useNavigate();
  const fields = action.type === 'support_recommendation' ? { description: action.recommendation.summary, issueCategory: action.recommendation.category } : action.fields;
  return <div className="rounded-lg border border-rule p-3 space-y-3">
    <p>Get Help</p>
    <p className="whitespace-pre-wrap">{fields.description}</p>
    <button className="recharge-chat-suggestion" onClick={() => navigate('/help', { state: { ticketPrefill: fields } })}>Get Help</button>
    <p className="text-xs text-muted">Nothing submitted or paid. You decide on the form.</p>
  </div>;
}

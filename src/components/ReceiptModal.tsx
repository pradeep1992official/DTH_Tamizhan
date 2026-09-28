import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Radio, 
  Tv, 
  ArrowRight, 
  Download,
  Share2,
  ShieldCheck
} from 'lucide-react';
import { RechargeOrder, Language } from '../types';
import { translations } from '../lib/translations';

interface ReceiptModalProps {
  order: RechargeOrder | null;
  onClose: () => void;
  currentLang: Language;
  onTriggerRefresh: (operator: any, card: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  onClose,
  currentLang,
  onTriggerRefresh,
}) => {
  const t = translations[currentLang];

  if (!order) return null;

  const basePrice = (order.amount / 1.18).toFixed(2);
  const gstAmount = (order.amount - Number(basePrice)).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e1935] border border-[#1e3058] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative text-left">
        {/* Receipt Header Badge */}
        <div className="bg-emerald-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-serif-royal font-bold tracking-tight">
                {t.rechargeSuccess}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Recharge Processed Successfully
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 space-y-5 bg-[#0e1935] printable-receipt">
          {/* Brand Watermark */}
          <div className="flex items-center justify-between border-b border-[#172545] pb-3">
            <div>
              <span className="font-serif-royal font-bold text-base text-[#f5f2eb]">
                DTH <span className="text-[#dfb86c]">தமிழன்</span>
              </span>
              <p className="text-[10px] text-[#8e9cb4]">
                Official DTH Recharge Tax Invoice
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8e9cb4] block">Date & Time</span>
              <span className="text-xs font-mono text-[#c7d2e5]">
                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Key Reference Numbers */}
          <div className="grid grid-cols-2 gap-3 bg-[#070e1e] p-3.5 rounded-xl border border-[#172545] text-xs">
            <div>
              <span className="text-[10px] text-[#8e9cb4] uppercase tracking-wider block font-bold">
                Order ID
              </span>
              <span className="font-mono font-bold text-[#f5f2eb]">
                {order.orderId}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8e9cb4] uppercase tracking-wider block font-bold">
                Operator Ref No.
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {order.operatorRefId}
              </span>
            </div>
          </div>

          {/* Connection & Plan Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-[#8e9cb4]">DTH Operator</span>
              <span className="font-bold text-[#f5f2eb]">{order.operatorName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-[#8e9cb4]">Smart Card / VC No.</span>
              <span className="font-mono font-bold text-[#dfb86c]">
                {order.smartCardNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-[#8e9cb4]">Package / Bouquet</span>
              <span className="font-semibold text-[#f5f2eb]">{order.packName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-[#8e9cb4]">Validity</span>
              <span className="font-medium text-[#c7d2e5]">{order.packValidity}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#172545]">
              <span className="text-[#8e9cb4]">Payment Mode</span>
              <span className="font-medium text-[#c7d2e5] uppercase">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Price Calculation Breakdown */}
          <div className="bg-[#070e1e] p-3 rounded-xl border border-[#172545] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#8e9cb4]">
              <span>Base Recharge Value</span>
              <span className="font-mono">₹{basePrice}</span>
            </div>
            <div className="flex justify-between text-[#8e9cb4]">
              <span>CGST (9%) + SGST (9%)</span>
              <span className="font-mono">₹{gstAmount}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#172545] font-bold text-sm text-[#f5f2eb]">
              <span>Total Paid Amount</span>
              <span className="font-mono text-[#dfb86c] text-base font-bold">
                ₹{order.amount}
              </span>
            </div>
          </div>

          {/* Immediate Signal Refresh Tip */}
          <div className="p-3 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/25 text-xs text-[#dfb86c] flex items-start gap-2.5">
            <Radio className="w-4 h-4 text-[#dfb86c] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#dfb86c]">
                Channels not showing after recharge?
              </p>
              <p className="text-[11px] text-[#c7d2e5] mt-0.5">
                Refresh your viewing signal to sync account channels immediately.
              </p>
              <button
                type="button"
                onClick={() => {
                  onTriggerRefresh(order.operator, order.smartCardNumber);
                  onClose();
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#c5a059] text-[#080d1a] font-bold text-[11px] hover:bg-[#b89248] transition-colors"
              >
                <Radio className="w-3 h-3" />
                <span>Refresh Signal</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-xl bg-[#142345] hover:bg-[#1c305e] text-[#f5f2eb] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#1e3058]"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

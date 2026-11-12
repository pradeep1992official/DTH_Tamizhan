import { BUSINESS_DETAILS } from '../lib/trustContent';
import React from 'react';
import {
  X,
  CheckCircle2,
  Printer,
  Share2,
  Tv
} from '../lib/icons';
import { RechargeOrder, Language } from '../types';
import { translations } from '../lib/translations';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface ReceiptModalProps {
  order: RechargeOrder | null;
  onClose: () => void;
  currentLang: Language;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  onClose,
  currentLang,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen: Boolean(order), onClose });

  if (!order) return null;


  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*DTH Tamizhan Recharge Receipt*\n` +
      `Operator: ${order.operatorName}\n` +
      `Viewing Card: ${order.smartCardNumber}\n` +
      `Pack: ${order.packName}\n` +
      `Amount Paid: ₹${order.amount}\n` +
      `Order ID: ${order.orderId}\n` +
      `Ref ID: ${order.operatorRefId}\n` +
      `Date: ${new Date(order.createdAt).toLocaleDateString()}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        className="hm-dialog receipt-print bg-paper-2 border border-rule rounded-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg relative text-left"
      >
        {/* Receipt Header Badge */}
        <div className="bg-paper px-6 py-5 text-ink border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center">
              <Tv className="w-6 h-6 text-ink" />
            </div>
            <div>
              <h2 id="receipt-modal-title" className="text-base font-bold tracking-tight">
                {t.receiptTitle}
              </h2>
              <p className="text-sm text-success font-medium">
                {currentLang === 'ta' ? 'பதிவான நிலை' : 'Recorded status'}: {order.paymentStatus} / {order.rechargeStatus}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="dialog-primary p-2 rounded-xl text-success hover:text-ink hover:bg-success transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 space-y-5 bg-paper-2 printable-receipt">
          {/* Brand Watermark */}
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <span className="font-bold text-base text-ink">
                DTH <span className="text-accent">தமிழன்</span>
              </span>
              <p className="text-sm text-muted">
                {t.officialTaxInvoice}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted block">{t.dateLabel}</span>
              <span className="text-sm tabular-nums text-muted">
                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Key Reference Numbers */}
          <div className="dialog-summary grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-sm">
            <div>
              <span className="text-sm text-muted block font-bold">
                {t.orderIdLabel}
              </span>
              <span className="tabular-nums font-bold text-ink text-sm">
                {order.orderId}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted block font-bold">
                {t.operatorRefLabel}
              </span>
              <span className="tabular-nums font-bold text-success text-sm">
                {order.operatorRefId}
              </span>
            </div>
          </div>

          {/* Connection & Plan Details */}
          <div className="receipt-details text-sm">
            <div className="flex justify-between py-1 border-b border-rule">
              <span className="text-muted">DTH Operator</span>
              <span className="font-bold text-ink">{order.operatorName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-rule">
              <span className="text-muted">{t.viewingCardLabel}</span>
              <span className="tabular-nums font-bold text-accent">
                {order.smartCardNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-rule">
              <span className="text-muted">{t.packAppliedLabel}</span>
              <span className="font-medium text-ink">{order.packName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-rule">
              <span className="text-muted">{t.validity}</span>
              <span className="font-medium text-muted">{order.packValidity}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-rule">
              <span className="text-muted">Payment Mode</span>
              <span className="font-medium text-muted">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Price Calculation Breakdown */}
          <div className="dialog-section py-4 space-y-2 text-sm">
            <p className="text-muted">GSTIN: {BUSINESS_DETAILS.gstin}</p>
            <p className="text-muted">{BUSINESS_DETAILS.feesAndTaxes}</p>
            <div className="flex justify-between pt-2 border-t border-rule font-bold text-sm text-ink">
              <span>{t.totalPayable}</span>
              <span className="tabular-nums text-accent">₹{order.amount}</span>
            </div>
          </div>

          <div className="dialog-section py-4">
            <div className="flex items-start gap-2 text-accent text-sm font-medium">
              <Tv className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.channelsActiveNotice}</span>
            </div>
          </div>

          {/* Receipt Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-paper hover:bg-paper text-ink text-sm font-bold transition-colors flex items-center justify-center gap-1.5 border border-rule"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printReceipt}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="dialog-primary py-2.5 px-3 rounded-xl bg-success hover:bg-success text-ink text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.shareWhatsApp}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

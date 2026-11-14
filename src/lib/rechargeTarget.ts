// An explicit new-customer request starts a new target. Old subscriber IDs and
// saved-box selections must not leak into this request or its follow-ups.
export function rechargeTarget(messages: string[]) {
  let start = 0;
  let newCustomer = false;
  messages.forEach((message, index) => {
    if (/\b(?:new|another|different)\s+(?:(?:customer|subscriber)(?:\s+(?:id|number))?|box|connection|id)\b|புதிய\s+(?:சந்தாதாரர்|வாடிக்கையாளர்|பாக்ஸ்)|\b(?:pudhu|puthu|pudhiya)\s+(?:customer|subscriber|box|id)\b/i.test(message)) {
      start = index;
      newCustomer = true;
    } else if (/\b(?:use|recharge|select)\s+(?:my\s+|the\s+)?saved\s+box\b|சேமித்த\s+பாக்ஸ/i.test(message)) {
      start = index;
      newCustomer = false;
    }
  });
  return { newCustomer, messages: messages.slice(start), priorMessages: messages.slice(0, start) };
}

import React from 'react';
import { Text, TextProps } from 'react-native';

interface PriceDisplayProps extends TextProps {
  amount: number | string;
  currency?: string;
  hideSymbol?: boolean;
}

export default function PriceDisplay({
  amount,
  currency = 'TZS',
  hideSymbol = false,
  style,
  ...props
}: PriceDisplayProps) {
  // Format price logic. TZS has no decimals.
  const formatPrice = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0';
    
    // TZS has no decimals, others have 2
    const isTzs = currency === 'TZS';
    const decimals = isTzs ? 0 : 2;
    const parts = num.toFixed(decimals).split('.');
    
    // Insert commas as thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.join('.');
    
    return isTzs ? `TZS ${formatted}` : `${currency} ${formatted}`;
  };

  const formattedStr = formatPrice(amount);
  const displayStr = hideSymbol ? formattedStr.replace(/[^0-9.,]/g, '').trim() : formattedStr;

  return (
    <Text style={style} {...props}>
      {displayStr}
    </Text>
  );
}

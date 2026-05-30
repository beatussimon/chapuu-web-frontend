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
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'TZS' ? 0 : 2,
      maximumFractionDigits: currency === 'TZS' ? 0 : 2,
    }).format(num);
  };

  const formattedStr = formatPrice(amount);
  const displayStr = hideSymbol ? formattedStr.replace(/[^0-9.,]/g, '').trim() : formattedStr;

  return (
    <Text style={style} {...props}>
      {displayStr}
    </Text>
  );
}

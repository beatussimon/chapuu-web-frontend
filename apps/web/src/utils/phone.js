export const parseLocalPhoneNumber = (fullPhone) => {
    if (!fullPhone) return '';
    // Remove any formatting, country prefixes, or whitespace
    const clean = fullPhone.replace(/[\s\-\(\)\+]/g, '');
    
    if (clean.startsWith('255')) {
        return clean.substring(3);
    }
    if (clean.startsWith('0')) {
        return clean.substring(1);
    }
    if (clean.length > 9) {
        return clean.substring(clean.length - 9);
    }
    return clean;
};

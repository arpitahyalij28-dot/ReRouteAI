// ReRoute AI 2.0 - Load Parser Engine Test Suite
import { describe, it, expect } from 'vitest';
import { parseLoadText, normalizeCityName } from '../loadParser.js';

describe('Load Parser Engine (src/engine/loadParser.js)', () => {
  it('normalizes common Indian city aliases and vernacular spellings', () => {
    expect(normalizeCityName('Bombay')).toBe('Mumbai');
    expect(normalizeCityName('बम्बई')).toBe('Mumbai');
    expect(normalizeCityName('मुंबई')).toBe('Mumbai');
    expect(normalizeCityName('Poona')).toBe('Pune');
    expect(normalizeCityName('पुणे')).toBe('Pune');
    expect(normalizeCityName('Nasik')).toBe('Nashik');
    expect(normalizeCityName('नाशिक')).toBe('Nashik');
    expect(normalizeCityName('सूरत')).toBe('Surat');
    expect(normalizeCityName('Aurangabad')).toBe('Chhatrapati Sambhajinagar (Aurangabad)');
    expect(normalizeCityName('Baroda')).toBe('Vadodara');
  });

  it('parses Hindi load message with weight, schedule, commodity and rate', () => {
    const text = 'कल सुबह 6 बजे पुणे से सूरत 12 टन स्टील भेजना है, 28000 दूंगा';
    const result = parseLoadText(text, { now: '2026-10-23T00:00:00.000Z' });

    expect(result.success).toBe(true);
    expect(result.data.origin).toBe('Pune');
    expect(result.data.destination).toBe('Surat');
    expect(result.data.weightTons).toBe(12);
    expect(result.data.cargoType).toContain('Steel');
    expect(result.data.freightOfferInr).toBe(28000);
    expect(result.data.pickupWindowStart).toBe('06:00');
    expect(result.data.pickupWindowEnd).toBe('08:00');
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0.85);
  });

  it('parses Hinglish message with abbreviated units, rate in "k", and urgency tag', () => {
    const text = 'kal 10am Nashik to Vapi 8T FMCG bhada 18k urgent';
    const result = parseLoadText(text, { now: '2026-10-23T00:00:00.000Z' });

    expect(result.success).toBe(true);
    expect(result.data.origin).toBe('Nashik');
    expect(result.data.destination).toBe('Vapi');
    expect(result.data.weightTons).toBe(8);
    expect(result.data.cargoType).toContain('FMCG');
    expect(result.data.freightOfferInr).toBe(18000);
    expect(result.data.pickupWindowStart).toBe('10:00');
    expect(result.data.priority).toBe('High');
  });

  it('converts kilograms to metric tons accurately', () => {
    const text = 'Mumbai se Pune 5000 kg pharma goods kal sham 6 baje rate 15000';
    const result = parseLoadText(text);

    expect(result.success).toBe(true);
    expect(result.data.origin).toBe('Mumbai');
    expect(result.data.destination).toBe('Pune');
    expect(result.data.weightTons).toBe(5);
    expect(result.data.cargoType).toContain('Pharmaceutical');
    expect(result.data.freightOfferInr).toBe(15000);
    expect(result.data.pickupWindowStart).toBe('18:00');
  });

  it('handles English transporter tender text', () => {
    const text = 'Today 4pm Thane to Pune 5 ton auto parts offer 14000';
    const result = parseLoadText(text);

    expect(result.success).toBe(true);
    expect(result.data.origin).toBe('Thane');
    expect(result.data.destination).toBe('Pune');
    expect(result.data.weightTons).toBe(5);
    expect(result.data.cargoType).toContain('Automotive');
    expect(result.data.freightOfferInr).toBe(14000);
    expect(result.data.pickupWindowStart).toBe('16:00');
  });

  it('handles Marathi phrasing with day after tomorrow (parso) schedule', () => {
    const text = 'parso subah 8 baje Kolhapur to Solapur 10 mt textile kiraya 35000';
    const result = parseLoadText(text);

    expect(result.success).toBe(true);
    expect(result.data.origin).toBe('Kolhapur');
    expect(result.data.destination).toBe('Solapur');
    expect(result.data.weightTons).toBe(10);
    expect(result.data.cargoType).toContain('Textile');
    expect(result.data.freightOfferInr).toBe(35000);
  });

  it('gracefully returns failure object for empty or nonsensical input', () => {
    const emptyResult = parseLoadText('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.confidence.overall).toBe(0);

    const nullResult = parseLoadText(null);
    expect(nullResult.success).toBe(false);
  });
});

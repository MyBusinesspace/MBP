import { differenceInDays, parseISO } from 'date-fns';

/**
 * Calculate the depreciation for an asset based on its method
 * @param {Object} asset - The asset object with purchase info
 * @returns {Object} - Object with current_value and accumulated_depreciation
 */
export function calculateDepreciation(asset) {
  if (!asset.purchase_cost || !asset.purchase_date) {
    return {
      current_value: asset.purchase_cost || 0,
      accumulated_depreciation: 0,
      annual_depreciation: 0,
      depreciation_rate: 0
    };
  }

  const purchaseCost = asset.purchase_cost;
  const salvageValue = asset.salvage_value || 0;
  const usefulLife = asset.useful_life_years || 5;
  const method = asset.depreciation_method || 'Straight Line';

  // Calculate years elapsed since purchase
  const purchaseDate = parseISO(asset.purchase_date);
  const today = new Date();
  const daysElapsed = differenceInDays(today, purchaseDate);
  const yearsElapsed = Math.max(0, daysElapsed / 365.25);

  let currentValue = purchaseCost;
  let accumulatedDepreciation = 0;
  let annualDepreciation = 0;
  let depreciationRate = 0;

  if (method === 'No Depreciation') {
    return {
      current_value: purchaseCost,
      accumulated_depreciation: 0,
      annual_depreciation: 0,
      depreciation_rate: 0
    };
  }

  if (method === 'Straight Line') {
    // Straight Line: (Cost - Salvage) / Useful Life
    annualDepreciation = (purchaseCost - salvageValue) / usefulLife;
    accumulatedDepreciation = Math.min(
      annualDepreciation * yearsElapsed,
      purchaseCost - salvageValue
    );
    currentValue = Math.max(purchaseCost - accumulatedDepreciation, salvageValue);
    depreciationRate = (annualDepreciation / purchaseCost) * 100;
  } 
  else if (method === 'Declining Balance') {
    // Declining Balance: 150% of straight-line rate
    depreciationRate = (1.5 / usefulLife) * 100;
    const rate = 1.5 / usefulLife;
    
    // Calculate depreciation year by year
    let bookValue = purchaseCost;
    for (let i = 0; i < Math.floor(yearsElapsed); i++) {
      const yearDepreciation = bookValue * rate;
      accumulatedDepreciation += yearDepreciation;
      bookValue -= yearDepreciation;
      
      if (bookValue <= salvageValue) {
        bookValue = salvageValue;
        break;
      }
    }
    
    // Handle partial year
    const partialYear = yearsElapsed - Math.floor(yearsElapsed);
    if (partialYear > 0 && bookValue > salvageValue) {
      const partialDepreciation = bookValue * rate * partialYear;
      accumulatedDepreciation += partialDepreciation;
      bookValue -= partialDepreciation;
    }
    
    currentValue = Math.max(bookValue, salvageValue);
    annualDepreciation = purchaseCost * rate;
  } 
  else if (method === 'Double Declining Balance') {
    // Double Declining Balance: 200% of straight-line rate
    depreciationRate = (2 / usefulLife) * 100;
    const rate = 2 / usefulLife;
    
    // Calculate depreciation year by year
    let bookValue = purchaseCost;
    for (let i = 0; i < Math.floor(yearsElapsed); i++) {
      const yearDepreciation = bookValue * rate;
      accumulatedDepreciation += yearDepreciation;
      bookValue -= yearDepreciation;
      
      if (bookValue <= salvageValue) {
        bookValue = salvageValue;
        break;
      }
    }
    
    // Handle partial year
    const partialYear = yearsElapsed - Math.floor(yearsElapsed);
    if (partialYear > 0 && bookValue > salvageValue) {
      const partialDepreciation = bookValue * rate * partialYear;
      accumulatedDepreciation += partialDepreciation;
      bookValue -= partialDepreciation;
    }
    
    currentValue = Math.max(bookValue, salvageValue);
    annualDepreciation = purchaseCost * rate;
  }

  return {
    current_value: Math.max(0, currentValue),
    accumulated_depreciation: Math.min(accumulatedDepreciation, purchaseCost - salvageValue),
    annual_depreciation: annualDepreciation,
    depreciation_rate: depreciationRate
  };
}

/**
 * Get depreciation schedule for the next N years
 * @param {Object} asset - The asset object
 * @param {number} years - Number of years to project
 * @returns {Array} - Array of year-by-year depreciation
 */
export function getDepreciationSchedule(asset, years = 10) {
  if (!asset.purchase_cost || !asset.purchase_date) {
    return [];
  }

  const purchaseCost = asset.purchase_cost;
  const salvageValue = asset.salvage_value || 0;
  const usefulLife = asset.useful_life_years || 5;
  const method = asset.depreciation_method || 'Straight Line';
  const purchaseDate = parseISO(asset.purchase_date);

  if (method === 'No Depreciation') {
    return Array.from({ length: years }, (_, i) => ({
      year: i + 1,
      yearDate: new Date(purchaseDate.getFullYear() + i + 1, 0, 1),
      depreciation: 0,
      accumulatedDepreciation: 0,
      bookValue: purchaseCost
    }));
  }

  const schedule = [];
  let bookValue = purchaseCost;
  let accumulated = 0;

  if (method === 'Straight Line') {
    const annualDepreciation = (purchaseCost - salvageValue) / usefulLife;
    
    for (let i = 0; i < years; i++) {
      const yearDepreciation = Math.min(annualDepreciation, bookValue - salvageValue);
      accumulated += yearDepreciation;
      bookValue -= yearDepreciation;
      
      schedule.push({
        year: i + 1,
        yearDate: new Date(purchaseDate.getFullYear() + i + 1, 0, 1),
        depreciation: yearDepreciation,
        accumulatedDepreciation: accumulated,
        bookValue: Math.max(bookValue, salvageValue)
      });
      
      if (bookValue <= salvageValue) break;
    }
  } 
  else if (method === 'Declining Balance' || method === 'Double Declining Balance') {
    const multiplier = method === 'Declining Balance' ? 1.5 : 2;
    const rate = multiplier / usefulLife;
    
    for (let i = 0; i < years; i++) {
      const yearDepreciation = Math.min(bookValue * rate, bookValue - salvageValue);
      accumulated += yearDepreciation;
      bookValue -= yearDepreciation;
      
      schedule.push({
        year: i + 1,
        yearDate: new Date(purchaseDate.getFullYear() + i + 1, 0, 1),
        depreciation: yearDepreciation,
        accumulatedDepreciation: accumulated,
        bookValue: Math.max(bookValue, salvageValue)
      });
      
      if (bookValue <= salvageValue) break;
    }
  }

  return schedule;
}

/**
 * Get a user-friendly description of a depreciation method
 * @param {string} method - The depreciation method
 * @returns {string} - Description of the method
 */
export function getDepreciationMethodDescription(method) {
  const descriptions = {
    'Straight Line': 'Equal depreciation each year over the useful life',
    'Declining Balance': '150% declining balance - faster depreciation in early years',
    'Double Declining Balance': '200% declining balance - maximum early depreciation',
    'No Depreciation': 'Asset maintains its purchase value'
  };
  return descriptions[method] || 'Unknown depreciation method';
}
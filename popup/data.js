function getBadgeText(hideEnabled) {
  if (hideEnabled) return '';
  return 'OFF';
}

function isAnyTrue(flags) {
  return Object.values(flags).some(Boolean);
}

function isRangeOverlapping(lowerBound, upperBound) {
  const lower = lowerBound || 0;
  const upper = upperBound || 0;
  return lower > 0 && upper > 0 && lower >= upper;
}

function updateSliderBackground(slider) {
  const min = slider.min || 0;
  const max = slider.max || 100;
  const value = slider.value;
  const percentage = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #ebebeb ${percentage}%, #4a4a4a ${percentage}%)`;
}

const viewsSteps = [
  0, 50, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000,
  7500, 10000, 15000, 20000, 25000, 30000, 50000, 75000, 100000, 150000, 200000,
  250000, 300000, 500000, 750000, 1000000, 1500000, 2000000, 2500000, 3000000,
  5000000, 7500000, 10000000,
];

function formatViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(views % 1000000 === 0 ? 0 : 1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(views % 1000 === 0 ? 0 : 1) + 'K';
  }
  return views.toString();
}

function findClosestViewsIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(viewsSteps[0] - value);
  for (let i = 1; i < viewsSteps.length; i++) {
    const diff = Math.abs(viewsSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

const viewsMaxSteps = [
  0, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 15000, 20000, 25000,
  30000, 50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000, 750000,
  1000000, 1500000, 2000000, 2500000, 3000000, 5000000, 7500000, 10000000,
];

function findClosestViewsMaxIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(viewsMaxSteps[0] - value);
  for (let i = 1; i < viewsMaxSteps.length; i++) {
    const diff = Math.abs(viewsMaxSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

const dateSteps = [
  0, 1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 548, 730,
  1095, 1460, 1825, 2555, 3650,
];

const dateStepLabels = [
  'Off',
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '1 week',
  '10 days',
  '2 weeks',
  '3 weeks',
  '1 month',
  '45 days',
  '2 months',
  '3 months',
  '4 months',
  '6 months',
  '9 months',
  '1 year',
  '18 months',
  '2 years',
  '3 years',
  '4 years',
  '5 years',
  '7 years',
  '10 years',
];

const dateNewerSteps = [
  0,
  1 / 24,
  2 / 24,
  3 / 24,
  0.25,
  0.5,
  1,
  2,
  3,
  5,
  7,
  10,
  14,
  21,
  30,
  45,
  60,
  90,
  120,
  180,
  270,
  365,
  548,
  730,
  1095,
  1460,
  1825,
  2555,
  3650,
];

const dateNewerStepLabels = [
  'Off',
  '1 hour',
  '2 hours',
  '3 hours',
  '6 hours',
  '12 hours',
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '1 week',
  '10 days',
  '2 weeks',
  '3 weeks',
  '1 month',
  '45 days',
  '2 months',
  '3 months',
  '4 months',
  '6 months',
  '9 months',
  '1 year',
  '18 months',
  '2 years',
  '3 years',
  '4 years',
  '5 years',
  '7 years',
  '10 years',
];

function findClosestDateNewerIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(dateNewerSteps[0] - value);
  for (let i = 1; i < dateNewerSteps.length; i++) {
    const diff = Math.abs(dateNewerSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function formatDateThreshold(days) {
  const idx = findClosestDateIndex(days);
  return dateStepLabels[idx];
}

function findClosestDateIndex(value) {
  let closestIndex = 0;
  let minDiff = Math.abs(dateSteps[0] - value);
  for (let i = 1; i < dateSteps.length; i++) {
    const diff = Math.abs(dateSteps[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function setEasyModeClass(isEasy) {
  document.body.classList.toggle('easy-mode-on', isEasy);
  document.body.classList.toggle('easy-mode-off', !isEasy);
}

function updateEasyModeUI(isEasyMode) {
  setEasyModeClass(isEasyMode);
}

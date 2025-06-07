

const MoonPhase = ({ phase }) => {
  const phaseToIcon = {
    'New Moon': 'New-Moon.png',
    'Waxing Crescent': 'Waxing-Crescent.png',
    'First Quarter': 'First-Quarter.png',
    'Waxing Gibbous': 'Waxing-Gibbous.png',
    'Full Moon': 'Full-Moon.png',
    'Waning Gibbous': 'Waning-Gibbous.png',
    'Last Quarter': 'Last-Quarter.png',
    'Waning Crescent': 'Waning-Crescent.png',
  };

  const iconSrc = `/phases/${phaseToIcon[phase]}`;

  return (
      <img src={iconSrc} alt={phase} className="w-16 h-16" />
  );
};

export default MoonPhase;

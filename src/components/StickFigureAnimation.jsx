import React, { useState, useEffect } from 'react';

const StickFigureAnimation = ({ 
  size = 60, 
  isActive = false, 
  animationType = 'walking', // 'walking', 'loading', 'idle'
  color = '#000000' // Mr. Peter is always black!
}) => {
  const [currentAnimation, setCurrentAnimation] = useState('idle');

  useEffect(() => {
    if (isActive) {
      setCurrentAnimation(animationType);
    } else {
      setCurrentAnimation('idle');
    }
  }, [isActive, animationType]);
  
  const animationDuration = '1.0s'; // Faster pace

  return (
    <div className="flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 120" 
        className="overflow-visible"
      >
        {/* Main group for horizontal movement */}
        <g style={{ animation: currentAnimation === 'walking' ? `walkSideways ${parseFloat(animationDuration) * 2.5}s infinite ease-in-out` : 'none' }}>
          
          {/* Head - Solid black */}
          <circle cx="50" cy="15" r="8" fill={color} />
          
          {/* Body - NO BOUNCE */}
          <line x1="50" y1="23" x2="50" y2="70" stroke={color} strokeWidth="4" />
          
          {/* -- Left Arm with Elbow -- */}
          <g style={{ animation: currentAnimation === 'walking' ? `swingArmLeft ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '50px 30px' }}>
            {/* Upper Arm */}
            <line x1="50" y1="30" x2="40" y2="45" stroke={color} strokeWidth="3" />
            {/* Forearm */}
            <line x1="40" y1="45" x2="35" y2="60" stroke={color} strokeWidth="3" style={{ animation: currentAnimation === 'walking' ? `swayForearmLeft ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '40px 45px' }}/>
          </g>

          {/* -- Right Arm with Elbow -- */}
          <g style={{ animation: currentAnimation === 'walking' ? `swingArmRight ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '50px 30px' }}>
            {/* Upper Arm */}
            <line x1="50" y1="30" x2="60" y2="45" stroke={color} strokeWidth="3" />
            {/* Forearm */}
            <line x1="60" y1="45" x2="65" y2="60" stroke={color} strokeWidth="3" style={{ animation: currentAnimation === 'walking' ? `swayForearmRight ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '60px 45px' }}/>
          </g>

          {/* -- Left Leg with Knee -- */}
          <g style={{ animation: currentAnimation === 'walking' ? `stepLeft ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '50px 70px' }}>
            {/* Thigh */}
            <line x1="50" y1="70" x2="45" y2="90" stroke={color} strokeWidth="4" />
            {/* Calf */}
            <g style={{ animation: currentAnimation === 'walking' ? `bendKneeLeft ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '45px 90px' }}>
              <line x1="45" y1="90" x2="48" y2="110" stroke={color} strokeWidth="4" />
              {/* Foot */}
              <line x1="48" y1="110" x2="43" y2="110" stroke={color} strokeWidth="4" />
            </g>
          </g>

          {/* -- Right Leg with Knee -- */}
          <g style={{ animation: currentAnimation === 'walking' ? `stepRight ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '50px 70px' }}>
            {/* Thigh */}
            <line x1="50" y1="70" x2="55" y2="90" stroke={color} strokeWidth="4" />
            {/* Calf */}
            <g style={{ animation: currentAnimation === 'walking' ? `bendKneeRight ${animationDuration} infinite ease-in-out` : 'none', transformOrigin: '55px 90px' }}>
              <line x1="55" y1="90" x2="52" y2="110" stroke={color} strokeWidth="4" />
              {/* Foot */}
              <line x1="52" y1="110" x2="57" y2="110" stroke={color} strokeWidth="4" />
            </g>
          </g>

          {/* Box for 'loading' animation */}
          {currentAnimation === 'loading' && (
            <g style={{ animation: 'carryBox 1s infinite ease-in-out' }}>
              <rect x="42" y="25" width="16" height="12" fill="#d97706" stroke="#b45309" strokeWidth="2" rx="1" />
              <text x="50" y="33" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">WORK</text>
            </g>
          )}
        </g>
      </svg>

      <style key>{`
        /* More horizontal movement but controlled to not interfere with text */
        @keyframes walkSideways {
          0% { transform: translateX(-25px) scaleX(1); }
          49% { transform: translateX(25px) scaleX(1); }
          50% { transform: translateX(25px) scaleX(-1); }
          99% { transform: translateX(-25px) scaleX(-1); }
          100% { transform: translateX(-25px) scaleX(1); }
        }

        /* Faster leg movements */
        @keyframes stepLeft { 
          0%, 100% { transform: rotate(-10deg); } 
          50% { transform: rotate(10deg); } 
        }
        @keyframes stepRight { 
          0%, 100% { transform: rotate(10deg); } 
          50% { transform: rotate(-10deg); } 
        }
        
        /* Faster knee bends */
        @keyframes bendKneeLeft { 
          0%, 100% { transform: rotate(15deg); } 
          50% { transform: rotate(-5deg); } 
        }
        @keyframes bendKneeRight { 
          0%, 100% { transform: rotate(-5deg); } 
          50% { transform: rotate(15deg); } 
        }
        
        /* Faster arm swings */
        @keyframes swingArmLeft { 
          0%, 100% { transform: rotate(10deg); } 
          50% { transform: rotate(-10deg); } 
        }
        @keyframes swingArmRight { 
          0%, 100% { transform: rotate(-10deg); } 
          50% { transform: rotate(10deg); } 
        }
        
        /* Faster forearm movement */
        @keyframes swayForearmLeft { 
          0%, 100% { transform: rotate(-8deg); } 
          50% { transform: rotate(-18deg); } 
        }
        @keyframes swayForearmRight { 
          0%, 100% { transform: rotate(-18deg); } 
          50% { transform: rotate(-8deg); } 
        }

        /* Faster box carrying */
        @keyframes carryBox {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
};

export default StickFigureAnimation;
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  delay: number;
}

interface PartyPopper {
  id: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  x: number;
  y: number;
  delay: number;
}

interface CelebrationEffectProps {
  isActive: boolean;
  type: 'welcome' | 'schema';
  onComplete?: () => void;
}

const CelebrationEffect: React.FC<CelebrationEffectProps> = ({ isActive, type, onComplete }) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [partyPoppers, setPartyPoppers] = useState<PartyPopper[]>([]);

  const confettiColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#FD79A8',
    '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8'
  ];

  const celebrationEmojis = ['🎉', '🎊', '✨', '🌟', '🎈'];
  const partyPopperEmojis = ['🎉', '🎊', '💥', '✨', '🎁', '🎈', '🌟'];

  useEffect(() => {
    if (isActive) {
      if (type === 'welcome') {
        // Generate party poppers from 4 sides
        const newPartyPoppers: PartyPopper[] = [];
        
        // Top side
        for (let i = 0; i < 8; i++) {
          newPartyPoppers.push({
            id: i,
            side: 'top',
            x: (i + 1) * 12.5, // Distribute across top
            y: 0,
            delay: Math.random() * 0.5,
          });
        }
        
        // Right side
        for (let i = 0; i < 6; i++) {
          newPartyPoppers.push({
            id: i + 8,
            side: 'right',
            x: 100,
            y: (i + 1) * 16.67, // Distribute across right
            delay: Math.random() * 0.5,
          });
        }
        
        // Bottom side
        for (let i = 0; i < 8; i++) {
          newPartyPoppers.push({
            id: i + 14,
            side: 'bottom',
            x: (i + 1) * 12.5, // Distribute across bottom
            y: 100,
            delay: Math.random() * 0.5,
          });
        }
        
        // Left side
        for (let i = 0; i < 6; i++) {
          newPartyPoppers.push({
            id: i + 22,
            side: 'left',
            x: 0,
            y: (i + 1) * 16.67, // Distribute across left
            delay: Math.random() * 0.5,
          });
        }

        setPartyPoppers(newPartyPoppers);

        // Generate confetti for welcome
        const newConfetti: ConfettiPiece[] = Array.from({ length: 150 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          delay: Math.random() * 1,
          rotation: Math.random() * 360,
          size: Math.random() * 6 + 4,
        }));

        setConfetti(newConfetti);

        // Clear after 6 seconds
        const timeout = setTimeout(() => {
          setPartyPoppers([]);
          setConfetti([]);
          onComplete?.();
        }, 6000);

        return () => clearTimeout(timeout);

      } else if (type === 'schema') {
        // Generate sparkle effect for schema generation
        const newConfetti: ConfettiPiece[] = Array.from({ length: 100 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: '#FFD700', // Gold sparkles
          delay: Math.random() * 1.5,
          rotation: Math.random() * 360,
          size: Math.random() * 4 + 2,
        }));

        const newEmojis: FloatingEmoji[] = Array.from({ length: 3 }, (_, i) => ({
          id: i,
          emoji: ['✨', '⭐', '🌟'][Math.floor(Math.random() * 3)],
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          delay: Math.random() * 0.5,
        }));

        setConfetti(newConfetti);
        setFloatingEmojis(newEmojis);

        // Clear after 4 seconds
        const timeout = setTimeout(() => {
          setConfetti([]);
          setFloatingEmojis([]);
          onComplete?.();
        }, 4000);

        return () => clearTimeout(timeout);
      }
    }
  }, [isActive, type, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Background blur for welcome */}
      {type === 'welcome' && (
        <motion.div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Party Poppers for welcome */}
      <AnimatePresence>
        {type === 'welcome' && partyPoppers.map((popper) => (
          <motion.div
            key={popper.id}
            className="absolute text-4xl select-none"
            style={{
              left: `${popper.x}%`,
              top: `${popper.y}%`,
              ...(popper.side === 'top' && { top: '0%' }),
              ...(popper.side === 'right' && { right: '0%', left: 'auto' }),
              ...(popper.side === 'bottom' && { bottom: '0%', top: 'auto' }),
              ...(popper.side === 'left' && { left: '0%' }),
            }}
            initial={{
              scale: 0,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              scale: [0, 1.5, 1.2, 1],
              opacity: [0, 1, 1, 0],
              rotate: [0, 180, 360],
              ...(popper.side === 'top' && { y: [0, 50, 100] }),
              ...(popper.side === 'right' && { x: [0, -50, -100] }),
              ...(popper.side === 'bottom' && { y: [0, -50, -100] }),
              ...(popper.side === 'left' && { x: [0, 50, 100] }),
            }}
            transition={{
              duration: 3,
              delay: popper.delay,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeInOut',
            }}
            exit={{ scale: 0, opacity: 0 }}
          >
            {partyPopperEmojis[Math.floor(Math.random() * partyPopperEmojis.length)]}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Confetti */}
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute"
            style={{
              backgroundColor: piece.color,
              left: `${piece.x}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              borderRadius: type === 'schema' ? '50%' : '2px', // Circles for sparkles, squares for confetti
            }}
            initial={{
              y: -20,
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{
              y: type === 'welcome' ? '110vh' : [0, -30, '110vh'],
              rotate: piece.rotation + (type === 'schema' ? 720 : 360),
              opacity: type === 'schema' ? [1, 1, 0] : 0,
              scale: type === 'schema' ? [1, 1.5, 0] : 1,
            }}
            transition={{
              duration: type === 'welcome' ? 3 + Math.random() * 2 : 2 + Math.random(),
              delay: piece.delay,
              ease: type === 'schema' ? 'easeOut' : 'easeIn',
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Floating Emojis for schema generation */}
      <AnimatePresence>
        {type === 'schema' && floatingEmojis.map((emoji) => (
          <motion.div
            key={emoji.id}
            className="absolute text-4xl select-none"
            style={{
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
            }}
            initial={{
              scale: 0,
              opacity: 0,
              y: 50,
            }}
            animate={{
              scale: [0, 1.3, 1],
              opacity: [0, 1, 1, 0],
              y: [50, -20, 0, -10, 0],
              rotate: [0, 10, -10, 5, 0],
            }}
            transition={{
              duration: 4,
              delay: emoji.delay,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeInOut',
            }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <motion.span
              animate={{
                y: [-5, 5, -5],
                rotate: [-5, 5, -5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {emoji.emoji}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CelebrationEffect;

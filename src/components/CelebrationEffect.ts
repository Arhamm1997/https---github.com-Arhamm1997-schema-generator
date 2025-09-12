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

interface CelebrationEffectProps {
  isActive: boolean;
  onComplete?: () => void;
}

const CelebrationEffect: React.FC<CelebrationEffectProps> = ({ isActive, onComplete }) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const confettiColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#FD79A8',
    '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8'
  ];

  const celebrationEmojis = ['🎉', '🎊', '✨', '🌟', '🎈'];

  useEffect(() => {
    if (isActive) {
      // Generate 200 confetti pieces
      const newConfetti: ConfettiPiece[] = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // Percentage across screen
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        delay: Math.random() * 2, // Stagger the start times
        rotation: Math.random() * 360,
        size: Math.random() * 8 + 4, // 4-12px
      }));

      // Generate 5 floating emojis
      const newEmojis: FloatingEmoji[] = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        emoji: celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)],
        x: Math.random() * 80 + 10, // 10-90% to avoid edges
        y: Math.random() * 60 + 20, // 20-80% to avoid top/bottom edges
        delay: Math.random() * 1,
      }));

      setConfetti(newConfetti);
      setFloatingEmojis(newEmojis);

      // Clear after 8 seconds
      const timeout = setTimeout(() => {
        setConfetti([]);
        setFloatingEmojis([]);
        onComplete?.();
      }, 8000);

      return () => clearTimeout(timeout);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti */}
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute w-2 h-2"
            style={{
              backgroundColor: piece.color,
              left: `${piece.x}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
            }}
            initial={{
              y: -20,
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: piece.rotation + 360,
              opacity: 0,
            }}
            transition={{
              duration: 3 + Math.random() * 2, // 3-5 seconds fall time
              delay: piece.delay,
              ease: 'easeIn',
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Floating Emojis */}
      <AnimatePresence>
        {floatingEmojis.map((emoji) => (
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
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1, 0],
              y: [50, -10, 10, -5, 0],
            }}
            transition={{
              duration: 6,
              delay: emoji.delay,
              times: [0, 0.2, 0.8, 1],
              ease: 'easeInOut',
            }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <motion.span
              animate={{
                y: [-10, 10, -10],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {emoji.emoji}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Welcome Banner */}
      <AnimatePresence>
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent text-center"
            initial={{ 
              scale: 0,
              rotateY: 180,
            }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotateY: [180, 0, 0],
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              times: [0, 0.6, 1],
              ease: 'easeOut',
            }}
          >
            <motion.h1 
              className="text-6xl md:text-8xl font-bold mb-4 tracking-wider"
              animate={{
                textShadow: [
                  '0 0 0px rgba(139, 92, 246, 0.5)',
                  '0 0 20px rgba(139, 92, 246, 0.8)',
                  '0 0 0px rgba(139, 92, 246, 0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              Welcome! 🎊
            </motion.h1>
            <motion.p 
              className="text-2xl md:text-3xl font-semibold opacity-90"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              Schema Generated Successfully!
            </motion.p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CelebrationEffect;

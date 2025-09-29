'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, Sparkles, Bot, MapPin, DollarSign, Zap } from 'lucide-react';

interface WelcomeMessageProps {
  isVisible: boolean;
  onClose: () => void;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
      >
        <div className="text-center">
          <motion.div
            className="flex justify-center mb-6"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="relative">
              <Wand2 size={48} className="text-primary" />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles size={20} className="text-accent" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h2
            className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Welcome to Schema Generator! ✨
          </motion.h2>

          <motion.p
            className="text-muted-foreground text-lg mb-6 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Generate powerful <span className="text-primary font-semibold">JSON-LD schema markup</span> with intelligent AI extraction, smart address detection, and city-based price estimation!
          </motion.p>

          <motion.div
            className="grid grid-cols-1 gap-3 mb-6 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3">
              <MapPin size={16} className="text-primary" />
              <span><strong>Smart Address Detection:</strong> Auto-extracts postal codes from any region</span>
            </div>
            <div className="flex items-center gap-3 bg-accent/5 rounded-lg p-3">
              <DollarSign size={16} className="text-accent" />
              <span><strong>City-Based Pricing:</strong> Intelligent price range estimation by location</span>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3">
              <Zap size={16} className="text-primary" />
              <span><strong>Enhanced AI:</strong> Better business data extraction and validation</span>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-2 text-accent/80 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Bot size={16} />
            <span className="text-sm">AI-Powered • Address-Smart • Price-Intelligent • SEO-Ready</span>
          </motion.div>

          <motion.button
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
            onClick={onClose}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Let's Get Started! 🚀
          </motion.button>
        </div>

        {/* Floating background elements */}
        <motion.div
          className="absolute top-4 right-4 text-primary/20"
          animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <MapPin size={24} />
        </motion.div>
        
        <motion.div
          className="absolute bottom-4 left-4 text-accent/20"
          animate={{ y: [5, -5, 5], rotate: [10, 0, 10] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <DollarSign size={20} />
        </motion.div>

        <motion.div
          className="absolute top-1/2 left-4 text-primary/10"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Zap size={18} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeMessage;

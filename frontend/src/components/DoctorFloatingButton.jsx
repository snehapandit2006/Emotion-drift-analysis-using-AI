import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Heart } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const DoctorFloatingButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -5 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent-color), #d946ef)',
        border: 'none',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 10px 25px rgba(217, 70, 239, 0.4)',
        zIndex: 1000,
      }}
      title="Chat with Doctor"
    >
      <div style={{ position: 'relative' }}>
          <MessageSquare size={28} />
          <Heart size={12} fill="white" style={{ position: 'absolute', top: -4, right: -4 }} />
      </div>
    </motion.button>
  );
};

export default DoctorFloatingButton;

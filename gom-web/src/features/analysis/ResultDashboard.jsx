import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RotateCcw, MessageCircle, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChatBox } from './ChatBox';
import { PredictionDetailView } from '../../components/ui/PredictionDetailView';

export const ResultDashboard = ({ result, preview, user, onReset }) => {
  const { t } = useTranslation();
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex justify-end gap-2"
      >
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowChat(true)}
          leftIcon={<MessageCircle size={14} />}
        >
          {t('analysis.result.askAi')}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          leftIcon={<RotateCcw size={14} />}
        >
          {t('analysis.result.newAnalysis')}
        </Button>
      </motion.div>

      {/* Prediction Detail View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PredictionDetailView 
          prediction={result} 
          imageUrl={preview}
          showUserInfo={false}
          showDebugInfo={false}
        />
      </motion.div>

      {/* Chat overlay */}
      {showChat && <ChatBox user={user} onClose={() => setShowChat(false)} />}
    </div>
  );
};

export default ResultDashboard;


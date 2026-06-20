/**
 * QuestCard - Displays a single quest item.
 * Moved from docs/ to proper src/components location.
 */
import React from 'react';

interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
}

export const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => (
  <div className={`quest-card ${quest.completed ? 'completed' : ''}`}>
    <h3>{quest.title}</h3>
    <p>{quest.description}</p>
    <span className="reward">{quest.reward} XP</span>
  </div>
);
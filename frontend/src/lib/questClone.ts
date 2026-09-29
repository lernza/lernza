/**
 * Quest cloning — issue #1518
 * Clone an existing quest into a new draft excluding enrollment, submissions, reviews and funding.
 */
export interface QuestCloneSource {
  id: string;
  title: string;
  description: string;
  milestones: Array<{ id: string; title: string; description: string; order: number }>;
  ownerId: string;
}

export interface QuestCloneResult {
  id: string;
  title: string;
  description: string;
  milestones: Array<{ id: string; title: string; description: string; order: number }>;
  status: 'draft';
  fundingBalance: 0;
}

export function cloneQuest(source: QuestCloneSource, newOwnerId: string, generateId: () => string): QuestCloneResult {
  if (source.ownerId !== newOwnerId) throw new Error('Only authorized owner can clone quest');
  const newId = generateId();
  const clonedMilestones = source.milestones
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      id: generateId(),
      title: m.title,
      description: m.description,
      order: m.order,
    }));
  return {
    id: newId,
    title: source.title,
    description: source.description,
    milestones: clonedMilestones,
    status: 'draft',
    fundingBalance: 0,
  };
}

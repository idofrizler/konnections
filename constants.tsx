
import { CategoryColor, TagColor } from './types';

export const COLOR_MAP: Record<CategoryColor, string> = {
  [CategoryColor.YELLOW]: '#f9df70',
  [CategoryColor.GREEN]: '#a0c35a',
  [CategoryColor.BLUE]: '#b0c4ef',
  [CategoryColor.PURPLE]: '#ba81c5',
  [CategoryColor.NONE]: '#efefe6'
};

export const TAG_COLOR_MAP: Record<TagColor, string> = {
  [TagColor.INDIGO]: '#6366f1',
  [TagColor.CYAN]: '#06b6d4',
  [TagColor.ORANGE]: '#f97316',
  [TagColor.PINK]: '#ec4899',
  [TagColor.NONE]: 'transparent'
};

export const TAG_LABELS: Record<TagColor, string> = {
  [TagColor.INDIGO]: 'Group A',
  [TagColor.CYAN]: 'Group B',
  [TagColor.ORANGE]: 'Group C',
  [TagColor.PINK]: 'Group D',
  [TagColor.NONE]: 'None'
};

export const COLOR_EMOJI: Record<CategoryColor, string> = {
  [CategoryColor.YELLOW]: '🟨',
  [CategoryColor.GREEN]: '🟩',
  [CategoryColor.BLUE]: '🟦',
  [CategoryColor.PURPLE]: '🟪',
  [CategoryColor.NONE]: '⬜'
};

export const INITIAL_MISTAKES = 4;

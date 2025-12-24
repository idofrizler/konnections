
import { CategoryColor, TagColor } from './types';

export const COLOR_MAP: Record<CategoryColor, string> = {
  [CategoryColor.YELLOW]: '#f9df70',
  [CategoryColor.GREEN]: '#a0c35a',
  [CategoryColor.BLUE]: '#b0c4ef',
  [CategoryColor.PURPLE]: '#ba81c5',
  [CategoryColor.NONE]: '#efefe6'
};

export const TAG_COLOR_MAP: Record<TagColor, string> = {
  [TagColor.CORAL]: '#ff7f50',
  [TagColor.TURQUOISE]: '#40e0d0',
  [TagColor.HOTPINK]: '#ff69b4',
  [TagColor.SLATE]: '#708090',
  [TagColor.NONE]: 'transparent'
};

export const TAG_LABELS: Record<TagColor, string> = {
  [TagColor.CORAL]: 'Group A',
  [TagColor.TURQUOISE]: 'Group B',
  [TagColor.HOTPINK]: 'Group C',
  [TagColor.SLATE]: 'Group D',
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
